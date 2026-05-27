# skills-gate.json

Config file declaring which skills are required for which actions.

## Schema (sketch)
```json
{
  "gates": [
    { "action": "edit_code", "require": ["test-driven-development"] },
    { "action": "new_feature", "require": ["superpowers:brainstorming"] },
    { "action": "claim_complete", "require": ["verification-before-completion", "simplify"] }
  ]
}
```

## Consumed by
The `skill-gate-check` hook reads this file on every gated tool call.

## Maintenance
Add a gate when "we forgot to do X" becomes a pattern. Remove a gate when it stops adding signal.
