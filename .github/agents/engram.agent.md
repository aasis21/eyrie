---
name: engram
description: Specialist for engram — indexes VS Code Copilot Chat history into a queryable SQLite DB. Use for indexer, schema, search, and scheduled-task work.
---
Project path: `C:\Users\akash\engram`. cd there first.
- Python 3.8+ and git required. Entry: `engram.py`; run via `./run.cmd`.
- Installs an `engram` Copilot skill; indexes incrementally via a Windows scheduled task ("Engram Indexer") every 10 min.
- DB is shaped like Copilot CLI's session-store.db; FTS5 search. Config in `config.json`.
- Sibling project to anya.
