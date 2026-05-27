# wave-protocol

Config: how multi-phase work is sequenced.

## Purpose
A "wave" is a coordinated group of agent dispatches that ship together. The protocol defines wave boundaries, sync points, and rollback rules.

## Typical wave
1. **Plan** — tech-lead + PM align on the wave's contracts
2. **Build** — parallel dispatch across backend / frontend / design
3. **Verify** — QA + security review
4. **Ship** — devops promotes; writer + social publish

## Why
Prevents partial states: nothing in a wave ships unless the whole wave is ready.
