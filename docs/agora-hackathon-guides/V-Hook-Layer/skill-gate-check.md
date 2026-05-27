# skill-gate-check

Hook: enforce that the right skill was invoked before acting.

## Trigger
PreToolUse on Edit / Write / Bash, or on assistant message.

## Behavior
Reads `skills-gate.json`. If the current action requires a skill (e.g., TDD before code edits, brainstorming before features) and the skill wasn't invoked this session, blocks the action and prompts.

## Why
Hooks enforce; memory and instructions only suggest. Gate-checks turn "you should" into "you can't until".
