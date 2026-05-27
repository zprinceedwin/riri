# Code Review

Mandatory review pass before completion.

## Rule
No diff ships without a structured review against the contract.

## What it catches
- Correctness bugs the author missed
- Reuse opportunities (existing util being reimplemented)
- Architectural drift from project conventions
- Missing or weak tests

## Effort tiers
- **low / medium** — few, high-confidence findings
- **high / max** — broader sweep, may include uncertain findings
- **ultra** — deep multi-agent cloud review

## Invocation
`/code-review [level]` — add `--fix` to apply findings, `--comment` to post as PR comments.
