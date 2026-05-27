# sc:workflow

Superclaude workflow orchestrator. Threads triage → contract → dispatch → review → ship for a single request.

## When to use
Anything that should follow the full five-stage workflow rather than ad-hoc execution.

## Core idea
One entrypoint that drives the right skill at each stage and writes the trail into the vault.
