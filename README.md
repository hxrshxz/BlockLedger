# BlockLedger — Blockchain-Based Secure Platform for Identity, Access Control and Digital Asset Management

## 1. Project Information

- **Project Title:** BlockLedger — Blockchain-Based Secure Platform for Identity, Access Control and Digital Asset Management
- **PS ID:** 26125
- **PS Title:** Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management
- **Organisation:** Bharat Electronics Limited (BEL)
- **Category:** Software
- **Theme:** Blockchain & Cybersecurity

## 2. Problem Statement

Defence and public-sector organisations such as BEL run identity and asset management on centralised directories and document stores. That design has three structural weaknesses:

1. **Single point of failure.** One compromised directory administrator can mint, escalate or delete any identity in the organisation. There is no independent record of what happened, because the same administrator controls the log.
2. **Identity theft and impersonation.** Credentials are bearer secrets held by a central party. Whoever obtains the store obtains every identity in it.
3. **Unverifiable asset provenance.** A drawing, firmware image or certificate can be modified after approval, and a downstream consumer has no cryptographic way to prove which bytes were the approved ones.

An auditor therefore cannot independently prove that a log has not been altered after the fact.

## 3. Proposed Solution

BlockLedger replaces the trusted central record with cryptographic evidence:

- Every actor is a **decentralised identifier** (`did:blkl:sol:<pubkey>`) with a W3C DID Document, controlled by a keypair rather than by a directory row. The DID Document is pinned to IPFS, so the identity record is content-addressed and cannot be silently edited.
- Every asset is a **non-fungible token** (`BLKL-000123`) whose metadata commits to a SHA-256 digest of the underlying file. Change one byte and the digest no longer matches.
- Every privileged action is gated by a **contract-style permission check** that reverts with an explicit, Solidity-style reason instead of silently succeeding.
- Every state change appends to a **hash-chained audit log** in which each entry commits to the previous one, so retroactive edits are detectable in a single pass. Entries are anchored to the **Solana devnet** as real signed memo transactions when a wallet is connected.

### Honesty note on the prototype

This is a hackathon prototype and the repository is explicit about what is real versus simulated:

- **Real:** Solana devnet wallet connection, real signed memo transactions used to anchor audit entries (`hooks/useSolanaAction.ts`), and real IPFS pinning via Pinata (`hooks/useIpfs.ts`).
- **Simulated:** the smart-contract layer itself is implemented in TypeScript (`lib/contracts/`) rather than deployed to a chain, so the demo runs with no contract deployment and no additional infrastructure.

Every record carries an `anchorMode` field of either `onchain` or `simulated` and is badged truthfully in the UI. **No transaction signature or IPFS CID is ever fabricated.**

## 4. Key Features

| Pillar | What BlockLedger does |
|---|---|
| Decentralised identity | Registers, resolves, revokes and reactivates DIDs. Each identity has a W3C-shaped DID Document with a verification method derived from its public key, pinned to IPFS. |
| NFT-based asset ownership | Mints an ERC-721-style token per asset, with an owner DID, a content digest, and IPFS-pinned metadata. Supports transfer with retained ownership history. |
| Smart-contract governance | `IdentityRegistry`, `AssetNFT` and `AccessControl` expose a strict, revert-on-failure API. A caller cannot bypass a check by ignoring a return value. |
| Role-based access control | Four roles (`ADMIN`, `MANAGER`, `AUDITOR`, `USER`) mapped through an explicit permission matrix. Route-level guards enforce the same matrix in the UI. |
| Immutable audit trail | Append-only, hash-linked log of every mutation, with one-click integrity verification that reports the exact index at which the chain breaks. |
| Tamper detection | Detects field mutation, entry reordering, entry deletion and actor forgery, and reports the exact broken index. |
| On-chain anchoring | Anchors audit entries to Solana devnet as real signed memo transactions, linked to a block explorer. |

## 5. Technology Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling / UI:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **Blockchain:** Solana (devnet), `@solana/web3.js`, Solana Wallet Adapter
- **Decentralised storage:** IPFS via Pinata
- **Identity:** W3C Decentralized Identifiers (DID)
- **Cryptography:** SHA-256 hash chaining (Web Crypto API)
- **Deployment:** Vercel

## 6. Architecture

See [docs/architecture.md](docs/architecture.md).

```text
User + Solana Wallet
  |
  v
Next.js Frontend (App Router)
  |  /dashboard /identity /assets /access-control /audit /wallet
  v
Contract Layer  (AccessControl / IdentityRegistry / AssetNFT)
  |
  +----> Identity Registry ------> DID Document ----> IPFS (Pinata)
  |
  +----> Asset Registry ---------> NFT Metadata ----> IPFS (Pinata)
  |
  v
Hash-Chained Audit Ledger
  |
  v
Solana Devnet Anchor (signed memo transaction)
```

## 7. Repository Structure

```text
BlockLedger/
├── README.md
├── SUBMISSION_GUIDE.md
├── submission/
│   ├── PRESENTATION.md
│   └── DEMO.md
├── app/                      # Next.js App Router pages
│   ├── page.tsx              # Landing page
│   ├── dashboard/
│   ├── identity/
│   ├── assets/
│   ├── access-control/
│   ├── audit/
│   ├── wallet/
│   ├── settings/
│   ├── login/
│   └── signup/
├── lib/
│   ├── blockchain/           # DID, hash chaining, ledger, persistence, seed
│   └── contracts/            # AccessControl / IdentityRegistry / AssetNFT
├── contexts/                 # Auth, Chain, Ledger, Storage providers
├── hooks/                    # useSolanaAction (real devnet), useIpfs (real Pinata)
├── components/
├── docs/
│   └── architecture.md
├── assets/
│   └── screenshots/
├── package.json
├── .gitignore
└── LICENSE
```

### What goes where?

| Item | Location |
|---|---|
| Source code | `app/`, `lib/`, `components/`, `contexts/`, `hooks/` |
| Architecture / technical documentation | `docs/` |
| Project screenshots | `assets/screenshots/` |
| Final PPT / presentation | `submission/` |
| Demo video link | `submission/DEMO.md` |
| Project overview | `README.md` |

## 8. Final Presentation

See [submission/PRESENTATION.md](submission/PRESENTATION.md).

## 9. Demo Video

See [submission/DEMO.md](submission/DEMO.md).

## 10. Screenshots

Screenshots are in [`assets/screenshots/`](assets/screenshots/).

![BlockLedger landing page](assets/screenshots/01-landing.png)

## 11. Installation

```bash
git clone <YOUR_REPOSITORY_URL>
cd BlockLedger
npm install
```

> This project uses **npm**. `package-lock.json` is the only lockfile — do not mix in `pnpm` or `yarn`.

### Environment variables

Create a `.env.local` file to enable IPFS pinning. The application runs without it, but pinning will be disabled and records will be marked as simulated.

```bash
NEXT_PUBLIC_PINATA_JWT=<your_pinata_jwt>
```

No smart contract needs to be deployed and no other API keys are required.

## 12. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

All demo accounts use the password `password123`.

| Email | Role | Name |
|---|---|---|
| `admin@blockledger.io` | ADMIN | Dr. Ananya Rao |
| `manager@blockledger.io` | MANAGER | Vikram Iyer |
| `auditor@blockledger.io` | AUDITOR | R. Krishnamurthy |
| `user@blockledger.io` | USER | Sandeep Nair |

> These are seeded demo credentials for a local prototype only. They are not real accounts and grant no access to any live system.

### Suggested review flow

1. Sign in as **ADMIN** → register a new identity on `/identity` and watch the DID get issued and pinned.
2. Switch to **MANAGER** → mint a digital asset on `/assets`, then open its detail page to see the DID binding and IPFS metadata.
3. Switch to **AUDITOR** → attempt to grant a role on `/access-control` and observe the real contract revert.
4. Go to `/audit` → run **Verify chain**, then use the tamper controls to break the chain and confirm the verifier reports the exact broken index.
5. Connect a Solana devnet wallet on `/wallet` to anchor new audit entries as real on-chain memo transactions.

## 13. Future Scope

- Deploy the contract layer as real Solana programs (Anchor) so enforcement moves fully on-chain.
- Replace demo credentials with wallet-native, signature-based authentication.
- Add Verifiable Credentials on top of the DID layer for cross-organisation attestations.
- Support hardware wallets and HSM-backed keys for ADMIN accounts.
- Batch and Merkle-root audit anchoring to reduce transaction cost at scale.
- Integrate with existing enterprise directories (LDAP / Active Directory) for phased migration.

## 14. Team

**Team name:** Mercury
**Institute:** Netaji Subhas University of Technology (NSUT)

| Name | Role |
|---|---|
| **Harsh** *(Team Leader)* | Full-stack lead, system architecture |
| **Anushka** | Blockchain integration, Solana devnet anchoring |
| **Sanyyam** | Contract layer, identity registry and RBAC |
| **Prakhar** | Frontend engineering, UI implementation |
| **Zoya** | Cryptography, hash-chained audit ledger |
| **Shauryan** | IPFS / decentralised storage, deployment and QA |

Harsh and Anushka are Smart India Hackathon 2025 winners.

## Important

This repository contains no passwords, API keys, access tokens or `.env` files. The demo account credentials listed above are seeded local prototype data and are intentionally public.

## License

Released under the [MIT License](LICENSE).
