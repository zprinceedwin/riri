# Dead Code Scan

Mandatory check: no orphaned code lands.

## Rule
Every exported symbol, file, and asset added or touched in the diff must have at least one live caller or runtime path.

## What it catches
- Functions written but never wired up
- Removed feature with leftover types, routes, or assets
- Imports of modules whose only call site got deleted
- `// TODO: hook this up` left in the diff

## Tooling
- Static: `ts-prune`, `knip`, `deno doc`, language-native unused warnings
- Dynamic: coverage on touched paths
- Hook: `dead-code-check` runs on pre-completion
