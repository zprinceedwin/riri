# sentry:sentry-workflow

Skill: triage and resolve Sentry issues.

## When to use
A Sentry issue is paging, regressing, or has hit a noise threshold.

## Core idea
Read the stack trace, the breadcrumb trail, and the affected releases before guessing. Reproduce locally; fix root cause; resolve in Sentry with the fixing release tagged.
