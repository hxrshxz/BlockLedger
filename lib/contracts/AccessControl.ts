/**
 * AccessControl — the role → permission matrix that every other contract
 * consults before mutating state.
 *
 * Mirrors OpenZeppelin's `AccessControl`: roles are coarse, permissions are
 * fine-grained, and guards revert rather than returning false.
 */

import type {
  ContractCallContext,
  ContractCallResult,
  IdentityRecord,
  Permission,
  PermissionScope,
  Role,
} from "@/lib/blockchain/types";
import { ContractRevert } from "./errors";
import { settle } from "./internal";

export const ROLES: readonly Role[] = ["ADMIN", "MANAGER", "AUDITOR", "USER"];

export const ALL_PERMISSIONS: readonly Permission[] = [
  "identity:create",
  "identity:revoke",
  "identity:view",
  "asset:mint",
  "asset:transfer",
  "asset:burn",
  "asset:view",
  "role:grant",
  "role:revoke",
  "audit:view",
  "audit:export",
  "settings:manage",
];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    "identity:create",
    "identity:view",
    "asset:mint",
    "asset:transfer",
    "asset:view",
    "audit:view",
  ],
  // Read-only by design: an auditor must never be able to mint or grant.
  AUDITOR: ["identity:view", "asset:view", "audit:view", "audit:export"],
  USER: ["asset:view", "identity:view"],
};

export const ROLE_DESCRIPTIONS: Readonly<Record<Role, string>> = {
  ADMIN:
    "Full platform authority. Registers and revokes identities, manages roles, mints, transfers and burns assets, and administers settings.",
  MANAGER:
    "Operational authority. Onboards identities and mints or transfers digital assets, but cannot revoke identities or change roles.",
  AUDITOR:
    "Read-only oversight. Inspects identities, assets and the full audit trail, and exports it for compliance. Cannot mutate any state.",
  USER:
    "Asset holder. Views only their own identity record and the assets they own.",
};

/**
 * Permissions a role may only exercise over its own records.
 * Everything else in `ROLE_PERMISSIONS` is `"all"` scope.
 */
const OWN_SCOPE_ONLY: Readonly<Record<Role, readonly Permission[]>> = {
  ADMIN: [],
  MANAGER: [],
  AUDITOR: [],
  USER: ["asset:view", "identity:view"],
};

export function hasRole(role: Role, required: Role): boolean {
  return role === required;
}

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

/** `"own"` when the role may only act on its own records, else `"all"`. */
export function permissionScope(
  role: Role,
  perm: Permission
): PermissionScope | null {
  if (!hasPermission(role, perm)) return null;
  return OWN_SCOPE_ONLY[role].includes(perm) ? "own" : "all";
}

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function requireRole(
  caller: { address: string; role: Role },
  required: Role
): void {
  if (caller.role !== required) {
    throw ContractRevert.missingRole(caller.address, required);
  }
}

export function requirePermission(
  caller: { address: string; role: Role },
  perm: Permission
): void {
  if (!hasPermission(caller.role, perm)) {
    throw ContractRevert.missingPermission(caller.address, perm, caller.role);
  }
}

/**
 * Like `requirePermission`, but additionally enforces `own` scope: a USER may
 * read their own records, not everybody else's.
 */
export function requirePermissionOn(
  caller: { address: string; role: Role; did: string },
  perm: Permission,
  subjectDid: string
): void {
  requirePermission(caller, perm);
  if (permissionScope(caller.role, perm) === "own" && subjectDid !== caller.did) {
    throw ContractRevert.outOfScope(caller.address, perm);
  }
}

/** Non-throwing convenience for rendering UI affordances. */
export function canAccess(
  role: Role,
  perm: Permission,
  opts?: { subjectDid?: string; callerDid?: string }
): boolean {
  const scope = permissionScope(role, perm);
  if (!scope) return false;
  if (scope === "all") return true;
  if (!opts?.subjectDid) return true;
  return opts.subjectDid === opts.callerDid;
}

// ---------------------------------------------------------------------------
// Role administration
// ---------------------------------------------------------------------------

export async function grantRole(
  ctx: ContractCallContext,
  identities: readonly IdentityRecord[],
  targetDid: string,
  newRole: Role
): Promise<ContractCallResult<IdentityRecord>> {
  requirePermission(ctx.caller, "role:grant");

  const current = identities.find((i) => i.did === targetDid);
  if (!current) throw ContractRevert.didNotRegistered(targetDid);
  if (current.status === "revoked") {
    throw ContractRevert.identityRevoked(targetDid);
  }

  const now = ctx.now ?? Date.now;
  const updated: IdentityRecord = {
    ...current,
    role: newRole,
    updatedAt: now(),
  };

  const { auditEntry, receipt } = await settle(ctx, {
    action: "ROLE_GRANTED",
    category: "access",
    target: targetDid,
    details: {
      previousRole: current.role,
      newRole,
      subject: current.displayName,
    },
  });

  return { result: updated, auditEntry, receipt };
}

/** Revoking a role demotes the identity to `USER`. */
export async function revokeRole(
  ctx: ContractCallContext,
  identities: readonly IdentityRecord[],
  targetDid: string
): Promise<ContractCallResult<IdentityRecord>> {
  requirePermission(ctx.caller, "role:revoke");

  const current = identities.find((i) => i.did === targetDid);
  if (!current) throw ContractRevert.didNotRegistered(targetDid);
  if (current.did === ctx.caller.did && current.role === "ADMIN") {
    throw ContractRevert.cannotSelfRevoke(ctx.caller.address);
  }

  const now = ctx.now ?? Date.now;
  const updated: IdentityRecord = {
    ...current,
    role: "USER",
    updatedAt: now(),
  };

  const { auditEntry, receipt } = await settle(ctx, {
    action: "ROLE_REVOKED",
    category: "access",
    target: targetDid,
    details: {
      previousRole: current.role,
      newRole: "USER",
      subject: current.displayName,
    },
  });

  return { result: updated, auditEntry, receipt };
}
