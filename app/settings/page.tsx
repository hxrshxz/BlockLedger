"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Database,
  Loader2,
  Monitor,
  Moon,
  Radio,
  RotateCcw,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { useChain } from "@/contexts/ChainContext";
import { useLedger } from "@/contexts/LedgerContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import {
  FieldRow,
  MonoValue,
  RoleBadge,
} from "@/components/blockledger/primitives";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/blockledger/modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ipfsGatewayBase } from "@/lib/blockchain/explorer";
import { SEED_VERSION } from "@/lib/blockchain/seed";

function ProfileCard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Profile</CardTitle>
        </div>
        <CardDescription>
          Your DID and address are derived from the registry and cannot be
          edited here — they are the subject of every contract call.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input id="profile-name" defaultValue={user.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-org">Organization</Label>
            <Input id="profile-org" defaultValue={user.organization} />
          </div>
        </div>
        <dl className="rounded-lg border px-4">
          <FieldRow label="DID">
            <MonoValue value={user.did} />
          </FieldRow>
          <FieldRow label="Address">
            <MonoValue value={user.address} />
          </FieldRow>
          <FieldRow label="Email">{user.email}</FieldRow>
          <FieldRow label="Role">
            <RoleBadge role={user.role} />
          </FieldRow>
          <FieldRow label="Permissions">
            <span className="font-mono text-xs break-all text-muted-foreground">
              {user.permissions.join(", ")}
            </span>
          </FieldRow>
        </dl>
        <p className="text-xs text-muted-foreground">
          Profile edits are session-local in this demo build; identity records
          are mutated through the IdentityRegistry contract on the{" "}
          <span className="font-mono">/identity</span> page.
        </p>
      </CardContent>
    </Card>
  );
}

function NetworkCard() {
  const { cluster, isWalletConnected, isIpfsConfigured, walletAddress, mode } =
    useChain();

  const rpc =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    `https://api.${cluster}.solana.com`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Network</CardTitle>
        </div>
        <CardDescription>
          Read-only status, sourced from environment configuration and the live
          wallet adapter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="rounded-lg border px-4">
          <FieldRow label="Cluster">
            <span className="font-mono text-xs">solana {cluster}</span>
          </FieldRow>
          <FieldRow label="RPC endpoint">
            <span className="font-mono text-xs break-all">{rpc}</span>
          </FieldRow>
          <FieldRow label="IPFS gateway">
            <span className="font-mono text-xs break-all">
              {ipfsGatewayBase()}
            </span>
          </FieldRow>
          <FieldRow label="Pinata">
            <span
              className={cn(
                "font-mono text-xs",
                isIpfsConfigured ? "text-emerald-300" : "text-amber-300"
              )}
            >
              {isIpfsConfigured ? "configured" : "not configured"}
            </span>
          </FieldRow>
          <FieldRow label="Wallet">
            <span className="font-mono text-xs break-all">
              {isWalletConnected ? walletAddress : "not connected"}
            </span>
          </FieldRow>
          <FieldRow label="Anchor mode">
            <span
              className={cn(
                "font-mono text-xs",
                mode === "onchain" ? "text-emerald-300" : "text-amber-300"
              )}
            >
              {mode}
            </span>
          </FieldRow>
        </dl>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appearance</CardTitle>
        <CardDescription>Theme preference for this browser.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <Button
              key={o.value}
              variant={mounted && theme === o.value ? "default" : "outline"}
              className="justify-start"
              onClick={() => setTheme(o.value)}
            >
              <o.icon className="size-4" />
              {o.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DangerZone() {
  const { resetDemo, stats } = useLedger();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await resetDemo();
      toast.success("Demo data reset", {
        description: `Re-seeded from ${SEED_VERSION}. All locally recorded transitions were discarded.`,
      });
      setOpen(false);
    } catch (err) {
      toast.error("Reset failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="size-4 text-red-400" />
          <CardTitle className="text-base">Danger zone</CardTitle>
        </div>
        <CardDescription>
          Wipes the locally persisted registry, asset ledger and audit chain,
          then re-seeds the deterministic demo dataset.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Currently holding {stats.totalIdentities} identities,{" "}
          {stats.totalAssets} assets and {stats.auditEntries} audit entries.
          On-chain transactions already broadcast to Solana are{" "}
          <strong>not</strong> affected.
        </p>
        <Modal open={open} onOpenChange={setOpen}>
          <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Reset demo data?</ModalTitle>
              <ModalDescription>
                This clears every locally recorded identity, asset and audit
                entry and restores the seeded BEL dataset. It cannot be undone.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void run()}
                disabled={busy}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Reset everything
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </CardContent>
    </Card>
  );
}

function StorageCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Local persistence</CardTitle>
        </div>
        <CardDescription>
          State lives under the{" "}
          <span className="font-mono text-xs">blockledger.v1.*</span> keys in
          this browser&apos;s local storage. Clearing site data has the same
          effect as a demo reset.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function SettingsContent() {
  const { can } = useAuth();

  return (
    <AppShell>
      <PageHeading
        icon={SettingsIcon}
        title="Settings"
        description="Profile, network configuration and demo data controls."
      />
      <ProfileCard />
      <div className="grid gap-4 lg:grid-cols-2">
        <NetworkCard />
        <div className="space-y-4">
          <AppearanceCard />
          <StorageCard />
        </div>
      </div>
      {/* `resetDemo` has no contract-level guard, so the UI enforces it. */}
      {can("settings:manage") ? <DangerZone /> : null}
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
