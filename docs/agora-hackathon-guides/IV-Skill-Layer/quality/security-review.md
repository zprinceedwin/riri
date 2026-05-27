# security-review

Skill: targeted security review of pending changes.

## When to use
Before merging changes that touch auth, user input, data access, secrets, or external integrations.

## Core idea
Walk OWASP top-10 against the diff. Confirm validation at boundaries, least-privilege on data access, and no secrets in code or logs.
