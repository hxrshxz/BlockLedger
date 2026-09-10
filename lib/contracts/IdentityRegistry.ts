/**
 * IdentityRegistry — registration and lifecycle of `did:blkl:sol` identities.
 *
 * Enforces DID uniqueness, address validity and the caller's permissions,
 * exactly as an on-chain registry program would.
 */

import { buildDidDocument, didFromAddress, isAddress, isDid } from "@/lib/blockchain/did";
import type {
  Address,
  Cid,
  ContractCallContext,
  ContractCallResult,
  Did,
  DidDocument,
  IdentityRecord,
  Role,
} from "@/lib/blockchain/types";
import { requirePermission, requirePermissionOn } from "./AccessControl";
import { ContractRevert } from "./errors";
import { settle } from "./internal";

export interface RegisterIdentityInput {
  address: Address;
  displayName: string;
  organization: string;
  role: Role;
  /** CID of the pinned DID document, when IPFS is configured. */
  didDocumentCid?: Cid | null;
  alsoKnownAs?: string[];
}

export interface UpdateIdentityInput {
  displayName?: string;
  organization?: string;
  didDocumentCid?: Cid | null;
}

/** Builds the DID document that should be pinned before `registerIdentity`. */
export function draftDidDocument(
  input: Pick<RegisterIdentityInput, "address" | "displayName" | "organization" | "alsoKnownAs">,
  created = Date.now()
): DidDocument {
  return buildDidDocument(input.address, {
    created,
    alsoKnownAs: [
      ...(input.alsoKnownAs ?? []),
      `blockledger:name:${input.displayName}`,
      `blockledger:org:${input.organization}`,
    ],
  });
}

export function resolveDid(
  identities: readonly IdentityRecord[],
  did: string
): IdentityRecord | null {
  return identities.find((i) => i.did === did) ?? null;
}

export function requireIdentity(
  identities: readonly IdentityRecord[],
  did: string
): IdentityRecord {
  const found = resolveDid(identities, did);
  if (!found) throw ContractRevert.didNotRegistered(did);
  return found;
}

export function requireActiveIdentity(
  identities: readonly IdentityRecord[],
  did: string
): IdentityRecord {
  const found = requireIdentity(identities, did);
  if (found.status !== "active") throw ContractRevert.identityNotActive(did);
  return found;
}

export function isRegistered(
  identities: readonly IdentityRecord[],
  did: string
): boolean {
  return identities.some((i) => i.did === did);
}

/** Permission-checked read, honouring USER `own`-scope. */
export function viewIdentity(
  ctx: Pick<ContractCallContext, "caller">,
  identities: readonly IdentityRecord[],
  did: string
): IdentityRecord {
  requirePermissionOn(ctx.caller, "identity:view", did);
  return requireIdentity(identities, did);
}

export async function registerIdentity(
  ctx: ContractCallContext,
  identities: readonly IdentityRecord[],
  input: RegisterIdentityInput
): Promise<ContractCallResult<IdentityRecord>> {
  requirePermission(ctx.caller, "identity:create");

  if (!isAddress(input.address)) {
    throw ContractRevert.invalidAddress(input.address);
  }

  const did: Did = didFromAddress(input.address);
  if (isRegistered(identities, did)) {
    throw ContractRevert.didAlreadyRegistered();
  }

  const now = ctx.now ?? Date.now;
  const createdAt = now();

  const { auditEntry, receipt } = await settle(ctx, {
    action: "IDENTITY_REGISTERED",
    category: "identity",
    target: did,
    details: {
      displayName: input.displayName,
      organization: input.organization,
      role: input.role,
      didDocumentCid: input.didDocumentCid ?? null,
    },
    cid: input.didDocumentCid ?? null,
  });

  const record: IdentityRecord = {
    did,
    address: input.address,
    displayName: input.displayName,
    organization: input.organization,
    role: input.role,
    status: "active",
    didDocumentCid: input.didDocumentCid ?? null,
    createdAt,
    updatedAt: createdAt,
    txSignature: receipt.signature,
    anchorMode: receipt.anchorMode,
  };

  return { result: record, auditEntry, receipt };
}

export async function updateIdentity(
  ctx: ContractCallContext,
  identities: readonly IdentityRecord[],
  did: string,
  patch: UpdateIdentityInput
): Promise<ContractCallResult<IdentityRecord>> {
  requirePermission(ctx.caller, "identity:create");
  const current = requireIdentity(identities, did);
  if (current.status === "revoked") throw ContractRevert.identityRevoked(did);

  const now = ctx.now ?? Date.now;
  const updated: IdentityRecord = {
    ...current,
    displayName: patch.displayName ?? current.displayName,
    organization: patch.organization ?? current.organization,
    didDocumentCid:
      patch.didDocumentCid !== undefined
        ? patch.didDocumentCid
        : current.didDocumentCid,
    updatedAt: now(),
  };

  const { auditEntry, receipt } = await settle(ctx, {
    action: "IDENTITY_UPDATED",
    category: "identity",
    target: did,
    details: {
      displayName: updated.displayName,
      organization: updated.organization,
    },
    cid: updated.didDocumentCid,
  });

  return { result: updated, auditEntry, receipt };
}

export async function suspendIdentity(
  ctx: ContractCallContext,
  identities: readonly IdentityRecord[],
  did: string,
  reason: string
): Promise<ContractCallResult<IdentityRecord>> {
  requirePermission(ctx.caller, "identity:revoke");
  const current = requireIdentity(identities, did);
  if (current.status === "revoked") throw ContractRevert.identityRevoked(did);

  const now = ctx.now ?? Date.now;
  const updated: IdentityRecord = {
    ...current,
    status: "suspended",
    updatedAt: now(),
  };

  const { auditEntry, receipt } = await settle(ctx, {
    action: "IDENTITY_SUSPENDED",
    category: "identity",
    target: did,
    details: { reason, subject: current.displayName },
  });

  return { result: updated, auditEntry, receipt };
}

export async function revokeIdentity(
  ctx: ContractCallContext,
  identities: readonly IdentityRecord[],
  did: string,
  reason: string
): Promise<ContractCallResult<IdentityRecord>> {
  requirePermission(ctx.caller, "identity:revoke");
  const current = requireIdentity(identities, did);
  if (current.status === "revoked") throw ContractRevert.identityRevoked(did);

  const now = ctx.now ?? Date.now;
  const updated: IdentityRecord = {
    ...current,
    status: "revoked",
    updatedAt: now(),
  };

  const { auditEntry, receipt } = await settle(ctx, {
    action: "IDENTITY_REVOKED",
    category: "identity",
    target: did,
    details: { reason, subject: current.displayName },
  });

  return { result: updated, auditEntry, receipt };
}

export { isDid };
