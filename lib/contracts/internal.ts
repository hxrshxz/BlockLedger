/**
 * Shared plumbing for the simulated contracts: anchor the state transition on
 * Solana, then hash-link an audit entry describing it. Every mutating
 * contract call funnels through `settle` so the audit trail is uniform.
 */

import { sha256Hex } from "@/lib/blockchain/crypto";
import { buildEntry, canonicalJson } from "@/lib/blockchain/ledger";
import type {
  AuditAction,
  AuditCategory,
  AuditDetails,
  AuditEntry,
  Cid,
  ContractCallContext,
  TxReceipt,
} from "@/lib/blockchain/types";

export interface SettleInput {
  action: AuditAction;
  category: AuditCategory;
  target: string;
  details: AuditDetails;
  cid?: Cid | null;
}

export interface Settled {
  auditEntry: AuditEntry;
  receipt: TxReceipt;
}

/**
 * Anchors a digest of the transition on-chain and returns the linked audit
 * entry. Only a hash and a short ref are anchored — the SPL memo program
 * rejects payloads above 80 bytes.
 */
export async function settle(
  ctx: ContractCallContext,
  input: SettleInput
): Promise<Settled> {
  const now = ctx.now ?? Date.now;
  const timestamp = now();

  const stateHash = await sha256Hex(
    canonicalJson({
      action: input.action,
      target: input.target,
      details: input.details,
      actor: ctx.caller.did,
      timestamp,
    })
  );

  const receipt = await ctx.anchor({
    action: input.action,
    hash: stateHash,
    ref: input.target,
  });

  const auditEntry = await buildEntry(ctx.chain, {
    timestamp,
    actorDid: ctx.caller.did,
    actorAddress: ctx.caller.address,
    action: input.action,
    category: input.category,
    target: input.target,
    details: { ...input.details, stateHash },
    txSignature: receipt.signature,
    cid: input.cid ?? null,
    anchorMode: receipt.anchorMode,
  });

  return { auditEntry, receipt };
}
