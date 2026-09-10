# SIH 2026 Submission Guide

Checklist status for the **BlockLedger** repository (PS ID 26125).

## Required repository content

- [x] Actual source code is present.
- [x] `README.md` explains the project clearly.
- [x] PS ID and PS title are included.
- [x] Problem statement and proposed solution are explained.
- [x] Key features are listed.
- [x] Technology stack is listed.
- [x] Setup and run instructions work.
- [ ] Team members and roles are mentioned — **fill in section 14 of `README.md`**.
- [x] Important screenshots are included in `assets/screenshots/`.
- [ ] Final PPT/presentation placed in `submission/` — **pending**.
- [ ] Demo video link added to `submission/DEMO.md` — **optional, pending**.
- [ ] Repository is accessible to reviewers — verify after push.

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

Upload the final PPT/PPTX to the `submission/` folder using a clear filename such as:

`TeamName_SIH2026_Presentation.pptx`

If the file is too large for GitHub, upload it to Google Drive or OneDrive and put the shareable viewer link in `submission/PRESENTATION.md`.

## Demo video

Optional. If available, add the YouTube/Google Drive link to `submission/DEMO.md` and make sure it is accessible without requesting permission.

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

Open the repository in a private/incognito window while logged out and confirm the reviewer can access the code, PPT, screenshots, documentation and any linked material.
