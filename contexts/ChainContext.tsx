"use client";

/**
 * ChainContext — the single gateway through which BlockLedger touches the
 * outside world: Solana devnet (via `useSolanaAction`) and IPFS (via
 * `useIpfs`).
 *
 * Honesty rules enforced here:
 *  - If no wallet is connected, or the anchoring transaction fails, we return
 *    `anchorMode: "simulated"` with `signature: null`. We never invent one.
 *  - If Pinata is not configured, pinning returns `null` rather than a fake CID.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useIpfs } from "@/hooks/useIpfs";
import { useSolanaAction } from "@/hooks/useSolanaAction";
import { explorerTxUrl, resolveCluster } from "@/lib/blockchain/explorer";
import type {
  AnchorMode,
  AnchorPayload,
  AuditAction,
  Cid,
  Cluster,
  TxReceipt,
} from "@/lib/blockchain/types";

/** The SPL memo instruction used by `useSolanaAction` fails above 80 bytes. */
export const MEMO_BYTE_LIMIT = 80;

/** Short discriminators keep the memo comfortably under the byte limit. */
const ACTION_CODES: Record<AuditAction, string> = {
  GENESIS: "GEN",
  IDENTITY_REGISTERED: "IDR",
  IDENTITY_UPDATED: "IDU",
  IDENTITY_SUSPENDED: "IDS",
  IDENTITY_REVOKED: "IDX",
  ASSET_MINTED: "AMT",
  ASSET_TRANSFERRED: "ATR",
  ASSET_BURNED: "ABN",
  ROLE_GRANTED: "RGR",
  ROLE_REVOKED: "RRV",
  AUDIT_EXPORTED: "AEX",
  SETTINGS_UPDATED: "SET",
};

/**
 * `BLKL1|AMT|3f9a…(16 hex)|BLKL-000012` — a commitment to the transition,
 * not the transition itself. Always well under 80 bytes.
 */
export function buildMemo(payload: AnchorPayload): string {
  const code = ACTION_CODES[payload.action] ?? "UNK";
  const digest = (
    payload.hash.startsWith("0x") ? payload.hash.slice(2) : payload.hash
  ).slice(0, 16);
  const ref = (payload.ref ?? "").replace(/^did:blkl:sol:/, "").slice(0, 12);
  const memo = `BLKL1|${code}|${digest}${ref ? `|${ref}` : ""}`;
  return memo.length > MEMO_BYTE_LIMIT ? memo.slice(0, MEMO_BYTE_LIMIT) : memo;
}

export interface ChainContextValue {
  /** Commits a digest of a state transition to Solana. Never throws. */
  anchor: (payload: AnchorPayload) => Promise<TxReceipt>;
  /** Pins raw bytes to IPFS. Returns `null` when Pinata is not configured. */
  pinFile: (file: File) => Promise<Cid | null>;
  /** Pins a JSON document to IPFS. Returns `null` when not configured. */
  pinJson: (obj: object) => Promise<Cid | null>;
  isWalletConnected: boolean;
  isIpfsConfigured: boolean;
  /** Base58 address of the connected wallet, or `null`. */
  walletAddress: string | null;
  cluster: Cluster;
  /** `"onchain"` only while a wallet is actually connected. */
  mode: AnchorMode;
  isAnchoring: boolean;
  isPinning: boolean;
}

const ChainContext = createContext<ChainContextValue | undefined>(undefined);

export function ChainProvider({ children }: { children: React.ReactNode }) {
  const { connected, publicKey } = useWallet();
  const { sendTransaction, isSending } = useSolanaAction();
  const { uploadFile, uploadJson, isUploading } = useIpfs();

  const cluster = useMemo<Cluster>(() => resolveCluster(), []);
  const isIpfsConfigured = Boolean(process.env.NEXT_PUBLIC_PINATA_JWT);
  const isWalletConnected = Boolean(connected && publicKey);
  const mode: AnchorMode = isWalletConnected ? "onchain" : "simulated";

  const simulatedReceipt = useCallback(
    (error?: string): TxReceipt => ({
      signature: null,
      blockTime: Math.floor(Date.now() / 1000),
      slot: null,
      anchorMode: "simulated",
      explorerUrl: null,
      cluster,
      ...(error ? { error } : {}),
    }),
    [cluster]
  );

  const anchor = useCallback(
    async (payload: AnchorPayload): Promise<TxReceipt> => {
      if (!isWalletConnected) {
        return simulatedReceipt("Wallet not connected — recorded locally only");
      }

      const memo = buildMemo(payload);
      const { signature, error } = await sendTransaction(memo);

      if (!signature) {
        // Degrade honestly instead of blocking the user or faking a receipt.
        return simulatedReceipt(error?.message ?? "Anchoring transaction failed");
      }

      return {
        signature,
        blockTime: Math.floor(Date.now() / 1000),
        slot: null,
        anchorMode: "onchain",
        explorerUrl: explorerTxUrl(signature, cluster),
        cluster,
      };
    },
    [cluster, isWalletConnected, sendTransaction, simulatedReceipt]
  );

  const pinFile = useCallback(
    async (file: File): Promise<Cid | null> => {
      if (!isIpfsConfigured) return null;
      return uploadFile(file);
    },
    [isIpfsConfigured, uploadFile]
  );

  const pinJson = useCallback(
    async (obj: object): Promise<Cid | null> => {
      if (!isIpfsConfigured) return null;
      return uploadJson(obj);
    },
    [isIpfsConfigured, uploadJson]
  );

  const value = useMemo<ChainContextValue>(
    () => ({
      anchor,
      pinFile,
      pinJson,
      isWalletConnected,
      isIpfsConfigured,
      walletAddress: publicKey ? publicKey.toBase58() : null,
      cluster,
      mode,
      isAnchoring: isSending,
      isPinning: isUploading,
    }),
    [
      anchor,
      pinFile,
      pinJson,
      isWalletConnected,
      isIpfsConfigured,
      publicKey,
      cluster,
      mode,
      isSending,
      isUploading,
    ]
  );

  return (
    <ChainContext.Provider value={value}>{children}</ChainContext.Provider>
  );
}

export function useChain(): ChainContextValue {
  const ctx = useContext(ChainContext);
  if (!ctx) throw new Error("useChain must be used within a ChainProvider");
  return ctx;
}
