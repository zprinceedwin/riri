# CLAUDE.md (config role)

Project-level instructions Claude reads at session start.

## Purpose
Tell Claude how *this* project works: stack, conventions, gotchas, what to avoid.

## What belongs
- Project-specific build, test, and run commands
- Conventions that aren't enforced by linters
- "Don't do X here, even though it's normally fine"
- Pointers to other layers (vault location, hook config)

## What doesn't belong
- Anything covered by language tooling or linters
- Long-form architecture docs (link to vault instead)
- Stale notes — prune ruthlessly
