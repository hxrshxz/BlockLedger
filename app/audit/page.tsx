"use client";

import * as React from "react";
import {
  ArrowRight,
  Download,
  Loader2,
  ScrollText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { useLedger } from "@/contexts/LedgerContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import {
  AnchorBadge,
  CategoryBadge,
  CidLink,
  CopyButton,
  DangerPanel,
  EmptyState,
  LoadingState,
  TxLink,
  formatTimestamp,
  shortDid,
  shortHash,
} from "@/components/blockledger/primitives";
import { reportRevert } from "@/components/blockledger/report-revert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditEntry, ChainVerification } from "@/lib/blockchain/types";

function VerifyPanel() {
  const { auditChain, verifyAudit } = useLedger();
  const [result, setResult] = React.useState<ChainVerification | null>(null);
  const [checking, setChecking] = React.useState(false);

  const run = async () => {
    setChecking(true);
    try {
      const r = await verifyAudit();
      setResult(r);
      if (r.valid) {
        toast.success(`Chain verified — ${auditChain.length} entries intact`);
      } else {
        toast.error("Chain integrity check FAILED", {
          description: r.reason,
          duration: 10000,
        });
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-muted">
            <ShieldCheck className="size-4 text-muted-foreground" />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Chain integrity</p>
            <p className="text-xs text-muted-foreground">
              Recomputes every entry hash and re-links it against its
              predecessor.
            </p>
          </div>
        </div>
        <Button onClick={() => void run()} disabled={checking}>
          {checking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          Verify chain integrity
        </Button>

        {result ? (
          <div className="w-full">
            {result.valid ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                <p className="font-medium text-emerald-300">
                  PASS — {auditChain.length} entries verified
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  head{" "}
                  {auditChain.length
                    ? auditChain[auditChain.length - 1].hash
                    : "—"}
                </p>
              </div>
            ) : (
              <DangerPanel title="FAIL — the audit chain has been tampered with">
                <p>
                  Broken at entry{" "}
                  <span className="font-mono">#{result.brokenAt ?? "?"}</span>
                </p>
                <p className="mt-1 font-mono text-xs">{result.reason}</p>
              </DangerPanel>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExportButton() {
  const { exportAudit } = useLedger();
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const json = await exportAudit();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blockledger-audit-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Audit trail exported", {
        description: "The export itself was recorded as an AUDIT_EXPORTED entry.",
      });
    } catch (err) {
      reportRevert(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={() => void run()} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Export JSON
    </Button>
  );
}

function EntryRow({ entry }: { entry: AuditEntry }) {
  const details = Object.entries(entry.details).filter(
    ([, v]) => v !== null && v !== ""
  );

  return (
    <li className="border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs">
          #{entry.index}
        </span>
        <span className="font-mono text-sm font-medium">{entry.action}</span>
        <CategoryBadge category={entry.category} />
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {formatTimestamp(entry.timestamp)}
        </span>
        <AnchorBadge
          anchorMode={entry.anchorMode}
          txSignature={entry.txSignature}
        />
      </div>

      <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
        <p className="text-muted-foreground">
          <span className="tracking-wide uppercase">Actor</span>{" "}
          <span className="font-mono text-foreground">
            {shortDid(entry.actorDid)}
          </span>
        </p>
        <p className="text-muted-foreground">
          <span className="tracking-wide uppercase">Target</span>{" "}
          <span className="font-mono break-all text-foreground">
            {entry.target.startsWith("did:")
              ? shortDid(entry.target)
              : entry.target}
          </span>
        </p>
      </div>

      {details.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {details.map(([k, v]) => (
            <span
              key={k}
              className="rounded-md border bg-muted/30 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {k}: <span className="text-foreground">{String(v)}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-2.5 py-1.5 font-mono text-[11px]">
        <span className="text-muted-foreground">prev</span>
        <span>{shortHash(entry.prevHash)}</span>
        <CopyButton value={entry.prevHash} label="prevHash copied" />
        <ArrowRight className="size-3 text-muted-foreground" />
        <span className="text-muted-foreground">hash</span>
        <span className="text-emerald-300">{shortHash(entry.hash)}</span>
        <CopyButton value={entry.hash} label="hash copied" />
      </div>

      {entry.anchorMode === "onchain" ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <TxLink signature={entry.txSignature} />
          {entry.cid ? <CidLink cid={entry.cid} /> : null}
        </div>
      ) : null}
    </li>
  );
}

function AuditContent() {
  const { can } = useAuth();
  const { auditChain, isHydrated } = useLedger();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [action, setAction] = React.useState("all");
  const [actor, setActor] = React.useState("all");

  const actions = React.useMemo(
    () => Array.from(new Set(auditChain.map((e) => e.action))).sort(),
    [auditChain]
  );
  const actors = React.useMemo(
    () => Array.from(new Set(auditChain.map((e) => e.actorDid))).sort(),
    [auditChain]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...auditChain]
      .reverse()
      .filter((e) => category === "all" || e.category === category)
      .filter((e) => action === "all" || e.action === action)
      .filter((e) => actor === "all" || e.actorDid === actor)
      .filter(
        (e) =>
          !q ||
          e.action.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.actorDid.toLowerCase().includes(q) ||
          e.hash.toLowerCase().includes(q) ||
          JSON.stringify(e.details).toLowerCase().includes(q)
      );
  }, [auditChain, query, category, action, actor]);

  return (
    <AppShell>
      <PageHeading
        icon={ScrollText}
        title="Immutable audit trail"
        description="Every state transition is appended as a SHA-256 hash-linked entry. Editing any historical record breaks the chain and is detected by verification."
        actions={can("audit:export") ? <ExportButton /> : null}
      />

      <VerifyPanel />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search action, target, actor, hash or details…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="identity">Identity</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="access">Access</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actor} onValueChange={setActor}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a} value={a}>
                {shortDid(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isHydrated ? (
        <LoadingState label="Loading audit trail…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={
            auditChain.length === 0
              ? "The audit trail is empty"
              : "No entries match your filters"
          }
          description={
            auditChain.length === 0
              ? "The genesis entry is written when the ledger is first seeded."
              : "Try clearing the search or filters."
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {auditChain.length} entries · newest
            first
          </p>
          <ul className="overflow-hidden rounded-xl border bg-card">
            {filtered.map((entry) => (
              <EntryRow key={entry.index} entry={entry} />
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}

export default function AuditPage() {
  return (
    <ProtectedRoute requiredPermission="audit:view">
      <AuditContent />
    </ProtectedRoute>
  );
}
