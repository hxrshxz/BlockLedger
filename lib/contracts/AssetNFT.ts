/**
 * AssetNFT — ERC-721-flavoured ownership of digital assets.
 *
 * Ownership is expressed in DIDs rather than raw addresses so that transfers
 * are constrained to identities the IdentityRegistry currently considers
 * active. Token ids are monotonic and rendered `BLKL-000123`.
 */

import { ipfsUri } from "@/lib/blockchain/explorer";
import type {
  AssetMetadata,
  AssetRecord,
  AssetType,
  Cid,
  ContractCallContext,
  ContractCallResult,
  Did,
  Hex,
  IdentityRecord,
} from "@/lib/blockchain/types";
import { requirePermission, requirePermissionOn } from "./AccessControl";
import { requireActiveIdentity, requireIdentity } from "./IdentityRegistry";
import { ContractRevert } from "./errors";
import { settle } from "./internal";

export const TOKEN_PREFIX = "BLKL";

export function formatTokenId(sequence: number): string {
  return `${TOKEN_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function parseTokenSequence(tokenId: string): number {
  const m = /^BLKL-(\d{6})$/.exec(tokenId);
  return m ? Number(m[1]) : NaN;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export function tokenExists(
  assets: readonly AssetRecord[],
  tokenId: string
): boolean {
  return assets.some((a) => a.tokenId === tokenId);
}

export function requireToken(
  assets: readonly AssetRecord[],
  tokenId: string
): AssetRecord {
  const token = assets.find((a) => a.tokenId === tokenId);
  if (!token) throw ContractRevert.tokenDoesNotExist(tokenId);
  return token;
}

export function ownerOf(
  assets: readonly AssetRecord[],
  tokenId: string
): Did {
  const token = requireToken(assets, tokenId);
  if (token.status === "burned") throw ContractRevert.tokenBurned(tokenId);
  return token.ownerDid;
}

export function balanceOf(
  assets: readonly AssetRecord[],
  ownerDid: string
): number {
  return assets.filter((a) => a.ownerDid === ownerDid && a.status === "active")
    .length;
}

export function tokensOf(
  assets: readonly AssetRecord[],
  ownerDid: string
): AssetRecord[] {
  return assets.filter((a) => a.ownerDid === ownerDid);
}

/** `ipfs://<metadataCid>` — null while the metadata has not been pinned. */
export function tokenURI(
  assets: readonly AssetRecord[],
  tokenId: string
): string | null {
  const token = requireToken(assets, tokenId);
  return ipfsUri(token.metadataCid);
}

/** Permission-checked read, honouring USER `own`-scope. */
export function viewAsset(
  ctx: Pick<ContractCallContext, "caller">,
  assets: readonly AssetRecord[],
  tokenId: string
): AssetRecord {
  const token = requireToken(assets, tokenId);
  requirePermissionOn(ctx.caller, "asset:view", token.ownerDid);
  return token;
}

/** ERC-721 metadata document for an asset, ready to pin to IPFS. */
export function buildAssetMetadata(input: {
  name: string;
  description: string;
  assetType: AssetType;
  fileCid: Cid | null;
  contentHash: Hex;
  ownerDid: Did;
  minterDid: Did;
  tokenId: string;
}): AssetMetadata {
  return {
    name: input.name,
    description: input.description,
    image: ipfsUri(input.fileCid) ?? "",
    external_url: `https://blockledger.io/assets/${input.tokenId}`,
    attributes: [
      { trait_type: "Asset Type", value: input.assetType },
      { trait_type: "Token ID", value: input.tokenId },
      { trait_type: "Content Hash", value: input.contentHash },
      { trait_type: "Minted By", value: input.minterDid },
      { trait_type: "Owner", value: input.ownerDid },
      { trait_type: "Registry", value: "BlockLedger AssetNFT" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface MintInput {
  name: string;
  description: string;
  assetType: AssetType;
  contentHash: Hex;
  fileCid?: Cid | null;
  metadataCid?: Cid | null;
  /** Defaults to the caller. Must be an active registered identity. */
  ownerDid?: Did;
  /** Next sequence number; the caller owns the counter. */
  sequence: number;
}

export async function mint(
  ctx: ContractCallContext,
  identities: readonly IdentityRecord[],
  input: MintInput
): Promise<ContractCallResult<AssetRecord>> {
  requirePermission(ctx.caller, "asset:mint");
  if (!input.contentHash) throw ContractRevert.emptyContentHash();

  const ownerDid = input.ownerDid ?? ctx.caller.did;
  const owner = requireActiveIdentity(identities, ownerDid);
  requireActiveIdentity(identities, ctx.caller.did);

  const tokenId = formatTokenId(input.sequence);
  const now = ctx.now ?? Date.now;
  const mintedAt = now();

  const { auditEntry, receipt } = await settle(ctx, {
    action: "ASSET_MINTED",
    category: "asset",
    target: tokenId,
    details: {
      name: input.name,
      assetType: input.assetType,
      ownerDid,
      contentHash: input.contentHash,
      fileCid: input.fileCid ?? null,
      metadataCid: input.metadataCid ?? null,
    },
    cid: input.metadataCid ?? input.fileCid ?? null,
  });

  const record: AssetRecord = {
    tokenId,
    name: input.name,
    description: input.description,
    assetType: input.assetType,
    fileCid: input.fileCid ?? null,
    metadataCid: input.metadataCid ?? null,
    ownerDid,
    ownerAddress: owner.address,
    minterDid: ctx.caller.did,
    contentHash: input.contentHash,
    mintedAt,
    txSignature: receipt.signature,
    anchorMode: receipt.anchorMode,
    transferHistory: [],
    status: "active",
  };

  return { result: record, auditEntry, receipt };
}

export async function transferFrom(
  ctx: ContractCallContext,
  assets: readonly AssetRecord[],
  identities: readonly IdentityRecord[],
  tokenId: string,
  toDid: string
): Promise<ContractCallResult<AssetRecord>> {
  requirePermission(ctx.caller, "asset:transfer");

  const token = requireToken(assets, tokenId);
  if (token.status === "burned") throw ContractRevert.tokenBurned(tokenId);

  // Only the current owner may move a token; ADMIN retains custodial override.
  if (token.ownerDid !== ctx.caller.did && ctx.caller.role !== "ADMIN") {
    throw ContractRevert.notOwnerNorApproved();
  }
  if (token.ownerDid === toDid) throw ContractRevert.transferToSelf();

  const recipient = requireIdentity(identities, toDid);
  if (recipient.status !== "active") {
    throw ContractRevert.invalidReceiver(toDid);
  }

  const now = ctx.now ?? Date.now;
  const timestamp = now();

  const { auditEntry, receipt } = await settle(ctx, {
    action: "ASSET_TRANSFERRED",
    category: "asset",
    target: tokenId,
    details: {
      from: token.ownerDid,
      to: toDid,
      name: token.name,
    },
  });

  const updated: AssetRecord = {
    ...token,
    ownerDid: recipient.did,
    ownerAddress: recipient.address,
    transferHistory: [
      ...token.transferHistory,
      {
        from: token.ownerDid,
        to: recipient.did,
        timestamp,
        txSignature: receipt.signature,
        anchorMode: receipt.anchorMode,
      },
    ],
  };

  return { result: updated, auditEntry, receipt };
}

export async function burn(
  ctx: ContractCallContext,
  assets: readonly AssetRecord[],
  tokenId: string,
  reason: string
): Promise<ContractCallResult<AssetRecord>> {
  requirePermission(ctx.caller, "asset:burn");

  const token = requireToken(assets, tokenId);
  if (token.status === "burned") throw ContractRevert.tokenBurned(tokenId);
  if (token.ownerDid !== ctx.caller.did && ctx.caller.role !== "ADMIN") {
    throw ContractRevert.notOwnerNorApproved();
  }

  const { auditEntry, receipt } = await settle(ctx, {
    action: "ASSET_BURNED",
    category: "asset",
    target: tokenId,
    details: { reason, name: token.name, owner: token.ownerDid },
  });

  const updated: AssetRecord = { ...token, status: "burned" };
  return { result: updated, auditEntry, receipt };
}
