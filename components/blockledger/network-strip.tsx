"use client";

import * as React from "react";
import { Database, Info, Radio, Wallet, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChain } from "@/contexts/ChainContext";
import { ipfsGatewayBase } from "@/lib/blockchain/explorer";
import { truncateMiddle } from "@/components/blockledger/primitives";

const DISMISS_KEY = "blockledger.ui.anchorExplainerDismissed";

function Pill({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border bg-card/60 px-3 py-2">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          ok
            ? "bg-emerald-500/10 text-emerald-300"
            : "bg-amber-500/10 text-amber-300"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate font-mono text-xs">{value}</p>
      </div>
    </div>
  );
}

/**
 * Network / anchoring status. States plainly whether writes are really
 * hitting Solana or staying local — the honesty contract of the whole demo.
 */
export function NetworkStatusStrip({ className }: { className?: string }) {
  const {
    cluster,
    mode,
    isWalletConnected,
    isIpfsConfigured,
    walletAddress,
  } = useChain();

  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* non-fatal */
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Pill
          icon={Radio}
          label="Cluster"
          value={`solana ${cluster}`}
          ok
        />
        <Pill
          icon={Wallet}
          label="Wallet"
          value={
            walletAddress ? truncateMiddle(walletAddress, 6, 4) : "not connected"
          }
          ok={isWalletConnected}
        />
        <Pill
          icon={Database}
          label="IPFS (Pinata)"
          value={isIpfsConfigured ? ipfsGatewayBase().replace(/^https?:\/\//, "") : "not configured"}
          ok={isIpfsConfigured}
        />
        <Pill
          icon={Info}
          label="Anchor mode"
          value={mode === "onchain" ? "onchain" : "simulated"}
          ok={mode === "onchain"}
        />
      </div>

      {!dismissed ? (
        <div className="relative flex items-start gap-3 rounded-lg border border-sky-500/25 bg-sky-500/5 px-4 py-3 pr-10">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-300" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              How anchoring works.
            </span>{" "}
            When a Solana wallet is connected and Pinata is configured, every
            state transition is pinned to IPFS and its digest is committed to
            Solana {cluster} as a memo transaction — those records are badged{" "}
            <span className="font-medium text-emerald-300">On-chain</span> and
            link to the explorer. Otherwise BlockLedger records the transition
            in its local hash-chain only and badges it{" "}
            <span className="font-medium text-amber-300">Local / simulated</span>
            . Simulated records never carry a fabricated signature.{" "}
            {!isWalletConnected ? (
              <Link
                href="/wallet"
                className="font-medium text-sky-300 underline underline-offset-4"
              >
                Connect a wallet →
              </Link>
            ) : null}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-7 text-muted-foreground"
            onClick={dismiss}
            aria-label="Dismiss explainer"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
