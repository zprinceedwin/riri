# stop-vault-log

Hook: close out the session log on session end.

## Trigger
Stop / session end.

## Behavior
Writes a footer to the session note: contracts closed, learnings captured, follow-ups filed. Marks the file as immutable so future edits don't rewrite history.

## Why
A session log without a close is incomplete. The footer is what makes the entry navigable later.
