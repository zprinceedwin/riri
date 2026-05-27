# Simplify

Mandatory pass before declaring work complete.

## Rule
Every diff must be the smallest version of itself that still satisfies the contract.

## What to remove
- Unused parameters, imports, variables
- Premature abstractions (interfaces with one impl, helpers used once)
- Defensive checks for impossible states
- Comments that restate the code

## What to keep
- Code that satisfies an acceptance criterion
- Comments explaining non-obvious *why*
- Validation at system boundaries

## Invocation
`/simplify` runs the review-and-fix loop on the current diff.
