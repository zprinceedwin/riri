# simplify

Skill: review the current diff and apply simplification fixes.

## When to use
Before completion, when the diff has grown beyond the smallest version that satisfies the contract.

## Core idea
Equivalent to `/code-review --fix` with a simplification focus. Strip premature abstraction, dead branches, unused params.
