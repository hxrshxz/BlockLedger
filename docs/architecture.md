# System Architecture

## High-level flow

```text
User + Solana Wallet (Phantom / Solflare)
  |
  v
Next.js Frontend (App Router, React 19)
  |
  v
React Context Layer
  (AuthContext / ChainContext / LedgerContext / StorageContext)
  |
  v
Contract Layer  ── lib/contracts/
  |
  +--> AccessControl    -- role and permission checks, reverts on failure
  +--> IdentityRegistry -- DID registration, resolution, revocation
  +--> AssetNFT         -- minting, ownership, transfer history
  |
  v
Blockchain Core ── lib/blockchain/
  |
  +--> did.ts        -- did:blkl:sol:<pubkey> derivation, DID Documents
  +--> crypto.ts     -- SHA-256 hashing (Web Crypto API)
  +--> ledger.ts     -- hash-chained append-only audit log + verifier
  +--> persistence.ts -- local state persistence
  |
  +----------------> IPFS (Pinata)      -- DID Documents, NFT metadata
  |
  +----------------> Solana Devnet      -- signed memo transaction anchors
```

## Components

### Frontend (`app/`, `components/`)
Next.js App Router pages for the landing site and the authenticated console: dashboard, identity, assets, access control, audit, wallet and settings. Route access is guarded by `ProtectedRoute`, which checks the caller's role against the same permission matrix the contract layer enforces.

### Context layer (`contexts/`)
- `AuthContext` — current user, DID, role, demo persona switching.
- `ChainContext` — Solana connection state and anchoring mode.
- `LedgerContext` — the audit ledger and its verification state.
- `StorageContext` — IPFS pinning state.

### Contract layer (`lib/contracts/`)
A TypeScript implementation of three contracts with a strict, revert-on-failure API. Unauthorised or invalid calls throw explicit Solidity-style errors, for example:

```text
AccessControl: account yFngop…xgFh with role AUDITOR_ROLE
  is missing permission role:grant

IdentityRegistry: DID already registered
```

Because the API reverts rather than returning a status, a caller cannot bypass a check by ignoring a return value.

**This layer is simulated.** It runs in the browser rather than as a deployed program, so the prototype needs no contract deployment. Enforcement logic and error semantics mirror what an on-chain program would do.

### Identity (`lib/blockchain/did.ts`)
Each user is issued a DID of the form `did:blkl:sol:<publicKey>`, derived from their Solana wallet public key. A W3C-conformant DID Document containing a verification method is generated and pinned to IPFS, making the identity record content-addressed and tamper-evident.

### Asset registry (`lib/contracts/AssetNFT.ts`)
Assets are minted as ERC-721-style tokens (`BLKL-000123`) bound to an owner DID. Metadata commits to a SHA-256 digest of the underlying file and is pinned to IPFS. Transfers append to a retained ownership history.

### Audit ledger (`lib/blockchain/ledger.ts`)
Every state-changing action appends an entry that commits to the hash of its predecessor:

```text
entry[n].hash = SHA256( entry[n].payload || entry[n-1].hash )
```

`verifyChain()` walks the chain and recomputes each hash. Any field mutation, entry reordering, entry deletion or actor forgery breaks the linkage, and the verifier returns the exact `brokenAt` index.

### On-chain anchoring (`hooks/useSolanaAction.ts`)
**Real.** When a Solana wallet is connected, an audit entry is anchored by submitting a signed memo transaction to the Solana devnet. The returned signature is stored on the entry and linked to a block explorer.

### Decentralised storage (`hooks/useIpfs.ts`)
**Real.** DID Documents and NFT metadata are pinned to IPFS through Pinata, returning genuine content identifiers (CIDs).

## Real vs simulated

| Component | Status |
|---|---|
| Solana wallet connection | Real |
| Audit anchoring via devnet memo transactions | Real |
| IPFS pinning via Pinata | Real |
| DID derivation and DID Documents | Real |
| Hash chaining and chain verification | Real |
| Contract layer (AccessControl / IdentityRegistry / AssetNFT) | Simulated in TypeScript |
| Authentication (demo credentials) | Simulated |

Every ledger record carries an `anchorMode` field of `onchain` or `simulated` and is badged accordingly in the UI. Transaction signatures and IPFS CIDs are never fabricated — if an operation was not anchored or pinned, the record says so.

## Data flow example: minting an asset

```text
1. MANAGER submits the mint form
2. AccessControl.requirePermission(caller, "asset:mint")
     -> reverts if the caller's role lacks the permission
3. SHA-256 digest computed over the asset file
4. NFT metadata assembled and pinned to IPFS  -> real CID
5. AssetNFT.mint(ownerDid, tokenId, cid, digest)
6. Audit entry appended, hash-linked to the previous entry
7. If a wallet is connected: memo transaction signed and sent
     to Solana devnet  -> real signature, anchorMode = "onchain"
   Otherwise:            anchorMode = "simulated"
8. UI updates with the token, its CID and its anchor badge
```
