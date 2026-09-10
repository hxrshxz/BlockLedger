"use client";

import * as React from "react";
import { Check, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { useLedger } from "@/contexts/LedgerContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import {
  EmptyState,
  IdentityStatusBadge,
  LoadingState,
  RoleBadge,
  shortDid,
} from "@/components/blockledger/primitives";
import { reportRevert } from "@/components/blockledger/report-revert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ALL_PERMISSIONS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  permissionScope,
} from "@/lib/contracts/AccessControl";
import type { Permission, Role } from "@/lib/blockchain/types";

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

function PermissionMatrix({ activeRole }: { activeRole: Role | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Role × permission matrix</CardTitle>
        <CardDescription>
          Rendered directly from{" "}
          <span className="font-mono text-xs">ROLE_PERMISSIONS</span> in the
          AccessControl contract — the same table every mutating call is checked
          against.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-44">Permission</TableHead>
                {ROLES.map((role) => (
                  <TableHead key={role} className="text-center">
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "inline-flex cursor-help",
                              activeRole === role &&
                                "rounded-full ring-2 ring-ring ring-offset-2 ring-offset-background"
                            )}
                          >
                            <RoleBadge role={role} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {ROLE_DESCRIPTIONS[role]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALL_PERMISSIONS.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="font-mono text-xs">
                    {permission}
                  </TableCell>
                  {ROLES.map((role) => {
                    const allowed = hasPermission(role, permission);
                    const scope = permissionScope(role, permission);
                    return (
                      <TableCell
                        key={role}
                        className={cn(
                          "text-center",
                          activeRole === role && "bg-muted/50"
                        )}
                      >
                        {allowed ? (
                          <span className="inline-flex flex-col items-center gap-0.5">
                            <Check className="size-4 text-emerald-400" />
                            {scope === "own" ? (
                              <span className="text-[10px] text-muted-foreground">
                                own only
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <X className="mx-auto size-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((role) => (
            <div
              key={role}
              className={cn(
                "rounded-lg border p-3",
                activeRole === role && "border-ring bg-muted/40"
              )}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <RoleBadge role={role} />
                <span className="text-xs text-muted-foreground">
                  {ROLE_PERMISSIONS[role].length} / {ALL_PERMISSIONS.length}{" "}
                  permissions
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// "Try it" persona switcher
// ---------------------------------------------------------------------------

const PROBE_ACTIONS: Array<{ label: string; permission: Permission }> = [
  { label: "Register identity", permission: "identity:create" },
  { label: "Revoke identity", permission: "identity:revoke" },
  { label: "Mint asset", permission: "asset:mint" },
  { label: "Transfer asset", permission: "asset:transfer" },
  { label: "Burn asset", permission: "asset:burn" },
  { label: "Grant role", permission: "role:grant" },
  { label: "Export audit trail", permission: "audit:export" },
  { label: "Manage settings", permission: "settings:manage" },
];

function TryItPanel() {
  const { user, can, switchRole } = useAuth();
  const { grantRole } = useLedger();

  if (!user) return null;

  /**
   * Deliberately calls the real contract with the caller's real role, so a
   * forbidden attempt produces the genuine revert string rather than a mock.
   */
  const probeGrant = async () => {
    try {
      await grantRole(user.did, user.role);
      toast.success("AccessControl allowed the call", {
        description: `role:grant succeeded for ${user.role}_ROLE — a ROLE_GRANTED entry was appended to the audit trail.`,
      });
    } catch (err) {
      reportRevert(err, "Call rejected");
    }
  };

  return (
    <Card className="border-sky-500/25">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
            <Sparkles className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">Try it — switch persona</CardTitle>
            <CardDescription>
              Change the active role and watch the platform re-authorise in
              place.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <Button
              key={role}
              size="sm"
              variant={user.role === role ? "default" : "outline"}
              onClick={() => {
                switchRole(role);
                toast.info(`Now acting as ${role}`, {
                  description: ROLE_DESCRIPTIONS[role],
                });
              }}
            >
              {role}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Live authorisation for {user.role}_ROLE
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROBE_ACTIONS.map((action) => {
              const allowed = can(action.permission);
              return (
                <div
                  key={action.permission}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
                    allowed
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : "border-border bg-muted/20 opacity-60"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{action.label}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {action.permission}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={!allowed}>
                    {allowed ? "Enabled" : "Blocked"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">Fire a real contract call</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Invokes{" "}
            <span className="font-mono">AccessControl.grantRole</span> against
            your own DID. If your role lacks{" "}
            <span className="font-mono">role:grant</span>, the raw revert string
            is shown.
          </p>
          <Button size="sm" variant="secondary" onClick={() => void probeGrant()}>
            <ShieldCheck className="size-4" />
            Attempt role:grant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Role assignment
// ---------------------------------------------------------------------------

function RoleAssignment() {
  const { can } = useAuth();
  const { identities, isHydrated, grantRole, revokeRole } = useLedger();
  const [pending, setPending] = React.useState<string | null>(null);

  const canGrant = can("role:grant");
  const canRevoke = can("role:revoke");

  const change = async (did: string, role: Role) => {
    setPending(did);
    try {
      await grantRole(did, role);
      toast.success(`Granted ${role}_ROLE`, { description: shortDid(did) });
    } catch (err) {
      reportRevert(err, "Role grant failed");
    } finally {
      setPending(null);
    }
  };

  const demote = async (did: string) => {
    setPending(did);
    try {
      await revokeRole(did);
      toast.success("Role revoked — demoted to USER", {
        description: shortDid(did),
      });
    } catch (err) {
      reportRevert(err, "Role revoke failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Role assignment</CardTitle>
        <CardDescription>
          {canGrant
            ? "Inline role changes call AccessControl.grantRole and append an audit entry."
            : "Read-only: your role lacks role:grant, so the controls are disabled."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isHydrated ? (
          <LoadingState label="Loading identities…" />
        ) : identities.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No identities to administer"
            description="Register identities first, then assign roles here."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Identity</TableHead>
                  <TableHead className="hidden md:table-cell">DID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current role</TableHead>
                  <TableHead className="text-right">Change role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {identities.map((identity) => (
                  <TableRow key={identity.did}>
                    <TableCell>
                      <p className="font-medium">{identity.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {identity.organization}
                      </p>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      {shortDid(identity.did)}
                    </TableCell>
                    <TableCell>
                      <IdentityStatusBadge status={identity.status} />
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={identity.role} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {pending === identity.did ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : null}
                        <Select
                          value={identity.role}
                          disabled={!canGrant || pending !== null}
                          onValueChange={(v) =>
                            void change(identity.did, v as Role)
                          }
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {canRevoke ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={
                              pending !== null || identity.role === "USER"
                            }
                            onClick={() => void demote(identity.did)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AccessControlContent() {
  const { user } = useAuth();

  return (
    <AppShell>
      <PageHeading
        icon={ShieldCheck}
        title="Access control"
        description="Roles and permissions are enforced by the AccessControl contract before any state mutation. Forbidden calls revert; they are never silently ignored."
      />
      <TryItPanel />
      <PermissionMatrix activeRole={user?.role ?? null} />
      <RoleAssignment />
    </AppShell>
  );
}

export default function AccessControlPage() {
  return (
    // Intentionally auth-only. The matrix is public information, and gating
    // this page on `role:grant` would trap a viewer who switched to USER in the
    // "Try it" panel with no way to switch back. Mutating controls are gated
    // individually via `can()` and, authoritatively, by the contract itself.
    <ProtectedRoute>
      <AccessControlContent />
    </ProtectedRoute>
  );
}
