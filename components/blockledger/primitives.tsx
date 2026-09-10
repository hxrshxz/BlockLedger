"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  HardDrive,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  explorerTxUrl,
  ipfsGatewayUrl,
  resolveCluster,
} from "@/lib/blockchain/explorer";
import type {
  AnchorMode,
  AssetStatus,
  AssetType,
  AuditCategory,
  Cid,
  IdentityStatus,
  Role,
  TxSignature,
} from "@/lib/blockchain/types";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Stable, locale-independent timestamp — avoids SSR/CSR drift. */
export function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function truncateMiddle(value: string, head = 8, tail = 6): string {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** `did:blkl:sol:7xKX…gAsU` — keeps the method visible, elides the key. */
export function shortDid(did: string): string {
  const prefix = "did:blkl:sol:";
  if (!did.startsWith(prefix)) return truncateMiddle(did);
  return `${prefix}${truncateMiddle(did.slice(prefix.length), 4, 4)}`;
}

export function shortHash(hex: string): string {
  return truncateMiddle(hex, 10, 6);
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = React.useCallback(async (value: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      toast.success(label);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Clipboard unavailable in this browser");
    }
  }, []);

  return { copied, copy };
}

export function CopyButton({
  value,
  label = "Copied to clipboard",
  className,
  size = "icon",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "icon" | "sm";
}) {
  const { copied, copy } = useCopy();
  const isCopied = copied === value;

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "icon" ? "icon" : "sm"}
      className={cn("size-7 shrink-0 text-muted-foreground", className)}
      onClick={(e) => {
        e.stopPropagation();
        void copy(value, label);
      }}
      aria-label="Copy to clipboard"
    >
      {isCopied ? (
        <Check className="size-3.5 text-emerald-400" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}

/** Monospace value + copy affordance — the workhorse of every detail view. */
export function MonoValue({
  value,
  display,
  className,
  copyable = true,
}: {
  value: string;
  display?: string;
  className?: string;
  copyable?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="font-mono text-xs break-all">{display ?? value}</span>
      {copyable ? <CopyButton value={value} /> : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Anchor honesty
// ---------------------------------------------------------------------------

/**
 * Renders the anchoring provenance of a record. A `simulated` record is never
 * dressed up to look on-chain: it gets a distinct neutral badge and no link.
 */
export function AnchorBadge({
  anchorMode,
  txSignature,
  className,
}: {
  anchorMode: AnchorMode;
  txSignature?: TxSignature | null;
  className?: string;
}) {
  const url = anchorMode === "onchain" ? explorerTxUrl(txSignature ?? null) : null;

  if (anchorMode === "onchain" && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20",
          className
        )}
      >
        <Link2 className="size-3" />
        On-chain
        <ExternalLink className="size-3 opacity-70" />
      </a>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-500/40 bg-amber-500/5 px-2.5 py-0.5 text-xs font-medium text-amber-300/90",
              className
            )}
          >
            <HardDrive className="size-3" />
            Local / simulated
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Recorded in the local hash-chain only. Connect a Solana wallet to
          anchor future transitions on {resolveCluster()}.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CidLink({
  cid,
  label,
  className,
}: {
  cid: Cid | null | undefined;
  label?: string;
  className?: string;
}) {
  if (!cid) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        not pinned — IPFS not configured
      </span>
    );
  }
  const url = ipfsGatewayUrl(cid);
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 underline-offset-4 hover:underline"
      >
        {label ?? truncateMiddle(cid, 10, 6)}
        <ExternalLink className="size-3 opacity-70" />
      </a>
      <CopyButton value={cid} label="CID copied" />
    </span>
  );
}

export function TxLink({
  signature,
  className,
}: {
  signature: TxSignature | null | undefined;
  className?: string;
}) {
  if (!signature) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        no signature — simulated
      </span>
    );
  }
  const url = explorerTxUrl(signature);
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 underline-offset-4 hover:underline"
      >
        {truncateMiddle(signature, 10, 6)}
        <ExternalLink className="size-3 opacity-70" />
      </a>
      <CopyButton value={signature} label="Signature copied" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Domain badges
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  MANAGER: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  AUDITOR: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  USER: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide",
        ROLE_STYLES[role],
        className
      )}
    >
      {role}
    </span>
  );
}

const IDENTITY_STATUS_STYLES: Record<IdentityStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  suspended: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  revoked: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function IdentityStatusBadge({
  status,
  className,
}: {
  status: IdentityStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        IDENTITY_STATUS_STYLES[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

const ASSET_STATUS_STYLES: Record<AssetStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  burned: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function AssetStatusBadge({
  status,
  className,
}: {
  status: AssetStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        ASSET_STATUS_STYLES[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  document: "Document",
  "design-file": "Design file",
  firmware: "Firmware",
  certificate: "Certificate",
  license: "Licence",
  "hardware-passport": "Hardware passport",
};

export function AssetTypeBadge({
  assetType,
  className,
}: {
  assetType: AssetType;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-normal", className)}>
      {ASSET_TYPE_LABELS[assetType]}
    </Badge>
  );
}

const CATEGORY_STYLES: Record<AuditCategory, string> = {
  identity: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  asset: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  access: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  system: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

export function CategoryBadge({
  category,
  className,
}: {
  category: AuditCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        CATEGORY_STYLES[category],
        className
      )}
    >
      {category}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 py-5", className)}>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </CardTitle>
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        </div>
        <div className="text-3xl font-semibold tabular-nums tracking-tight">
          {value}
        </div>
      </CardHeader>
      {hint ? (
        <CardContent className="text-xs text-muted-foreground">
          {hint}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center",
        className
      )}
    >
      {Icon ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading ledger…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

/** Pretty-printed JSON with a copy control. Used for DID + NFT documents. */
export function JsonBlock({
  data,
  label,
  className,
  maxHeight = "24rem",
}: {
  data: unknown;
  label?: string;
  className?: string;
  maxHeight?: string;
}) {
  const json = React.useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <div className={cn("rounded-lg border bg-muted/40", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label ?? "JSON"}
        </span>
        <CopyButton value={json} label="JSON copied" />
      </div>
      <pre
        className="overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed"
        style={{ maxHeight }}
      >
        {json}
      </pre>
    </div>
  );
}

/** Loud, unmissable failure panel — used for tamper detection. */
export function DangerPanel({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-red-300">{title}</p>
        {children ? (
          <div className="text-red-200/80">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

export function FieldRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 border-b py-2.5 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-4",
        className
      )}
    >
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}
