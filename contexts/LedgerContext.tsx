"use client";

/**
 * LedgerContext — the application's state machine.
 *
 * Holds the identity registry, the asset registry and the hash-chained audit
 * trail; persists them under `blockledger.v1.*`; hydrates from `seed.ts` on
 * first run. Every mutating action follows the same pipeline:
 *
 *   permission guard (contracts)  →  pin to IPFS  →  anchor on Solana
 *                                 →  append audit entry  →  commit state
 *
 * `ContractRevert` errors are re-thrown untouched so pages can show the raw
 * revert string.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChain } from "@/contexts/ChainContext";
import { hashFile } from "@/lib/blockchain/crypto";
import { exportChain, verifyChain } from "@/lib/blockchain/ledger";
import {
  StorageKeys,
  readState,
  writeState,
  clearAllState,
} from "@/lib/blockchain/persistence";
import { buildSeedSnapshot } from "@/lib/blockchain/seed";
import type {
  AssetRecord,
  AssetType,
  AuditEntry,
  Caller,
  ChainVerification,
  ContractCallContext,
  Did,
  IdentityRecord,
  LedgerStats,
  Role,
  TxReceipt,
} from "@/lib/blockchain/types";
import * as AccessControl from "@/lib/contracts/AccessControl";
import * as AssetNFT from "@/lib/contracts/AssetNFT";
import * as IdentityRegistry from "@/lib/contracts/IdentityRegistry";
import { ContractRevert } from "@/lib/contracts/errors";
import { settle } from "@/lib/contracts/internal";

// ---------------------------------------------------------------------------
// Public action payloads
// ---------------------------------------------------------------------------

export interface CreateIdentityInput {
  address: string;
  displayName: string;
  organization: string;
  role: Role;
  alsoKnownAs?: string[];
}

export interface MintAssetInput {
  name: string;
  description: string;
  assetType: AssetType;
  /** Defaults to the caller's DID. Must be an active registered identity. */
  ownerDid?: Did;
}

export interface ActionOutcome<T> {
  result: T;
  receipt: TxReceipt;
  auditEntry: AuditEntry;
}

interface LedgerState {
  identities: IdentityRecord[];
  assets: AssetRecord[];
  chain: AuditEntry[];
  nextTokenSequence: number;
}

const EMPTY_STATE: LedgerState = {
  identities: [],
  assets: [],
  chain: [],
  nextTokenSequence: 1,
};

export interface LedgerContextValue {
  // state
  identities: IdentityRecord[];
  assets: AssetRecord[];
  auditChain: AuditEntry[];
  isHydrated: boolean;
  isBusy: boolean;

  // identity actions
  createIdentity: (
    input: CreateIdentityInput
  ) => Promise<ActionOutcome<IdentityRecord>>;
  suspendIdentity: (
    did: string,
    reason?: string
  ) => Promise<ActionOutcome<IdentityRecord>>;
  revokeIdentity: (
    did: string,
    reason?: string
  ) => Promise<ActionOutcome<IdentityRecord>>;

  // asset actions
  mintAsset: (
    file: File,
    meta: MintAssetInput
  ) => Promise<ActionOutcome<AssetRecord>>;
  transferAsset: (
    tokenId: string,
    toDid: string
  ) => Promise<ActionOutcome<AssetRecord>>;
  burnAsset: (
    tokenId: string,
    reason?: string
  ) => Promise<ActionOutcome<AssetRecord>>;

  // access actions
  grantRole: (
    did: string,
    role: Role
  ) => Promise<ActionOutcome<IdentityRecord>>;
  revokeRole: (did: string) => Promise<ActionOutcome<IdentityRecord>>;

  // selectors
  getIdentity: (did: string) => IdentityRecord | null;
  getAsset: (tokenId: string) => AssetRecord | null;
  listAssetsByOwner: (ownerDid: string) => AssetRecord[];
  verifyAudit: () => Promise<ChainVerification>;
  exportAudit: () => Promise<string>;
  stats: LedgerStats;

  /** Wipes persisted state and re-seeds. */
  resetDemo: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { anchor, pinFile, pinJson } = useChain();

  const [state, setState] = useState<LedgerState>(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Mirror of `state` so async action pipelines always read the latest chain
  // head without re-creating every callback.
  const stateRef = useRef<LedgerState>(state);
  stateRef.current = state;

  // -- hydration ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const identities = readState<IdentityRecord[]>(
        StorageKeys.identities,
        []
      );
      const assets = readState<AssetRecord[]>(StorageKeys.assets, []);
      const chain = readState<AuditEntry[]>(StorageKeys.auditChain, []);
      const seeded = readState<boolean>(StorageKeys.seeded, false);

      if (seeded && chain.length > 0) {
        const nextTokenSequence = readState<number>(
          StorageKeys.tokenSequence,
          assets.length + 1
        );
        if (!cancelled) {
          setState({ identities, assets, chain, nextTokenSequence });
          setIsHydrated(true);
        }
        return;
      }

      try {
        const snapshot = await buildSeedSnapshot();
        if (cancelled) return;
        setState({
          identities: snapshot.identities,
          assets: snapshot.assets,
          chain: snapshot.chain,
          nextTokenSequence: snapshot.nextTokenSequence,
        });
        writeState(StorageKeys.seeded, true);
      } catch (error) {
        console.error("[blockledger] failed to build seed data", error);
        if (!cancelled) setState(EMPTY_STATE);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // -- persistence --------------------------------------------------------

  useEffect(() => {
    if (!isHydrated) return;
    writeState(StorageKeys.identities, state.identities);
    writeState(StorageKeys.assets, state.assets);
    writeState(StorageKeys.auditChain, state.chain);
    writeState(StorageKeys.tokenSequence, state.nextTokenSequence);
  }, [state, isHydrated]);

  // -- contract plumbing --------------------------------------------------

  const callerRef = useRef<Caller | null>(null);
  callerRef.current = user
    ? { did: user.did, address: user.address, role: user.role }
    : null;

  const requireCaller = useCallback((): Caller => {
    const caller = callerRef.current;
    if (!caller) {
      throw new Error("Not authenticated — sign in before submitting a transaction.");
    }
    return caller;
  }, []);

  const buildCtx = useCallback((): ContractCallContext => {
    return {
      caller: requireCaller(),
      chain: stateRef.current.chain,
      anchor,
    };
  }, [anchor, requireCaller]);

  /**
   * Runs a contract call and commits its audit entry plus whatever state
   * mutation the caller describes. Reverts propagate untouched.
   */
  const run = useCallback(
    async <T,>(
      fn: (ctx: ContractCallContext) => Promise<{
        result: T;
        auditEntry: AuditEntry;
        receipt: TxReceipt;
      }>,
      commit: (prev: LedgerState, result: T, entry: AuditEntry) => LedgerState
    ): Promise<ActionOutcome<T>> => {
      setIsBusy(true);
      try {
        const ctx = buildCtx();
        const { result, auditEntry, receipt } = await fn(ctx);
        setState((prev) => commit(prev, result, auditEntry));
        return { result, receipt, auditEntry };
      } finally {
        setIsBusy(false);
      }
    },
    [buildCtx]
  );

  const upsertIdentity = (
    prev: LedgerState,
    record: IdentityRecord,
    entry: AuditEntry
  ): LedgerState => ({
    ...prev,
    identities: prev.identities.some((i) => i.did === record.did)
      ? prev.identities.map((i) => (i.did === record.did ? record : i))
      : [...prev.identities, record],
    chain: [...prev.chain, entry],
  });

  const upsertAsset = (
    prev: LedgerState,
    record: AssetRecord,
    entry: AuditEntry
  ): LedgerState => ({
    ...prev,
    assets: prev.assets.some((a) => a.tokenId === record.tokenId)
      ? prev.assets.map((a) => (a.tokenId === record.tokenId ? record : a))
      : [...prev.assets, record],
    chain: [...prev.chain, entry],
  });

  // -- identity actions ---------------------------------------------------

  const createIdentity = useCallback(
    async (input: CreateIdentityInput) => {
      // Guard before doing any network work, so a forbidden call costs nothing.
      AccessControl.requirePermission(requireCaller(), "identity:create");

      const didDocument = IdentityRegistry.draftDidDocument(input);
      const didDocumentCid = await pinJson(didDocument);

      return run<IdentityRecord>(
        (ctx) =>
          IdentityRegistry.registerIdentity(ctx, stateRef.current.identities, {
            address: input.address,
            displayName: input.displayName,
            organization: input.organization,
            role: input.role,
            didDocumentCid,
            alsoKnownAs: input.alsoKnownAs,
          }),
        upsertIdentity
      );
    },
    [pinJson, requireCaller, run]
  );

  const suspendIdentity = useCallback(
    (did: string, reason = "Suspended by administrator") =>
      run<IdentityRecord>(
        (ctx) =>
          IdentityRegistry.suspendIdentity(
            ctx,
            stateRef.current.identities,
            did,
            reason
          ),
        upsertIdentity
      ),
    [run]
  );

  const revokeIdentity = useCallback(
    (did: string, reason = "Revoked by administrator") =>
      run<IdentityRecord>(
        (ctx) =>
          IdentityRegistry.revokeIdentity(
            ctx,
            stateRef.current.identities,
            did,
            reason
          ),
        upsertIdentity
      ),
    [run]
  );

  // -- asset actions ------------------------------------------------------

  const mintAsset = useCallback(
    async (file: File, meta: MintAssetInput) => {
      const caller = requireCaller();
      AccessControl.requirePermission(caller, "asset:mint");

      const ownerDid = meta.ownerDid ?? caller.did;
      // Fail fast on an invalid recipient before uploading anything.
      IdentityRegistry.requireActiveIdentity(
        stateRef.current.identities,
        ownerDid
      );

      const contentHash = await hashFile(file);
      const fileCid = await pinFile(file);
      const sequence = stateRef.current.nextTokenSequence;
      const tokenId = AssetNFT.formatTokenId(sequence);

      const metadata = AssetNFT.buildAssetMetadata({
        name: meta.name,
        description: meta.description,
        assetType: meta.assetType,
        fileCid,
        contentHash,
        ownerDid,
        minterDid: caller.did,
        tokenId,
      });
      const metadataCid = await pinJson(metadata);

      return run<AssetRecord>(
        (ctx) =>
          AssetNFT.mint(ctx, stateRef.current.identities, {
            name: meta.name,
            description: meta.description,
            assetType: meta.assetType,
            contentHash,
            fileCid,
            metadataCid,
            ownerDid,
            sequence,
          }),
        (prev, record, entry) => ({
          ...upsertAsset(prev, record, entry),
          nextTokenSequence: Math.max(prev.nextTokenSequence, sequence) + 1,
        })
      );
    },
    [pinFile, pinJson, requireCaller, run]
  );

  const transferAsset = useCallback(
    (tokenId: string, toDid: string) =>
      run<AssetRecord>(
        (ctx) =>
          AssetNFT.transferFrom(
            ctx,
            stateRef.current.assets,
            stateRef.current.identities,
            tokenId,
            toDid
          ),
        upsertAsset
      ),
    [run]
  );

  const burnAsset = useCallback(
    (tokenId: string, reason = "Retired by owner") =>
      run<AssetRecord>(
        (ctx) => AssetNFT.burn(ctx, stateRef.current.assets, tokenId, reason),
        upsertAsset
      ),
    [run]
  );

  // -- access actions -----------------------------------------------------

  const grantRole = useCallback(
    (did: string, role: Role) =>
      run<IdentityRecord>(
        (ctx) =>
          AccessControl.grantRole(
            ctx,
            stateRef.current.identities,
            did,
            role
          ),
        upsertIdentity
      ),
    [run]
  );

  const revokeRole = useCallback(
    (did: string) =>
      run<IdentityRecord>(
        (ctx) =>
          AccessControl.revokeRole(ctx, stateRef.current.identities, did),
        upsertIdentity
      ),
    [run]
  );

  // -- selectors ----------------------------------------------------------

  const getIdentity = useCallback(
    (did: string) => state.identities.find((i) => i.did === did) ?? null,
    [state.identities]
  );

  const getAsset = useCallback(
    (tokenId: string) => state.assets.find((a) => a.tokenId === tokenId) ?? null,
    [state.assets]
  );

  const listAssetsByOwner = useCallback(
    (ownerDid: string) => state.assets.filter((a) => a.ownerDid === ownerDid),
    [state.assets]
  );

  const verifyAudit = useCallback(
    () => verifyChain(stateRef.current.chain),
    []
  );

  /** Requires `audit:export`, and records the export in the trail itself. */
  const exportAudit = useCallback(async (): Promise<string> => {
    const caller = requireCaller();
    AccessControl.requirePermission(caller, "audit:export");

    const json = exportChain(stateRef.current.chain);

    const ctx = buildCtx();
    const { auditEntry } = await settle(ctx, {
      action: "AUDIT_EXPORTED",
      category: "system",
      target: "audit-trail",
      details: { entries: stateRef.current.chain.length, format: "json" },
    });
    setState((prev) => ({ ...prev, chain: [...prev.chain, auditEntry] }));

    return json;
  }, [buildCtx, requireCaller]);

  const stats = useMemo<LedgerStats>(() => {
    const identitiesByRole: Record<Role, number> = {
      ADMIN: 0,
      MANAGER: 0,
      AUDITOR: 0,
      USER: 0,
    };
    const assetsByType: Record<AssetType, number> = {
      document: 0,
      "design-file": 0,
      firmware: 0,
      certificate: 0,
      license: 0,
      "hardware-passport": 0,
    };

    for (const identity of state.identities) {
      identitiesByRole[identity.role] += 1;
    }
    for (const asset of state.assets) {
      assetsByType[asset.assetType] += 1;
    }

    return {
      totalIdentities: state.identities.length,
      activeIdentities: state.identities.filter((i) => i.status === "active")
        .length,
      suspendedIdentities: state.identities.filter(
        (i) => i.status === "suspended"
      ).length,
      revokedIdentities: state.identities.filter((i) => i.status === "revoked")
        .length,
      totalAssets: state.assets.length,
      activeAssets: state.assets.filter((a) => a.status === "active").length,
      burnedAssets: state.assets.filter((a) => a.status === "burned").length,
      totalTransfers: state.assets.reduce(
        (sum, a) => sum + a.transferHistory.length,
        0
      ),
      auditEntries: state.chain.length,
      onchainEntries: state.chain.filter((e) => e.anchorMode === "onchain")
        .length,
      identitiesByRole,
      assetsByType,
    };
  }, [state]);

  const resetDemo = useCallback(async () => {
    clearAllState();
    const snapshot = await buildSeedSnapshot();
    setState({
      identities: snapshot.identities,
      assets: snapshot.assets,
      chain: snapshot.chain,
      nextTokenSequence: snapshot.nextTokenSequence,
    });
    writeState(StorageKeys.seeded, true);
  }, []);

  const value = useMemo<LedgerContextValue>(
    () => ({
      identities: state.identities,
      assets: state.assets,
      auditChain: state.chain,
      isHydrated,
      isBusy,
      createIdentity,
      suspendIdentity,
      revokeIdentity,
      mintAsset,
      transferAsset,
      burnAsset,
      grantRole,
      revokeRole,
      getIdentity,
      getAsset,
      listAssetsByOwner,
      verifyAudit,
      exportAudit,
      stats,
      resetDemo,
    }),
    [
      state,
      isHydrated,
      isBusy,
      createIdentity,
      suspendIdentity,
      revokeIdentity,
      mintAsset,
      transferAsset,
      burnAsset,
      grantRole,
      revokeRole,
      getIdentity,
      getAsset,
      listAssetsByOwner,
      verifyAudit,
      exportAudit,
      stats,
      resetDemo,
    ]
  );

  return (
    <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
  );
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within a LedgerProvider");
  return ctx;
}

export { ContractRevert };
