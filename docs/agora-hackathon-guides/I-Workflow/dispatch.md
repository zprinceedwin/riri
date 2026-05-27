# Dispatch

Third stage. Route the contracted work to the right executor.

## Purpose
Pick the agent(s) and skill(s). Parallelize where work is independent; sequence where there are hand-offs.

## Inputs
- Signed contract with acceptance criteria

## Outputs
- Assigned agent(s) from the Agent Layer
- Skill invocations queued (TDD, debugging, brainstorming, etc.)
- Worktree or branch isolation if needed

## Exit Criteria
Work is in motion with clear ownership. Each parallel branch has its own contract slice so reviewers can verify independently.
