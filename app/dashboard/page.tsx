"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Fingerprint,
  Gem,
  LayoutDashboard,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { useLedger } from "@/contexts/LedgerContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import { NetworkStatusStrip } from "@/components/blockledger/network-strip";
import {
  AnchorBadge,
  CategoryBadge,
  DangerPanel,
  EmptyState,
  LoadingState,
  StatCard,
  formatTimestamp,
  shortDid,
  shortHash,
} from "@/components/blockledger/primitives";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChainVerification } from "@/lib/blockchain/types";

function IntegrityBanner() {
  const { auditChain, isHydrated, verifyAudit } = useLedger();
  const [result, setResult] = React.useState<ChainVerification | null>(null);
  const [checking, setChecking] = React.useState(false);

  const run = React.useCallback(async () => {
    setChecking(true);
    try {
      setResult(await verifyAudit());
    } finally {
      setChecking(false);
    }
  }, [verifyAudit]);

  // Re-verify whenever the chain grows, so the banner is never stale.
  React.useEffect(() => {
    if (!isHydrated) return;
    void run();
  }, [isHydrated, auditChain.length, run]);

  const head = auditChain.length ? auditChain[auditChain.length - 1].hash : null;

  if (!isHydrated || !result) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <RefreshCw className="size-4 animate-spin" />
        Verifying audit chain…
      </div>
    );
  }

  if (!result.valid) {
    return (
      <DangerPanel title="Audit chain integrity FAILED — tampering detected">
        <p>
          Verification broke at entry{" "}
          <span className="font-mono">#{result.brokenAt ?? "?"}</span>.
        </p>
        <p className="mt-1 font-mono text-xs">{result.reason}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => void run()}
        >
          Re-verify
        </Button>
      </DangerPanel>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <ShieldCheck className="size-4" />
        </span>
        <div className="text-sm">
          <p className="font-medium text-emerald-300">
            Chain verified — {auditChain.length} entries
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            head {head ? shortHash(head) : "—"}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void run()}
        disabled={checking}
      >
        <RefreshCw className={checking ? "size-3.5 animate-spin" : "size-3.5"} />
        Re-verify
      </Button>
    </div>
  );
}

function QuickActions() {
  const { can } = useAuth();

  const actions = [
    {
      href: "/identity",
      label: "Register identity",
      permission: "identity:create" as const,
      icon: Fingerprint,
    },
    {
      href: "/assets",
      label: "Mint asset",
      permission: "asset:mint" as const,
      icon: Gem,
    },
    {
      href: "/access-control",
      label: "Manage roles",
      permission: "role:grant" as const,
      icon: ShieldCheck,
    },
    {
      href: "/audit",
      label: "Export audit trail",
      permission: "audit:export" as const,
      icon: ScrollText,
    },
  ];

  const allowed = actions.filter((a) => can(a.permission));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick actions</CardTitle>
        <CardDescription>
          Only actions your role is authorised for are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {allowed.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Your role has read-only access. No mutating actions are available to
            you.
          </p>
        ) : (
          allowed.map((a) => (
            <Button
              key={a.label}
              asChild
              variant="outline"
              className="w-full justify-start"
            >
              <Link href={a.href}>
                <a.icon className="size-4" />
                {a.label}
              </Link>
            </Button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivity() {
  const { auditChain, isHydrated } = useLedger();

  const recent = React.useMemo(
    () => [...auditChain].slice(-8).reverse(),
    [auditChain]
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Recent audit activity</CardTitle>
          <CardDescription>Last 8 entries, newest first</CardDescription>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href="/audit">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!isHydrated ? (
          <LoadingState label="Loading audit trail…" />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Every state transition will appear here as a hash-linked entry."
          />
        ) : (
          <ul className="divide-y">
            {recent.map((entry) => (
              <li
                key={entry.index}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0"
              >
                <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">
                  #{entry.index}
                </span>
                <span className="font-mono text-xs font-medium">
                  {entry.action}
                </span>
                <CategoryBadge category={entry.category} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                  {entry.target.startsWith("did:")
                    ? shortDid(entry.target)
                    : entry.target}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <AnchorBadge
                  anchorMode={entry.anchorMode}
                  txSignature={entry.txSignature}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { user, can } = useAuth();
  const { stats, isHydrated } = useLedger();

  const activeRoles = React.useMemo(() => {
    const byRole = stats.identitiesByRole;
    return (Object.keys(byRole) as Array<keyof typeof byRole>).filter(
      (r) => byRole[r] > 0
    ).length;
  }, [stats.identitiesByRole]);

  const canSeeAudit = can("audit:view");

  return (
    <AppShell>
      <PageHeading
        icon={LayoutDashboard}
        title={`Welcome, ${user?.name ?? "operator"}`}
        description={`Signed in as ${user?.role ?? "—"}${
          user?.organization ? ` · ${user.organization}` : ""
        }`}
        actions={
          canSeeAudit ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/audit">
                <ScrollText className="size-4" />
                Audit trail
              </Link>
            </Button>
          ) : null
        }
      />

      {canSeeAudit ? <IntegrityBanner /> : null}

      <NetworkStatusStrip />

      {!isHydrated ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Registered identities"
            value={stats.totalIdentities}
            icon={Fingerprint}
            hint={`${stats.activeIdentities} active · ${stats.suspendedIdentities} suspended · ${stats.revokedIdentities} revoked`}
          />
          <StatCard
            label="Assets minted"
            value={stats.totalAssets}
            icon={Gem}
            hint={`${stats.activeAssets} active · ${stats.burnedAssets} burned · ${stats.totalTransfers} transfers`}
          />
          <StatCard
            label="Active roles"
            value={activeRoles}
            icon={ShieldCheck}
            hint={(Object.entries(stats.identitiesByRole) as [string, number][])
              .filter(([, n]) => n > 0)
              .map(([r, n]) => `${r} ${n}`)
              .join(" · ")}
          />
          <StatCard
            label="Audit entries"
            value={stats.auditEntries}
            icon={ScrollText}
            hint={`${stats.onchainEntries} anchored on-chain · ${
              stats.auditEntries - stats.onchainEntries
            } local`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {canSeeAudit ? <RecentActivity /> : null}
        <QuickActions />
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    // No permission gate: the dashboard is the authenticated landing page and
    // every role can see it. Individual panels gate themselves via `can()`.
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
