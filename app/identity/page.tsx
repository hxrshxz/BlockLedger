"use client";

import * as React from "react";
import {
  Ban,
  Fingerprint,
  Loader2,
  Plus,
  Search,
  ShieldOff,
  UserRoundX,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { useLedger } from "@/contexts/LedgerContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import {
  AnchorBadge,
  CidLink,
  EmptyState,
  FieldRow,
  IdentityStatusBadge,
  JsonBlock,
  LoadingState,
  MonoValue,
  RoleBadge,
  TxLink,
  formatDate,
  formatTimestamp,
  shortDid,
} from "@/components/blockledger/primitives";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/blockledger/modal";
import { reportRevert } from "@/components/blockledger/report-revert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildDidDocument } from "@/lib/blockchain/did";
import { ROLES, ROLE_DESCRIPTIONS } from "@/lib/contracts/AccessControl";
import type { IdentityRecord, Role } from "@/lib/blockchain/types";

// ---------------------------------------------------------------------------
// Register dialog
// ---------------------------------------------------------------------------

function RegisterIdentityDialog() {
  const { createIdentity } = useLedger();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [address, setAddress] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [organization, setOrganization] = React.useState("");
  const [role, setRole] = React.useState<Role>("USER");

  const reset = () => {
    setAddress("");
    setDisplayName("");
    setOrganization("");
    setRole("USER");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { result, receipt } = await createIdentity({
        address: address.trim(),
        displayName: displayName.trim(),
        organization: organization.trim(),
        role,
      });
      toast.success("Identity registered", {
        description:
          receipt.anchorMode === "onchain"
            ? `${result.did} anchored on ${receipt.cluster}`
            : `${result.did} recorded locally (no wallet connected)`,
      });
      reset();
      setOpen(false);
    } catch (err) {
      reportRevert(err, "Identity registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Register identity
      </Button>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Register a decentralized identity</ModalTitle>
          <ModalDescription>
            Mints a <span className="font-mono">did:blkl:sol</span> DID from a
            Solana address, pins the W3C DID document to IPFS and anchors the
            registration.
          </ModalDescription>
        </ModalHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="address">Solana address</Label>
            <Input
              id="address"
              required
              spellCheck={false}
              className="font-mono text-xs"
              placeholder="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The DID becomes{" "}
              <span className="font-mono">
                did:blkl:sol:{address.trim() || "<address>"}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              required
              placeholder="Dr. Ananya Rao"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              required
              placeholder="BEL Bengaluru Complex"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Initial role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="role">
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
            <p className="text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? "Submitting…" : "Register identity"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Detail sheet
// ---------------------------------------------------------------------------

function IdentityDetailSheet({
  identity,
  onOpenChange,
}: {
  identity: IdentityRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { can } = useAuth();
  const { suspendIdentity, revokeIdentity } = useLedger();
  const [busy, setBusy] = React.useState<"suspend" | "revoke" | null>(null);

  const didDocument = React.useMemo(() => {
    if (!identity) return null;
    return buildDidDocument(identity.address, {
      created: identity.createdAt,
      updated: identity.updatedAt,
      alsoKnownAs: [
        `blockledger:name:${identity.displayName}`,
        `blockledger:org:${identity.organization}`,
        `blockledger:role:${identity.role}`,
      ],
    });
  }, [identity]);

  const act = async (kind: "suspend" | "revoke") => {
    if (!identity) return;
    setBusy(kind);
    try {
      if (kind === "suspend") {
        await suspendIdentity(identity.did);
        toast.success(`Suspended ${identity.displayName}`);
      } else {
        await revokeIdentity(identity.did);
        toast.success(`Revoked ${identity.displayName}`);
      }
      onOpenChange(false);
    } catch (err) {
      reportRevert(err, "Identity lifecycle call failed");
    } finally {
      setBusy(null);
    }
  };

  const canRevoke = can("identity:revoke");

  return (
    <Sheet open={Boolean(identity)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {identity && didDocument ? (
          <>
            <SheetHeader className="pr-8">
              <SheetTitle className="flex items-center gap-2">
                {identity.displayName}
                <RoleBadge role={identity.role} />
              </SheetTitle>
              <SheetDescription>{identity.organization}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <dl className="rounded-lg border px-4">
                <FieldRow label="DID">
                  <MonoValue value={identity.did} />
                </FieldRow>
                <FieldRow label="Address">
                  <MonoValue value={identity.address} />
                </FieldRow>
                <FieldRow label="Status">
                  <IdentityStatusBadge status={identity.status} />
                </FieldRow>
                <FieldRow label="Registered">
                  {formatTimestamp(identity.createdAt)}
                </FieldRow>
                <FieldRow label="Last updated">
                  {formatTimestamp(identity.updatedAt)}
                </FieldRow>
                <FieldRow label="DID document">
                  <CidLink cid={identity.didDocumentCid} />
                </FieldRow>
                <FieldRow label="Anchoring tx">
                  <TxLink signature={identity.txSignature} />
                </FieldRow>
                <FieldRow label="Anchor mode">
                  <AnchorBadge
                    anchorMode={identity.anchorMode}
                    txSignature={identity.txSignature}
                  />
                </FieldRow>
              </dl>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  W3C DID Document
                </p>
                <JsonBlock
                  data={didDocument}
                  label={`${identity.did}.json`}
                  maxHeight="26rem"
                />
              </div>

              {canRevoke ? (
                <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
                  <div>
                    <p className="text-sm font-medium">Lifecycle controls</p>
                    <p className="text-xs text-muted-foreground">
                      Guarded by <span className="font-mono">identity:revoke</span>
                      . Revocation is permanent.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        busy !== null || identity.status !== "active"
                      }
                      onClick={() => void act("suspend")}
                    >
                      {busy === "suspend" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Ban className="size-4" />
                      )}
                      Suspend
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy !== null || identity.status === "revoked"}
                      onClick={() => void act("revoke")}
                    >
                      {busy === "revoke" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserRoundX className="size-4" />
                      )}
                      Revoke
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                  <ShieldOff className="mt-0.5 size-4 shrink-0" />
                  Your role lacks{" "}
                  <span className="font-mono">identity:revoke</span>, so
                  lifecycle controls are hidden.
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function IdentityContent() {
  const { can } = useAuth();
  const { identities, isHydrated } = useLedger();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<IdentityRecord | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return identities
      .filter((i) => statusFilter === "all" || i.status === statusFilter)
      .filter(
        (i) =>
          !q ||
          i.displayName.toLowerCase().includes(q) ||
          i.organization.toLowerCase().includes(q) ||
          i.did.toLowerCase().includes(q) ||
          i.address.toLowerCase().includes(q)
      )
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [identities, query, statusFilter]);

  return (
    <AppShell>
      <PageHeading
        icon={Fingerprint}
        title="Identity registry"
        description="Every participant is a did:blkl:sol decentralized identifier whose DID document is pinned to IPFS and whose registration is hash-linked into the audit trail."
        actions={can("identity:create") ? <RegisterIdentityDialog /> : null}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, organization, DID or address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isHydrated ? (
        <LoadingState label="Loading identity registry…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Fingerprint}
          title={
            identities.length === 0
              ? "No identities registered"
              : "No identities match your filters"
          }
          description={
            identities.length === 0
              ? "Register the first identity to bootstrap the registry."
              : "Try clearing the search or status filter."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Identity</TableHead>
                <TableHead className="hidden md:table-cell">DID</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Organization
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="text-right">Anchor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((identity) => (
                <TableRow
                  key={identity.did}
                  tabIndex={0}
                  role="button"
                  className="cursor-pointer"
                  onClick={() => setSelected(identity)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(identity);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    {identity.displayName}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {shortDid(identity.did)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {identity.organization}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={identity.role} />
                  </TableCell>
                  <TableCell>
                    <IdentityStatusBadge status={identity.status} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                    {formatDate(identity.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AnchorBadge
                      anchorMode={identity.anchorMode}
                      txSignature={identity.txSignature}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <IdentityDetailSheet
        identity={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </AppShell>
  );
}

export default function IdentityPage() {
  return (
    <ProtectedRoute requiredPermission="identity:view">
      <IdentityContent />
    </ProtectedRoute>
  );
}
