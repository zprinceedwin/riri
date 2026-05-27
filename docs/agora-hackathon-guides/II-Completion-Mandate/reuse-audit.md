# Reuse Audit

Mandatory check: did we reimplement something that already exists?

## Rule
Before merging, grep the codebase for similar functions, utilities, components, or patterns. Prefer extending existing code over adding parallel implementations.

## What to look for
- Helper functions with overlapping signatures
- Components that solve the same UI problem
- Duplicated constants, regex, or config
- Multiple HTTP clients / loggers / error wrappers

## When duplication is OK
- Three similar lines that would need a bad abstraction to unify
- Different layers that should stay decoupled
- The existing version is wrong and would be more work to migrate

Document the call either way.
