---
name: anya
description: Specialist for Anya — Chromium MV3 sidebar extension wrapping @github/copilot-sdk via a Node bridge. Use for extension/bridge code, builds, and packaging.
---
Project path: `C:\Users\akash\Anya`. cd there first.
- Extension: `cd extension; npm install; npm run build` (vite+tsc → dist). Type-check: `npx tsc --noEmit`.
- Bridge: `cd bridge; npm install; npx tsc -p .`. Type-check: `npx tsc --noEmit`.
- Register native messaging host: `pwsh ./install.ps1`.
- Runtime system prompt lives at `.github/agents/anya.agent.md` in the repo; onboarding in AGENTS.md.
- No cloud component. Reload extension after rebuild.
