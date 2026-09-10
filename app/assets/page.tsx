"use client";

import * as React from "react";
import Link from "next/link";
import {
  Gem,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { useChain } from "@/contexts/ChainContext";
import { useLedger } from "@/contexts/LedgerContext";
import { AppShell, PageHeading } from "@/components/blockledger/shell";
import {
  AnchorBadge,
  ASSET_TYPE_LABELS,
  AssetStatusBadge,
  AssetTypeBadge,
  CidLink,
  EmptyState,
  FieldRow,
  LoadingState,
  MonoValue,
  TxLink,
  formatDate,
  shortDid,
  shortHash,
} from "@/components/blockledger/primitives";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/blockledger/modal";
import {
  PipelineProgress,
  type PipelineStep,
  type StepState,
} from "@/components/blockledger/pipeline";
import { reportRevert } from "@/components/blockledger/report-revert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { hashFile } from "@/lib/blockchain/crypto";
import type {
  ActionOutcome,
} from "@/contexts/LedgerContext";
import type {
  AssetRecord,
  AssetType,
  Did,
} from "@/lib/blockchain/types";

const ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS) as AssetType[];

// ---------------------------------------------------------------------------
// Mint dialog + pipeline
// ---------------------------------------------------------------------------

function MintAssetDialog() {
  const { user } = useAuth();
  const { mintAsset, identities } = useLedger();
  const { isIpfsConfigured, isPinning, mode } = useChain();

  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assetType, setAssetType] = React.useState<AssetType>("document");
  const [ownerDid, setOwnerDid] = React.useState<string>("");

  const [stage, setStage] = React.useState<
    "idle" | "hashing" | "minting" | "done" | "failed"
  >("idle");
  const [contentHash, setContentHash] = React.useState<string | null>(null);
  const [pinsSeen, setPinsSeen] = React.useState(0);
  const [outcome, setOutcome] =
    React.useState<ActionOutcome<AssetRecord> | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);

  const activeIdentities = React.useMemo(
    () => identities.filter((i) => i.status === "active"),
    [identities]
  );

  // Count observed IPFS uploads so the pin steps advance from real signals
  // rather than a timer.
  const wasPinning = React.useRef(false);
  React.useEffect(() => {
    if (isPinning && !wasPinning.current) setPinsSeen((n) => n + 1);
    wasPinning.current = isPinning;
  }, [isPinning]);

  const busy = stage === "hashing" || stage === "minting";

  const resetForm = () => {
    setFile(null);
    setName("");
    setDescription("");
    setAssetType("document");
    setOwnerDid("");
    setStage("idle");
    setContentHash(null);
    setPinsSeen(0);
    setOutcome(null);
    setFailure(null);
  };

  const steps = React.useMemo<PipelineStep[]>(() => {
    const done = Boolean(outcome);
    const failed = stage === "failed";

    const pinState = (index: 1 | 2, cid: string | null | undefined): StepState => {
      if (!isIpfsConfigured) return "skipped";
      if (cid) return "done";
      if (failed) return "failed";
      if (stage === "minting" && pinsSeen >= index) return "running";
      return "pending";
    };

    return [
      {
        id: "hash",
        label: "Compute SHA-256 content hash",
        detail: contentHash
          ? contentHash
          : file
            ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB`
            : undefined,
        state: contentHash ? "done" : stage === "hashing" ? "running" : "pending",
      },
      {
        id: "pin-file",
        label: "Pin artefact to IPFS",
        detail: !isIpfsConfigured
          ? "Pinata not configured — skipped, no CID recorded"
          : (outcome?.result.fileCid ?? undefined),
        state: pinState(1, outcome?.result.fileCid),
      },
      {
        id: "pin-meta",
        label: "Pin ERC-721 metadata to IPFS",
        detail: !isIpfsConfigured
          ? "Pinata not configured — skipped, no CID recorded"
          : (outcome?.result.metadataCid ?? undefined),
        state: pinState(2, outcome?.result.metadataCid),
      },
      {
        id: "mint",
        label: "AssetNFT.mint — assign token id and owner",
        detail: outcome ? outcome.result.tokenId : undefined,
        state: done
          ? "done"
          : failed
            ? "failed"
            : stage === "minting"
              ? "running"
              : "pending",
      },
      {
        id: "anchor",
        label:
          mode === "onchain"
            ? "Anchor digest on Solana"
            : "Anchor digest (local — no wallet connected)",
        detail: outcome
          ? outcome.receipt.anchorMode === "onchain"
            ? outcome.receipt.signature ?? undefined
            : (outcome.receipt.error ?? "recorded locally only")
          : undefined,
        state: done
          ? outcome!.receipt.anchorMode === "onchain"
            ? "done"
            : "skipped"
          : failed
            ? "failed"
            : stage === "minting"
              ? "running"
              : "pending",
      },
      {
        id: "audit",
        label: "Append hash-linked audit entry",
        detail: outcome
          ? `#${outcome.auditEntry.index} · ${shortHash(outcome.auditEntry.hash)}`
          : undefined,
        state: done ? "done" : failed ? "failed" : "pending",
      },
    ];
  }, [contentHash, file, isIpfsConfigured, mode, outcome, pinsSeen, stage]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Select a file to mint");
      return;
    }

    setFailure(null);
    setOutcome(null);
    setPinsSeen(0);
    setStage("hashing");

    try {
      // Computed up-front purely so the pipeline can display the real digest;
      // the contract layer recomputes it authoritatively.
      setContentHash(await hashFile(file));
      setStage("minting");

      const result = await mintAsset(file, {
        name: name.trim(),
        description: description.trim(),
        assetType,
        ownerDid: (ownerDid || undefined) as Did | undefined,
      });

      setOutcome(result);
      setStage("done");
      toast.success(`Minted ${result.result.tokenId}`, {
        description:
          result.receipt.anchorMode === "onchain"
            ? `Anchored on Solana ${result.receipt.cluster}`
            : "Recorded in the local hash-chain (no wallet connected)",
      });
    } catch (err) {
      setStage("failed");
      setFailure(reportRevert(err, "Mint failed"));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Mint asset
      </Button>

      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>Mint a digital asset</ModalTitle>
          <ModalDescription>
            The file is hashed locally, pinned to IPFS, minted as an ownership
            token bound to a DID, and its digest anchored on Solana.
          </ModalDescription>
        </ModalHeader>

        {outcome ? (
          <div className="space-y-4">
            <PipelineProgress steps={steps} />
            <dl className="rounded-lg border px-4">
              <FieldRow label="Token id">
                <MonoValue value={outcome.result.tokenId} />
              </FieldRow>
              <FieldRow label="Owner">
                <MonoValue
                  value={outcome.result.ownerDid}
                  display={shortDid(outcome.result.ownerDid)}
                />
              </FieldRow>
              <FieldRow label="Content hash">
                <MonoValue
                  value={outcome.result.contentHash}
                  display={shortHash(outcome.result.contentHash)}
                />
              </FieldRow>
              <FieldRow label="File CID">
                <CidLink cid={outcome.result.fileCid} />
              </FieldRow>
              <FieldRow label="Metadata CID">
                <CidLink cid={outcome.result.metadataCid} />
              </FieldRow>
              <FieldRow label="Transaction">
                <TxLink signature={outcome.receipt.signature} />
              </FieldRow>
              <FieldRow label="Anchor mode">
                <AnchorBadge
                  anchorMode={outcome.receipt.anchorMode}
                  txSignature={outcome.receipt.signature}
                />
              </FieldRow>
            </dl>
            <ModalFooter>
              <Button variant="ghost" onClick={resetForm}>
                Mint another
              </Button>
              <Button asChild>
                <Link href={`/assets/${outcome.result.tokenId}`}>
                  View asset
                </Link>
              </Button>
            </ModalFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="file">Artefact</Label>
              <label
                htmlFor="file"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors hover:bg-muted/40"
              >
                <UploadCloud className="size-5 text-muted-foreground" />
                <span className="min-w-0 text-sm">
                  {file ? (
                    <>
                      <span className="font-medium">{file.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown type"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Choose a file</span>
                      <span className="block text-xs text-muted-foreground">
                        Never uploaded anywhere except IPFS; only its SHA-256 is
                        anchored.
                      </span>
                    </>
                  )}
                </span>
              </label>
              <input
                id="file"
                type="file"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                required
                placeholder="Akash SAM Radar Interface Spec v4.2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-description">Description</Label>
              <Textarea
                id="asset-description"
                required
                rows={3}
                placeholder="Controlled technical specification released to the integration team."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="asset-type">Asset type</Label>
                <Select
                  value={assetType}
                  onValueChange={(v) => setAssetType(v as AssetType)}
                >
                  <SelectTrigger id="asset-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ASSET_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-owner">Owner</Label>
                <Select
                  value={ownerDid || "__self__"}
                  onValueChange={(v) => setOwnerDid(v === "__self__" ? "" : v)}
                >
                  <SelectTrigger id="asset-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__self__">
                      Myself ({user?.name ?? "caller"})
                    </SelectItem>
                    {activeIdentities.map((i) => (
                      <SelectItem key={i.did} value={i.did}>
                        {i.displayName} — {i.organization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {stage !== "idle" ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Mint pipeline
                </p>
                <PipelineProgress steps={steps} />
                {failure ? (
                  <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
                    {failure}
                  </p>
                ) : null}
              </div>
            ) : null}

            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !file}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Minting…" : "Mint asset"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Cards + table
// ---------------------------------------------------------------------------

function AssetCard({ asset }: { asset: AssetRecord }) {
  return (
    <Link
      href={`/assets/${asset.tokenId}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full gap-4 py-5 transition-colors group-hover:border-foreground/20">
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {asset.tokenId}
            </span>
            <AssetStatusBadge status={asset.status} />
          </div>
          <CardTitle className="line-clamp-2 text-base leading-snug">
            {asset.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {asset.description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AssetTypeBadge assetType={asset.assetType} />
            <AnchorBadge
              anchorMode={asset.anchorMode}
              txSignature={asset.txSignature}
            />
          </div>
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <span className="tracking-wide uppercase">Owner</span>
            <p className="font-mono">{shortDid(asset.ownerDid)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AssetsContent() {
  const { can } = useAuth();
  const { assets, isHydrated } = useLedger();

  const [view, setView] = React.useState<"grid" | "table">("grid");
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets
      .filter((a) => typeFilter === "all" || a.assetType === typeFilter)
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.tokenId.toLowerCase().includes(q) ||
          a.ownerDid.toLowerCase().includes(q)
      )
      .slice()
      .sort((a, b) => b.mintedAt - a.mintedAt);
  }, [assets, query, statusFilter, typeFilter]);

  return (
    <AppShell>
      <PageHeading
        icon={Gem}
        title="Digital asset registry"
        description="Every artefact is minted as an ownership token bound to a DID, with its SHA-256 content hash and IPFS CIDs recorded immutably."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              <Button
                size="sm"
                variant={view === "grid" ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                size="sm"
                variant={view === "table" ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => setView("table")}
                aria-label="Table view"
              >
                <List className="size-4" />
              </Button>
            </div>
            {can("asset:mint") ? <MintAssetDialog /> : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, token id or owner DID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ASSET_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="burned">Burned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isHydrated ? (
        <LoadingState label="Loading asset registry…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Gem}
          title={
            assets.length === 0
              ? "No assets minted yet"
              : "No assets match your filters"
          }
          description={
            assets.length === 0
              ? "Mint the first asset to create an ownership record."
              : "Try clearing the search or filters."
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((asset) => (
            <AssetCard key={asset.tokenId} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Token</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Minted</TableHead>
                <TableHead className="text-right">Anchor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((asset) => (
                <TableRow key={asset.tokenId}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/assets/${asset.tokenId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {asset.tokenId}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-72 truncate font-medium">
                    <Link
                      href={`/assets/${asset.tokenId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {asset.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <AssetTypeBadge assetType={asset.assetType} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                    {shortDid(asset.ownerDid)}
                  </TableCell>
                  <TableCell>
                    <AssetStatusBadge status={asset.status} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                    {formatDate(asset.mintedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AnchorBadge
                      anchorMode={asset.anchorMode}
                      txSignature={asset.txSignature}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}

export default function AssetsPage() {
  return (
    <ProtectedRoute requiredPermission="asset:view">
      <AssetsContent />
    </ProtectedRoute>
  );
}
