# Demo Video

## Demo video link

`<PASTE_YOUTUBE_OR_GOOGLE_DRIVE_VIDEO_LINK_HERE>`

## Live deployment

`<PASTE_VERCEL_DEPLOYMENT_URL_HERE>`

## What the video should show

1. The problem — centralised identity, unverifiable access logs, weak asset provenance in a large organisation such as BEL.
2. The proposed solution — DIDs, contract-enforced RBAC, NFT-bound assets, hash-chained audit trail.
3. Main workflow:
   - **ADMIN** registers an identity on `/identity`, DID issued and pinned to IPFS.
   - **MANAGER** mints a digital asset on `/assets`, metadata pinned, asset bound to a DID.
   - **AUDITOR** attempts a role grant on `/access-control` and hits a real contract revert.
   - `/audit` — run **Verify chain**, then tamper with an entry and show the verifier reporting the exact broken index.
4. Real on-chain proof — connect a Solana devnet wallet on `/wallet`, anchor an audit entry, and open the resulting signature in a block explorer.
5. Closing note on what is real versus simulated (see `docs/architecture.md`).

Keep the video focused on the working prototype and make sure reviewers can access it without requesting permission.
