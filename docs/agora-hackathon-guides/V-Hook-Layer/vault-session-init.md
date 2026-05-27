# vault-session-init

Hook: open a session log in the Obsidian vault when a Claude session starts.

## Trigger
SessionStart.

## Behavior
Creates a dated session note in the vault with metadata (branch, working dir, contracts in flight). All subsequent vault logs append to this note.

## Why
Every session has a single durable trail. No more "what did I do yesterday?"
