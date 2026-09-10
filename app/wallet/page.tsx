"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Fingerprint, Radio, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ProtectedRoute } from "@/contexts/AuthContext";
import { useChain } from "@/contexts/ChainContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import { MonoValue } from "@/components/blockledger/primitives";
import { FocusCards } from "@/components/ui/focus-cards";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { didFromAddress } from "@/lib/blockchain/did";
import { explorerAddressUrl } from "@/lib/blockchain/explorer";

const WALLET_OPTIONS = [
  {
    id: "phantom",
    title: "Phantom",
    image: "/w4.png",
    description: "The friendly Solana wallet built for everyone",
    features: ["Easy to use", "Secure", "Mobile friendly"],
    category: "Recommended",
    categoryColor: "bg-purple-500/20 text-purple-300",
    adapterName: "Phantom",
  },
  {
    id: "solflare",
    title: "Solflare",
    image: "/w1.png",
    description: "A comprehensive Solana wallet with advanced features",
    features: ["Multi-chain support", "NFT storage", "DeFi integration"],
    category: "Popular",
    categoryColor: "bg-orange-500/20 text-orange-300",
    adapterName: "Solflare",
  },
  {
    id: "backpack",
    title: "Backpack",
    image: "/w3.png",
    description: "Modern wallet built for the next generation of Web3",
    features: ["Social features", "Portfolio tracking", "Cross-chain"],
    category: "New",
    categoryColor: "bg-green-500/20 text-green-300",
    adapterName: "Backpack",
  },
  {
    id: "metamask",
    title: "MetaMask",
    image: "/w2.png",
    description: "Connect via the MetaMask Solana Snap",
    features: ["Browser extension", "Familiar interface", "Multi-chain"],
    category: "Ethereum",
    categoryColor: "bg-blue-500/20 text-blue-300",
    adapterName: "MetaMask",
  },
];

function WalletContent() {
  const [connectingWallet, setConnectingWallet] = React.useState<string | null>(
    null
  );
  const { select, wallets, connected, disconnect } = useWallet();
  const { walletAddress, cluster, isIpfsConfigured } = useChain();

  const derivedDid = walletAddress ? didFromAddress(walletAddress) : null;

  const handleConnectWallet = async (walletId: string) => {
    try {
      setConnectingWallet(walletId);

      const walletOption = WALLET_OPTIONS.find((w) => w.id === walletId);
      if (!walletOption) {
        console.error(`Wallet ${walletId} not found`);
        return;
      }

      const walletAdapter = wallets.find((wallet) =>
        wallet.adapter.name
          .toLowerCase()
          .includes(walletOption.adapterName.toLowerCase())
      );

      if (walletAdapter) {
        // Switching wallets requires a clean disconnect first.
        if (connected) {
          await disconnect();
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await select(walletAdapter.adapter.name);
      } else {
        alert(
          `Please install the ${walletOption.title} browser extension first, then refresh the page.`
        );
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      alert(
        "Failed to connect to wallet. Please make sure the wallet extension is installed and try again."
      );
    } finally {
      setConnectingWallet(null);
    }
  };

  return (
    <AppShell>
      <PageHeading
        icon={Wallet}
        title="Wallet & anchoring key"
        description={`Connecting a Solana wallet turns BlockLedger from a local ledger into an anchored one: every state transition is committed to Solana ${cluster} as a memo transaction signed by this key.`}
        actions={
          connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void disconnect()}
            >
              Disconnect
            </Button>
          ) : null
        }
      />

      {connected && walletAddress && derivedDid ? (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <div>
                <CardTitle className="text-base">
                  Wallet connected — anchoring is live
                </CardTitle>
                <CardDescription>
                  New records will be badged{" "}
                  <span className="text-emerald-300">On-chain</span> and link to
                  the Solana explorer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Address
              </p>
              <MonoValue value={walletAddress} />
              <a
                href={explorerAddressUrl(walletAddress) ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="block text-xs text-sky-300 underline-offset-4 hover:underline"
              >
                View on Solana Explorer →
              </a>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                <Fingerprint className="size-3.5" />
                Derived identity
              </p>
              <MonoValue value={derivedDid} />
              <p className="text-xs text-muted-foreground">
                Resolvable through the BlockLedger identity registry.
              </p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                <Radio className="size-3.5" />
                Cluster
              </p>
              <p className="font-mono text-xs">solana {cluster}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                IPFS pinning
              </p>
              <p className="font-mono text-xs">
                {isIpfsConfigured
                  ? "Pinata configured"
                  : "not configured — CIDs will be null"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No wallet connected</CardTitle>
            <CardDescription>
              BlockLedger stays fully usable — transitions are recorded in the
              local hash-chain and badged{" "}
              <span className="text-amber-300">Local / simulated</span>. No
              signature is ever fabricated.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Choose a wallet
        </h2>
        <FocusCards
          cards={WALLET_OPTIONS}
          onConnect={handleConnectWallet}
          isConnecting={connectingWallet}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            What the wallet is used for
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400" />
              Signing memo transactions that anchor the SHA-256 digest of each
              identity, asset and access-control transition.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400" />
              Deriving your{" "}
              <span className="font-mono text-foreground">did:blkl:sol</span>{" "}
              decentralized identifier from the public key.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400" />
              Producing explorer-verifiable proof that an audit entry existed at
              a given block time.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400" />
              Nothing else — BlockLedger never requests token approvals or
              transfers of value.{" "}
              <Link
                href="/audit"
                className="text-sky-300 underline underline-offset-4"
              >
                Inspect the audit trail
              </Link>
              .
            </li>
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <WalletContent />
    </ProtectedRoute>
  );
}
