<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Purpose

This file contains concise guidance for AI coding agents working in this repository. Prefer linking other docs rather than copying them — see **Files to consult** below.

## Quick Commands

- **Dev:** `npm run dev` (also works with `yarn dev`, `pnpm dev`, `bun dev`)
- **Build:** `npm run build`
- **Start (prod):** `npm run start`
- **Lint:** `npm run lint`

## Key facts for agents (short)

- **Framework:** Next.js (see note at top). This repo uses Next 16 and app-dir conventions.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS + shadcn components.
- **DB:** Mongoose models live under `models/` and Mongo connection helpers in `lib/mongodb.ts`.
- **Server endpoints:** API routes and server logic live under `app/api/` and `api/` (check both when adding endpoints).
- **UI:** App components live under `app/` and `components/`.
- **Hooks & client logic:** `hooks/` contains domain hooks used across UI.

## Agent behavior guidelines (concise)

- Follow the repository's existing style and file organization. Make minimal, focused edits.
- Link to existing documentation instead of duplicating it. Use the files listed in **Files to consult**.
- When adding or changing API endpoints, update matching models under `models/` and any relevant types in `types/`.
- Preserve security-sensitive files and never write secrets—if a secret is required, instruct the human to provide it.

## Files to consult

- [README.md](README.md) — general setup and dev hints
- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture overview
- [WORKFLOW.md](WORKFLOW.md) — development workflow and conventions
- [next.config.ts](next.config.ts) and [package.json](package.json) — build/runtime config and scripts

## Proposals for further agent customizations

- Create `.github/copilot-instructions.md` to encode repo-level linting, commit, and PR preferences.
- Add a `skills/backend.md` summarizing API conventions, auth (`lib/authOptions.ts`), and Mongo patterns.
- Add a `skills/frontend.md` for common component patterns and UI utilities in `components/`.

If you'd like, I can create the `.github/copilot-instructions.md` and one of the proposed skills next.
