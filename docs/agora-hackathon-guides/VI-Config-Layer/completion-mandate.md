# completion-mandate

Config: machine-readable form of Layer II.

## Purpose
Encodes the simplify / code-review / reuse-audit / dead-code-scan / vault-learning checks so the harness can enforce them at completion time.

## Schema (sketch)
```yaml
mandate:
  - simplify
  - code-review
  - reuse-audit
  - dead-code-scan
  - vault-learning
fail_on: any
```

## How to apply
The Stop / PreCompletion hook reads this file. If any item fails, the completion claim is blocked with the failing item named.
