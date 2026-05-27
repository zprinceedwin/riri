# Obsidian Vault

The root of persistent project memory.

## Layout
- `sessions/` — dated session logs (one per Claude session)
- `learnings/` — distilled insights with tags
- `ADRs/` — architecture decision records
- `dispatch/` — agent dispatch logs
- `PRDs/` — product requirement docs
- `diagrams/` — exported architecture / flow diagrams

## Why Obsidian
Markdown files, local-first, wiki-link graph. Future sessions can grep and link without a database.

## Maintenance
Hooks write into the vault automatically (vault-session-init, log-to-vault, stop-vault-log). Manual edits happen during ship-learn-next.
