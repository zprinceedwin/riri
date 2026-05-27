# log-to-vault

Hook: stream notable events from the session into the vault as they happen.

## Trigger
PostToolUse on Edit / Write / Bash; UserPromptSubmit; assistant message containing decisions or ship signals.

## Behavior
Appends a structured entry to today's session note: tool, target, summary. Filters noise — only events that future-you would want to find.

## Why
Real-time log beats end-of-session reconstruction. Captures detail before it's lost.
