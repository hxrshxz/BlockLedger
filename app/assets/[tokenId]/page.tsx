"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Flame,
  Gem,
  Loader2,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { useLedger } from "@/contexts/LedgerContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import {
  AnchorBadge,
  AssetStatusBadge,
  AssetTypeBadge,
  CidLink,
  EmptyState,
  FieldRow,
  JsonBlock,
  LoadingState,
  MonoValue,
  TxLink,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildAssetMetadata } from "@/lib/contracts/AssetNFT";
import type { AssetRecord } from "@/lib/blockchain/types";

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

interface ProvenanceEvent {
  label: string;
  actor: string;
  timestamp: number;
  txSignature: string | null;
  anchorMode: AssetRecord["anchorMode"];
}

function Provenance({ asset }: { asset: AssetRecord }) {
  const events = React.useMemo<ProvenanceEvent[]>(() => {
    const list: ProvenanceEvent[] = [
      {
        label: "Minted",
        actor: asset.minterDid,
        timestamp: asset.mintedAt,
        txSignature: asset.txSignature,
        anchorMode: asset.anchorMode,
      },
      ...asset.transferHistory.map((t) => ({
        label: `Transferred to ${shortDid(t.to)}`,
        actor: t.from,
        timestamp: t.timestamp,
        txSignature: t.txSignature,
        anchorMode: t.anchorMode,
      })),
    ];
    if (asset.status === "burned") {
      list.push({
        label: "Burned",
        actor: asset.ownerDid,
        timestamp: asset.mintedAt,
        txSignature: asset.txSignature,
        anchorMode: asset.anchorMode,
      });
    }
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [asset]);

  return (
    <ol className="space-y-0">
      {events.map((e, i) => (
        <li key={`${e.label}-${e.timestamp}-${i}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-foreground/60" />
            {i < events.length - 1 ? (
              <span className="w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className={i < events.length - 1 ? "flex-1 pb-5" : "flex-1"}>
            <p className="text-sm font-medium">{e.label}</p>
            <p className="font-mono text-xs text-muted-foreground">
              by {shortDid(e.actor)} · {formatTimestamp(e.timestamp)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <AnchorBadge
                anchorMode={e.anchorMode}
                txSignature={e.txSignature}
              />
              {e.txSignature ? <TxLink signature={e.txSignature} /> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Transfer / burn
// ---------------------------------------------------------------------------

function TransferDialog({ asset }: { asset: AssetRecord }) {
  const { identities, transferAsset } = useLedger();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [toDid, setToDid] = React.useState("");

  const candidates = React.useMemo(
    () =>
      identities.filter(
        (i) => i.status === "active" && i.did !== asset.ownerDid
      ),
    [identities, asset.ownerDid]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { receipt } = await transferAsset(asset.tokenId, toDid);
      toast.success(`Transferred ${asset.tokenId}`, {
        description:
          receipt.anchorMode === "onchain"
            ? `Anchored on Solana ${receipt.cluster}`
            : "Recorded in the local hash-chain",
      });
      setOpen(false);
      setToDid("");
    } catch (err) {
      reportRevert(err, "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={asset.status === "burned"}
      >
        <ArrowRightLeft className="size-4" />
        Transfer
      </Button>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Transfer {asset.tokenId}</ModalTitle>
          <ModalDescription>
            Ownership may only move to an <strong>active</strong> registered
            identity — the AssetNFT contract reverts otherwise.
          </ModalDescription>
        </ModalHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="to-did">New owner</Label>
            <Select value={toDid} onValueChange={setToDid}>
              <SelectTrigger id="to-did">
                <SelectValue placeholder="Select an identity…" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((i) => (
                  <SelectItem key={i.did} value={i.did}>
                    {i.displayName} — {i.organization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={busy || !toDid}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm transfer
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

function BurnDialog({ asset }: { asset: AssetRecord }) {
  const { burnAsset } = useLedger();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await burnAsset(asset.tokenId);
      toast.success(`Burned ${asset.tokenId}`);
      setOpen(false);
    } catch (err) {
      reportRevert(err, "Burn failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={asset.status === "burned"}
      >
        <Flame className="size-4" />
        Burn
      </Button>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Burn {asset.tokenId}?</ModalTitle>
          <ModalDescription>
            Burning retires the token permanently. The record and its audit
            entries remain in the chain — nothing is ever deleted.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Burn token
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AssetDetailContent() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = Array.isArray(params?.tokenId)
    ? params.tokenId[0]
    : (params?.tokenId ?? "");

  const { can } = useAuth();
  const { getAsset, getIdentity, isHydrated } = useLedger();

  const asset = getAsset(tokenId);

  const metadata = React.useMemo(() => {
    if (!asset) return null;
    return buildAssetMetadata({
      name: asset.name,
      description: asset.description,
      assetType: asset.assetType,
      fileCid: asset.fileCid,
      contentHash: asset.contentHash,
      ownerDid: asset.ownerDid,
      minterDid: asset.minterDid,
      tokenId: asset.tokenId,
    });
  }, [asset]);

  if (!isHydrated) {
    return (
      <AppShell>
        <LoadingState label="Loading asset…" />
      </AppShell>
    );
  }

  if (!asset || !metadata) {
    return (
      <AppShell>
        <EmptyState
          icon={Gem}
          title={`No such token: ${tokenId || "—"}`}
          description="AssetNFT: token does not exist. It may have never been minted, or the demo data was reset."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/assets">
                <ArrowLeft className="size-4" />
                Back to registry
              </Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const owner = getIdentity(asset.ownerDid);
  const minter = getIdentity(asset.minterDid);
  const canMutate = can("asset:transfer") || can("asset:burn");

  return (
    <AppShell>
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/assets">
            <ArrowLeft className="size-4" />
            Asset registry
          </Link>
        </Button>
        <PageHeading
          icon={Gem}
          title={asset.name}
          description={asset.description}
          actions={
            canMutate ? (
              <>
                {can("asset:transfer") ? <TransferDialog asset={asset} /> : null}
                {can("asset:burn") ? <BurnDialog asset={asset} /> : null}
              </>
            ) : null
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border bg-card px-2.5 py-1 font-mono text-xs">
          {asset.tokenId}
        </span>
        <AssetTypeBadge assetType={asset.assetType} />
        <AssetStatusBadge status={asset.status} />
        <AnchorBadge
          anchorMode={asset.anchorMode}
          txSignature={asset.txSignature}
        />
      </div>

      {!canMutate ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <ShieldOff className="mt-0.5 size-4 shrink-0" />
          Your role lacks <span className="font-mono">asset:transfer</span> and{" "}
          <span className="font-mono">asset:burn</span>, so this asset is
          read-only for you.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Record</CardTitle>
            <CardDescription>
              Integrity proof, storage pointers and ownership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <FieldRow label="Token id">
                <MonoValue value={asset.tokenId} />
              </FieldRow>
              <FieldRow label="Content hash">
                <MonoValue value={asset.contentHash} />
              </FieldRow>
              <FieldRow label="File CID">
                <CidLink cid={asset.fileCid} />
              </FieldRow>
              <FieldRow label="Metadata CID">
                <CidLink cid={asset.metadataCid} />
              </FieldRow>
              <FieldRow label="Owner">
                <div className="space-y-0.5">
                  <p className="text-sm">
                    {owner ? owner.displayName : "Unregistered identity"}
                    {owner ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {owner.organization}
                      </span>
                    ) : null}
                  </p>
                  <MonoValue
                    value={asset.ownerDid}
                    display={shortDid(asset.ownerDid)}
                  />
                </div>
              </FieldRow>
              <FieldRow label="Owner address">
                <MonoValue value={asset.ownerAddress} />
              </FieldRow>
              <FieldRow label="Minted by">
                <div className="space-y-0.5">
                  <p className="text-sm">
                    {minter ? minter.displayName : "Unregistered identity"}
                  </p>
                  <MonoValue
                    value={asset.minterDid}
                    display={shortDid(asset.minterDid)}
                  />
                </div>
              </FieldRow>
              <FieldRow label="Minted at">
                {formatTimestamp(asset.mintedAt)}
              </FieldRow>
              <FieldRow label="Anchoring tx">
                <TxLink signature={asset.txSignature} />
              </FieldRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provenance</CardTitle>
            <CardDescription>
              {asset.transferHistory.length} custody transfer
              {asset.transferHistory.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Provenance asset={asset} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token metadata</CardTitle>
          <CardDescription>
            ERC-721 metadata document, exactly as pinned to IPFS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JsonBlock
            data={metadata}
            label={`${asset.tokenId}.json`}
            maxHeight="28rem"
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function AssetDetailPage() {
  return (
    <ProtectedRoute requiredPermission="asset:view">
      <AssetDetailContent />
    </ProtectedRoute>
  );
}
