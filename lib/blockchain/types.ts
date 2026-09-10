/**
 * BlockLedger — domain vocabulary.
 *
 * Every type in this file is shared by the simulated contract layer
 * (`lib/contracts/*`) and the React state layer (`contexts/*`).
 * Nothing here touches browser APIs, so it is safe to import from
 * server components and from Node scripts.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** A base58 Solana public key, e.g. `7xKX…gAsU`. */
export type Address = string;

/** A base58 Solana transaction signature. */
export type TxSignature = string;

/** An IPFS content identifier (CIDv1 as returned by Pinata). */
export type Cid = string;

/** A lowercase hex digest prefixed with `0x`. */
export type Hex = string;

/** BlockLedger DID method: `did:blkl:sol:<solana-address>`. */
export type Did = `did:blkl:sol:${string}`;

/** Solana cluster the app is anchoring against. */
export type Cluster = "devnet" | "testnet" | "mainnet-beta";

/**
 * Whether a record's state transition was really written to Solana
 * (`onchain`) or only recorded locally because no wallet was connected
 * (`simulated`). The UI must badge these differently — we never present a
 * simulated record as if it were anchored.
 */
export type AnchorMode = "onchain" | "simulated";

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export type Role = "ADMIN" | "MANAGER" | "AUDITOR" | "USER";

export type Permission =
  | "identity:create"
  | "identity:revoke"
  | "identity:view"
  | "asset:mint"
  | "asset:transfer"
  | "asset:burn"
  | "asset:view"
  | "role:grant"
  | "role:revoke"
  | "audit:view"
  | "audit:export"
  | "settings:manage";

/** Whether a permission applies to the caller's own records or to every record. */
export type PermissionScope = "own" | "all";

// ---------------------------------------------------------------------------
// Transaction receipts
// ---------------------------------------------------------------------------

export interface TxReceipt {
  /** `null` in `simulated` mode. We never fabricate a signature. */
  signature: TxSignature | null;
  /** Unix seconds. Locally generated in simulated mode. */
  blockTime: number;
  /** `null` in simulated mode — we do not know the slot without an RPC. */
  slot: number | null;
  anchorMode: AnchorMode;
  /** `null` in simulated mode, since there is nothing to link to. */
  explorerUrl: string | null;
  cluster: Cluster;
  /** Present when anchoring failed and we fell back to simulated mode. */
  error?: string;
}

/**
 * The compact object handed to `ChainContext.anchor`. The SPL memo program
 * used by `useSolanaAction` hard-fails above 80 bytes, so we only ever anchor
 * a digest plus a short discriminator — never the full record.
 */
export interface AnchorPayload {
  action: AuditAction;
  /** SHA-256 of the canonical record being anchored. */
  hash: Hex;
  /** Optional short reference, e.g. a token id. Truncated when serialised. */
  ref?: string;
}

// ---------------------------------------------------------------------------
// Decentralized identifiers (W3C DID Core shaped)
// ---------------------------------------------------------------------------

export interface VerificationMethod {
  id: string;
  type: "Ed25519VerificationKey2020";
  controller: Did;
  publicKeyBase58: string;
}

export interface DidService {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface DidDocument {
  "@context": string[];
  id: Did;
  controller: Did;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  created: string;
  updated: string;
  /** BlockLedger extension — human handles, org URIs, employee ids. */
  alsoKnownAs: string[];
  /** BlockLedger extension — resolvable endpoints for this identity. */
  service: DidService[];
}

export type IdentityStatus = "active" | "suspended" | "revoked";

export interface IdentityRecord {
  did: Did;
  address: Address;
  displayName: string;
  organization: string;
  role: Role;
  status: IdentityStatus;
  didDocumentCid: Cid | null;
  createdAt: number;
  updatedAt: number;
  txSignature: TxSignature | null;
  anchorMode: AnchorMode;
}

// ---------------------------------------------------------------------------
// Digital assets (ERC-721 metadata shaped)
// ---------------------------------------------------------------------------

export type AssetType =
  | "document"
  | "design-file"
  | "firmware"
  | "certificate"
  | "license"
  | "hardware-passport";

export interface AssetAttribute {
  trait_type: string;
  value: string | number;
}

export interface AssetMetadata {
  name: string;
  description: string;
  /** IPFS URI of the underlying artefact. */
  image: string;
  external_url: string;
  attributes: AssetAttribute[];
}

export interface TransferEvent {
  from: Did;
  to: Did;
  timestamp: number;
  txSignature: TxSignature | null;
  anchorMode: AnchorMode;
}

export type AssetStatus = "active" | "burned";

export interface AssetRecord {
  /** Monotonic, formatted `BLKL-000123`. */
  tokenId: string;
  name: string;
  description: string;
  assetType: AssetType;
  fileCid: Cid | null;
  metadataCid: Cid | null;
  ownerDid: Did;
  ownerAddress: Address;
  minterDid: Did;
  /** SHA-256 of the uploaded file bytes — the integrity proof. */
  contentHash: Hex;
  mintedAt: number;
  txSignature: TxSignature | null;
  anchorMode: AnchorMode;
  transferHistory: TransferEvent[];
  status: AssetStatus;
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export type AuditCategory = "identity" | "asset" | "access" | "system";

export type AuditAction =
  | "GENESIS"
  | "IDENTITY_REGISTERED"
  | "IDENTITY_UPDATED"
  | "IDENTITY_SUSPENDED"
  | "IDENTITY_REVOKED"
  | "ASSET_MINTED"
  | "ASSET_TRANSFERRED"
  | "ASSET_BURNED"
  | "ROLE_GRANTED"
  | "ROLE_REVOKED"
  | "AUDIT_EXPORTED"
  | "SETTINGS_UPDATED";

/** Free-form, JSON-serialisable detail bag. Canonicalised before hashing. */
export type AuditDetails = Record<string, string | number | boolean | null>;

export interface AuditEntry {
  index: number;
  timestamp: number;
  actorDid: Did;
  actorAddress: Address;
  action: AuditAction;
  category: AuditCategory;
  /** DID, token id, or other subject of the action. */
  target: string;
  details: AuditDetails;
  prevHash: Hex;
  hash: Hex;
  txSignature?: TxSignature | null;
  cid?: Cid | null;
  anchorMode: AnchorMode;
}

/** Everything an entry needs except the chain-derived fields. */
export type AuditDraft = Omit<
  AuditEntry,
  "index" | "prevHash" | "hash" | "timestamp"
> & { timestamp?: number };

export interface ChainVerification {
  valid: boolean;
  brokenAt?: number;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Contract call plumbing
// ---------------------------------------------------------------------------

export interface Caller {
  did: Did;
  address: Address;
  role: Role;
}

/**
 * Injected into every mutating contract call so that the contract can
 * (a) authorise the caller, (b) hash-link its audit entry against the live
 * chain and (c) anchor the transition on Solana — without the contract layer
 * importing React.
 */
export interface ContractCallContext {
  caller: Caller;
  chain: AuditEntry[];
  anchor: (payload: AnchorPayload) => Promise<TxReceipt>;
  /** Overridable clock, so `seed.ts` can build a deterministic chain. */
  now?: () => number;
}

export interface ContractCallResult<T> {
  result: T;
  auditEntry: AuditEntry;
  receipt: TxReceipt;
}

// ---------------------------------------------------------------------------
// Aggregate state
// ---------------------------------------------------------------------------

export interface LedgerStats {
  totalIdentities: number;
  activeIdentities: number;
  suspendedIdentities: number;
  revokedIdentities: number;
  totalAssets: number;
  activeAssets: number;
  burnedAssets: number;
  totalTransfers: number;
  auditEntries: number;
  onchainEntries: number;
  identitiesByRole: Record<Role, number>;
  assetsByType: Record<AssetType, number>;
}

export interface LedgerSnapshot {
  identities: IdentityRecord[];
  assets: AssetRecord[];
  chain: AuditEntry[];
  nextTokenSequence: number;
}
