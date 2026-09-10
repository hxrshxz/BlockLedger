/**
 * The hash-chained, append-only audit log.
 *
 * Each entry commits to the previous entry's hash, so mutating any field of
 * any historical entry invalidates that entry's own hash *and* every link
 * after it. `verifyChain` recomputes the whole chain from scratch and is the
 * evidence behind BlockLedger's tamper-evidence claim.
 */

import { sha256Hex } from "./crypto";
import type {
  AuditDraft,
  AuditEntry,
  ChainVerification,
  Hex,
} from "./types";

/** The prevHash of the genesis entry. */
export const GENESIS_PREV_HASH: Hex = `0x${"0".repeat(64)}`;

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/**
 * Deterministic JSON: object keys sorted, no insignificant whitespace,
 * `undefined` dropped. Two structurally equal values always serialise
 * identically, so hashes are reproducible across runs and machines.
 */
export function canonicalJson(value: unknown): string {
  return stringify(value as Json);
}

function stringify(value: Json | undefined): string {
  if (value === undefined) return "null";
  if (value === null) return "null";
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const v = (value as { [k: string]: Json | undefined })[key];
    if (v === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${stringify(v)}`);
  }
  return `{${parts.join(",")}}`;
}

/** The exact bytes committed to by an entry's hash. */
export function entryPreimage(
  entry: Pick<
    AuditEntry,
    "index" | "timestamp" | "actorDid" | "action" | "details" | "prevHash"
  >
): string {
  return [
    String(entry.index),
    String(entry.timestamp),
    entry.actorDid,
    entry.action,
    canonicalJson(entry.details),
    entry.prevHash,
  ].join("|");
}

export async function computeEntryHash(
  entry: Pick<
    AuditEntry,
    "index" | "timestamp" | "actorDid" | "action" | "details" | "prevHash"
  >
): Promise<Hex> {
  return sha256Hex(entryPreimage(entry));
}

/** The hash the next appended entry must link to. */
export function headHash(chain: readonly AuditEntry[]): Hex {
  return chain.length === 0 ? GENESIS_PREV_HASH : chain[chain.length - 1].hash;
}

/**
 * Builds the fully linked entry for `draft` on top of `chain`.
 * Pure — does not mutate `chain`.
 */
export async function buildEntry(
  chain: readonly AuditEntry[],
  draft: AuditDraft
): Promise<AuditEntry> {
  const index = chain.length;
  const timestamp = draft.timestamp ?? Date.now();
  const prevHash = headHash(chain);
  const base = {
    index,
    timestamp,
    actorDid: draft.actorDid,
    actorAddress: draft.actorAddress,
    action: draft.action,
    category: draft.category,
    target: draft.target,
    details: draft.details,
    prevHash,
    txSignature: draft.txSignature ?? null,
    cid: draft.cid ?? null,
    anchorMode: draft.anchorMode,
  };
  const hash = await computeEntryHash(base);
  return { ...base, hash };
}

/** Returns a NEW chain with `draft` appended and hash-linked. */
export async function appendEntry(
  chain: readonly AuditEntry[],
  draft: AuditDraft
): Promise<AuditEntry[]> {
  const entry = await buildEntry(chain, draft);
  return [...chain, entry];
}

/**
 * Recomputes every hash and checks every link.
 * Detects: mutated fields, reordered/renumbered entries, deleted entries,
 * spliced entries and a forged genesis.
 */
export async function verifyChain(
  chain: readonly AuditEntry[]
): Promise<ChainVerification> {
  let prevHash: Hex = GENESIS_PREV_HASH;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];

    if (entry.index !== i) {
      return {
        valid: false,
        brokenAt: i,
        reason: `Entry at position ${i} declares index ${entry.index}`,
      };
    }

    if (entry.prevHash !== prevHash) {
      return {
        valid: false,
        brokenAt: i,
        reason:
          i === 0
            ? "Genesis entry does not link to the zero hash"
            : `Entry ${i} does not link to entry ${i - 1} (broken chain)`,
      };
    }

    if (i > 0 && entry.timestamp < chain[i - 1].timestamp) {
      return {
        valid: false,
        brokenAt: i,
        reason: `Entry ${i} is timestamped before entry ${i - 1}`,
      };
    }

    const expected = await computeEntryHash(entry);
    if (expected !== entry.hash) {
      return {
        valid: false,
        brokenAt: i,
        reason: `Entry ${i} has been tampered with (hash mismatch)`,
      };
    }

    prevHash = entry.hash;
  }

  return { valid: true };
}

export interface ChainExport {
  format: "blockledger-audit-chain";
  version: 1;
  exportedAt: string;
  entryCount: number;
  headHash: Hex;
  entries: AuditEntry[];
}

/** Pretty JSON for the "export audit trail" action. */
export function exportChain(chain: readonly AuditEntry[]): string {
  const payload: ChainExport = {
    format: "blockledger-audit-chain",
    version: 1,
    exportedAt: new Date().toISOString(),
    entryCount: chain.length,
    headHash: headHash(chain),
    entries: [...chain],
  };
  return JSON.stringify(payload, null, 2);
}
