/**
 * The `did:blkl:sol` method — a DID whose method-specific identifier is the
 * controller's Solana address, so resolution is trivially verifiable against
 * the chain.
 */

import type { Address, Did, DidDocument, DidService } from "./types";

export const DID_PREFIX = "did:blkl:sol:" as const;

/** Solana base58 addresses are 32–44 chars from the base58 alphabet. */
const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function didFromAddress(address: Address): Did {
  const trimmed = address.trim();
  if (!trimmed) throw new Error("did: address is empty");
  return `${DID_PREFIX}${trimmed}`;
}

export function addressFromDid(did: string): Address {
  if (!isDid(did)) throw new Error(`did: malformed identifier "${did}"`);
  return did.slice(DID_PREFIX.length);
}

export function isDid(v: unknown): v is Did {
  if (typeof v !== "string" || !v.startsWith(DID_PREFIX)) return false;
  return ADDRESS_RE.test(v.slice(DID_PREFIX.length));
}

/** True for a syntactically plausible Solana address. */
export function isAddress(v: unknown): v is Address {
  return typeof v === "string" && ADDRESS_RE.test(v);
}

export interface BuildDidDocumentOptions {
  /** Base58 Ed25519 public key. Defaults to the address itself. */
  publicKeyBase58?: string;
  /** Human handles / employee ids / org URIs. */
  alsoKnownAs?: string[];
  service?: DidService[];
  created?: number;
  updated?: number;
}

export function buildDidDocument(
  address: Address,
  opts: BuildDidDocumentOptions = {}
): DidDocument {
  const id = didFromAddress(address);
  const createdIso = new Date(opts.created ?? Date.now()).toISOString();
  const updatedIso = new Date(
    opts.updated ?? opts.created ?? Date.now()
  ).toISOString();
  const keyId = `${id}#key-1`;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id,
    controller: id,
    verificationMethod: [
      {
        id: keyId,
        type: "Ed25519VerificationKey2020",
        controller: id,
        publicKeyBase58: opts.publicKeyBase58 ?? address,
      },
    ],
    authentication: [keyId],
    created: createdIso,
    updated: updatedIso,
    alsoKnownAs: opts.alsoKnownAs ?? [],
    service: opts.service ?? [
      {
        id: `${id}#blockledger`,
        type: "BlockLedgerRegistry",
        serviceEndpoint: "https://blockledger.io/resolve",
      },
    ],
  };
}
