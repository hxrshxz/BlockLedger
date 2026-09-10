# SIH 2026 Submission Guide

Reference notes for the **BlockLedger** repository (PS ID 26125).

## Repository structure

```text
BlockLedger/
├── README.md
├── SUBMISSION_GUIDE.md
├── submission/
│   ├── PRESENTATION.md
│   └── DEMO.md
├── app/
├── lib/
├── components/
├── contexts/
├── hooks/
├── docs/
├── assets/
│   └── screenshots/
├── package.json
├── .gitignore
└── LICENSE
```

## Presentation

The final presentation is in [`submission/PRESENTATION.md`](submission/PRESENTATION.md), with the PPTX, PDF and a Google Drive link.

## Demo video

See [`submission/DEMO.md`](submission/DEMO.md).

## Screenshots

Screenshots live in `assets/screenshots/`. See the naming convention in `assets/screenshots/README.md`.

## Do not upload

- Passwords
- API keys (including `NEXT_PUBLIC_PINATA_JWT`)
- Access tokens
- `.env` / `.env.local` files
- Private wallet keypairs or seed phrases

`.env*` is already listed in `.gitignore`.

> The demo login credentials documented in `README.md` are intentional seeded prototype data, not real secrets.

## README answers

1. **What problem are you solving?** — README section 2
2. **What is your proposed solution?** — README section 3
3. **How does it work?** — README section 6 and `docs/architecture.md`
4. **Which technologies did you use?** — README section 5
5. **How can a reviewer run it?** — README sections 11 and 12
6. **What does the final output look like?** — README section 10
7. **Important features and expected impact?** — README sections 4 and 13

## Before submission

Open the repository in a private/incognito window while logged out and confirm the reviewer can access the code, PPT, screenshots and documentation.
