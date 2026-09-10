/** Outbound links: Solana Explorer and the configured IPFS gateway. */

import type { Address, Cid, Cluster, TxSignature } from "./types";

const EXPLORER_BASE = "https://explorer.solana.com";
const DEFAULT_GATEWAY = "https://ipfs.io/ipfs";

/** Reads `NEXT_PUBLIC_SOLANA_CLUSTER`, matching `components/WalletProvider.tsx`. */
export function resolveCluster(): Cluster {
  const raw = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet").toLowerCase();
  if (raw === "mainnet" || raw === "mainnet-beta") return "mainnet-beta";
  if (raw === "testnet") return "testnet";
  return "devnet";
}

function clusterQuery(cluster: Cluster): string {
  // Explorer omits the query string for mainnet-beta.
  return cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
}

export function explorerTxUrl(
  sig: TxSignature | null | undefined,
  cluster: Cluster = resolveCluster()
): string | null {
  if (!sig) return null;
  return `${EXPLORER_BASE}/tx/${sig}${clusterQuery(cluster)}`;
}

export function explorerAddressUrl(
  address: Address | null | undefined,
  cluster: Cluster = resolveCluster()
): string | null {
  if (!address) return null;
  return `${EXPLORER_BASE}/address/${address}${clusterQuery(cluster)}`;
}

/** Normalises `NEXT_PUBLIC_IPFS_GATEWAY` the same way `hooks/useIpfs.ts` does. */
export function ipfsGatewayBase(): string {
  const env = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
  let base = (env?.trim() || DEFAULT_GATEWAY).replace(/\/$/, "");
  if (!/\/ipfs$/.test(base)) base = `${base}/ipfs`;
  return base;
}

export function ipfsGatewayUrl(cid: Cid | null | undefined): string | null {
  if (!cid) return null;
  const clean = cid.replace(/^ipfs:\/\//, "");
  return `${ipfsGatewayBase()}/${clean}`;
}

/** `ipfs://<cid>` — the canonical URI stored inside NFT metadata. */
export function ipfsUri(cid: Cid | null | undefined): string | null {
  return cid ? `ipfs://${cid.replace(/^ipfs:\/\//, "")}` : null;
}
