# commands

Config: project-level slash commands.

## Purpose
Bind a name to a workflow so it can be invoked with one keystroke (e.g., `/ship`, `/review`, `/triage`).

## Where they live
`.claude/commands/` — one markdown file per command, with a body that is the prompt the command runs.

## Discoverability
List in `CLAUDE.md` so contributors know what's available. Stale commands are worse than missing ones — prune when workflows change.
