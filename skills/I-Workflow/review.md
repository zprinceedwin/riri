# Review

Fourth stage. Independent verification before anything ships.

## Purpose
Confirm the work meets the contract and the Completion Mandate. Catch correctness bugs, reuse misses, dead code, and security gaps.

## Inputs
- Completed implementation on a branch
- Original contract and acceptance criteria

## Outputs
- Review verdict: approve / request changes / reject
- Inline findings (bugs, simplifications, reuse opportunities)
- Updated learnings if anything novel surfaced

## Exit Criteria
All Completion Mandate items pass. Tests are green. Reviewer is satisfied that the diff matches the contract — nothing more, nothing less.
