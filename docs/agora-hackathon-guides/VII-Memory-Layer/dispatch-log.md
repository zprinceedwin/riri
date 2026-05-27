# dispatch log

Record of which agents were dispatched, for what, and what came back.

## What's in each entry
- Contract reference
- Agent(s) dispatched (persona)
- Skills invoked
- Outcome: shipped / blocked / re-routed
- Duration

## Why
Spotting patterns: which agents are bottlenecks, which dispatches keep failing, where parallelism is paying off.

## Naming
`dispatch/YYYY-MM-DD-<contract-slug>.md`
