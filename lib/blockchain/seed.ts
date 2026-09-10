/**
 * Deterministic demo data.
 *
 * Hydrated on first run so the platform is never empty for a reviewer. Every
 * seeded record is explicitly `anchorMode: "simulated"` and carries a `null`
 * signature — we never present fabricated on-chain proof. The seeded audit
 * chain is built with the real `buildEntry` primitive, so it passes
 * `verifyChain` byte-for-byte.
 */

import { sha256Hex } from "./crypto";
import { didFromAddress } from "./did";
import { buildEntry } from "./ledger";
import type {
  AssetRecord,
  AssetType,
  AuditDraft,
  AuditEntry,
  Did,
  IdentityRecord,
  LedgerSnapshot,
  Role,
} from "./types";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Fixed epoch so seeded data is byte-identical on every machine. */
const T0 = Date.UTC(2025, 0, 6, 4, 30, 0);

const ADDRESSES = {
  admin: "yFngop8VCD9EQagsVeeibmRMChGSbWaeDSQX2oALxgFh",
  managerBlr: "ZtffqoA55Lf6uSnBCfw9b9iymjPTTnTchTqn8vA1Dxuf",
  managerGzb: "d7SmjDuugtWwWZvkm7k18orMx3xELzpspfmFt2q4kqFv",
  auditor: "ysyXNRgkQFanQyxKvRRpxkBiBoFnHGjG61VDUd8iLx2J",
  engineer: "79eh9QcT5Gx3zEogy7hD6fAuZqL6yqTfX8Gne8D22n5U",
} as const;

export const SEED_DIDS = {
  admin: didFromAddress(ADDRESSES.admin),
  managerBlr: didFromAddress(ADDRESSES.managerBlr),
  managerGzb: didFromAddress(ADDRESSES.managerGzb),
  auditor: didFromAddress(ADDRESSES.auditor),
  engineer: didFromAddress(ADDRESSES.engineer),
} as const;

interface SeedIdentitySpec {
  key: keyof typeof ADDRESSES;
  displayName: string;
  organization: string;
  role: Role;
  offset: number;
}

const IDENTITY_SPECS: SeedIdentitySpec[] = [
  {
    key: "admin",
    displayName: "Dr. Ananya Rao",
    organization: "BEL Corporate Office, Bengaluru",
    role: "ADMIN",
    offset: 0,
  },
  {
    key: "managerBlr",
    displayName: "Vikram Iyer",
    organization: "BEL Bengaluru Complex",
    role: "MANAGER",
    offset: 2 * HOUR,
  },
  {
    key: "managerGzb",
    displayName: "Priya Deshmukh",
    organization: "BEL Ghaziabad Unit",
    role: "MANAGER",
    offset: 5 * HOUR,
  },
  {
    key: "auditor",
    displayName: "R. Krishnamurthy",
    organization: "BEL Internal Audit & Compliance",
    role: "AUDITOR",
    offset: 1 * DAY,
  },
  {
    key: "engineer",
    displayName: "Sandeep Nair",
    organization: "BEL Machilipatnam Unit",
    role: "USER",
    offset: 1 * DAY + 3 * HOUR,
  },
];

interface SeedAssetSpec {
  name: string;
  description: string;
  assetType: AssetType;
  owner: keyof typeof ADDRESSES;
  minter: keyof typeof ADDRESSES;
  offset: number;
}

const ASSET_SPECS: SeedAssetSpec[] = [
  {
    name: "Akash SAM Radar Interface Spec v4.2",
    description:
      "Controlled technical specification for the radar-to-launcher interface, released to the Bengaluru integration team.",
    assetType: "document",
    owner: "managerBlr",
    minter: "admin",
    offset: 2 * DAY,
  },
  {
    name: "Coastal Surveillance PCB Layout Rev C",
    description:
      "Gerber and CAD package for the rev-C signal conditioning board of the coastal surveillance system.",
    assetType: "design-file",
    owner: "managerBlr",
    minter: "managerBlr",
    offset: 2 * DAY + 4 * HOUR,
  },
  {
    name: "SDR Baseband Firmware 3.7.1",
    description:
      "Signed baseband firmware image for the software defined radio family, hash-anchored for field verification.",
    assetType: "firmware",
    owner: "managerGzb",
    minter: "managerGzb",
    offset: 3 * DAY,
  },
  {
    name: "MIL-STD-810H Environmental Test Certificate",
    description:
      "Environmental qualification certificate issued after vibration and thermal cycling at the Ghaziabad unit.",
    assetType: "certificate",
    owner: "managerGzb",
    minter: "admin",
    offset: 3 * DAY + 6 * HOUR,
  },
  {
    name: "Encryption Module Deployment Licence",
    description:
      "Site licence authorising deployment of the hardware encryption module at two designated installations.",
    assetType: "license",
    owner: "admin",
    minter: "admin",
    offset: 4 * DAY,
  },
  {
    name: "Thermal Imager TI-9000 Hardware Passport",
    description:
      "Lifecycle passport for thermal imager serial TI9000-0431, tracking custody from assembly to field issue.",
    assetType: "hardware-passport",
    owner: "engineer",
    minter: "managerBlr",
    offset: 4 * DAY + 5 * HOUR,
  },
  {
    name: "Sonar Array Calibration Report Q4",
    description:
      "Quarterly calibration report for the hull mounted sonar array, countersigned by the audit cell.",
    assetType: "document",
    owner: "managerGzb",
    minter: "managerGzb",
    offset: 5 * DAY,
  },
  {
    name: "Composite Radome Mould Drawing A-118",
    description:
      "Tooling drawing for the A-118 composite radome mould, restricted to the Machilipatnam production line.",
    assetType: "design-file",
    owner: "engineer",
    minter: "managerBlr",
    offset: 5 * DAY + 7 * HOUR,
  },
];

function didOf(key: keyof typeof ADDRESSES): Did {
  return didFromAddress(ADDRESSES[key]);
}

/**
 * Builds the seeded snapshot. Async because the audit chain uses real
 * SHA-256; the result is fully deterministic for a given `T0`.
 */
export async function buildSeedSnapshot(): Promise<LedgerSnapshot> {
  const identities: IdentityRecord[] = IDENTITY_SPECS.map((spec) => {
    const address = ADDRESSES[spec.key];
    const createdAt = T0 + spec.offset;
    return {
      did: didFromAddress(address),
      address,
      displayName: spec.displayName,
      organization: spec.organization,
      role: spec.role,
      status: "active",
      didDocumentCid: null,
      createdAt,
      updatedAt: createdAt,
      txSignature: null,
      anchorMode: "simulated",
    };
  });

  const assets: AssetRecord[] = [];
  for (let i = 0; i < ASSET_SPECS.length; i++) {
    const spec = ASSET_SPECS[i];
    const tokenId = `BLKL-${String(i + 1).padStart(6, "0")}`;
    const contentHash = await sha256Hex(`blockledger.seed.asset.${tokenId}`);
    assets.push({
      tokenId,
      name: spec.name,
      description: spec.description,
      assetType: spec.assetType,
      fileCid: null,
      metadataCid: null,
      ownerDid: didOf(spec.owner),
      ownerAddress: ADDRESSES[spec.owner],
      minterDid: didOf(spec.minter),
      contentHash,
      mintedAt: T0 + spec.offset,
      txSignature: null,
      anchorMode: "simulated",
      transferHistory: [],
      status: "active",
    });
  }

  // --- audit drafts, strictly chronological -------------------------------

  const drafts: AuditDraft[] = [];

  drafts.push({
    timestamp: T0 - HOUR,
    actorDid: didOf("admin"),
    actorAddress: ADDRESSES.admin,
    action: "GENESIS",
    category: "system",
    target: "blockledger",
    details: {
      note: "BlockLedger audit trail initialised",
      network: "solana-devnet",
    },
    txSignature: null,
    cid: null,
    anchorMode: "simulated",
  });

  for (const spec of IDENTITY_SPECS) {
    drafts.push({
      timestamp: T0 + spec.offset,
      actorDid: didOf("admin"),
      actorAddress: ADDRESSES.admin,
      action: "IDENTITY_REGISTERED",
      category: "identity",
      target: didOf(spec.key),
      details: {
        displayName: spec.displayName,
        organization: spec.organization,
        role: spec.role,
      },
      txSignature: null,
      cid: null,
      anchorMode: "simulated",
    });
  }

  assets.forEach((asset, i) => {
    const spec = ASSET_SPECS[i];
    drafts.push({
      timestamp: asset.mintedAt,
      actorDid: didOf(spec.minter),
      actorAddress: ADDRESSES[spec.minter],
      action: "ASSET_MINTED",
      category: "asset",
      target: asset.tokenId,
      details: {
        name: asset.name,
        assetType: asset.assetType,
        ownerDid: asset.ownerDid,
        contentHash: asset.contentHash,
      },
      txSignature: null,
      cid: null,
      anchorMode: "simulated",
    });
  });

  // One custody transfer, recorded on both the asset and the trail.
  const transferred = assets[5];
  const transferAt = T0 + 6 * DAY;
  transferred.transferHistory.push({
    from: didOf("managerBlr"),
    to: didOf("engineer"),
    timestamp: transferAt,
    txSignature: null,
    anchorMode: "simulated",
  });
  drafts.push({
    timestamp: transferAt,
    actorDid: didOf("managerBlr"),
    actorAddress: ADDRESSES.managerBlr,
    action: "ASSET_TRANSFERRED",
    category: "asset",
    target: transferred.tokenId,
    details: {
      from: didOf("managerBlr"),
      to: didOf("engineer"),
      name: transferred.name,
    },
    txSignature: null,
    cid: null,
    anchorMode: "simulated",
  });

  drafts.push({
    timestamp: T0 + 6 * DAY + 4 * HOUR,
    actorDid: didOf("admin"),
    actorAddress: ADDRESSES.admin,
    action: "ROLE_GRANTED",
    category: "access",
    target: didOf("auditor"),
    details: {
      previousRole: "USER",
      newRole: "AUDITOR",
      subject: "R. Krishnamurthy",
    },
    txSignature: null,
    cid: null,
    anchorMode: "simulated",
  });

  drafts.push({
    timestamp: T0 + 7 * DAY,
    actorDid: didOf("auditor"),
    actorAddress: ADDRESSES.auditor,
    action: "AUDIT_EXPORTED",
    category: "system",
    target: "audit-trail",
    details: { entries: drafts.length, format: "json" },
    txSignature: null,
    cid: null,
    anchorMode: "simulated",
  });

  let chain: AuditEntry[] = [];
  for (const draft of drafts) {
    chain = [...chain, await buildEntry(chain, draft)];
  }

  return {
    identities,
    assets,
    chain,
    nextTokenSequence: assets.length + 1,
  };
}

/** Convenience for the "reset demo data" control. */
export const SEED_VERSION = "2025.01-bel";
