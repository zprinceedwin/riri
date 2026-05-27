# fix-build

Skill: get a broken build back to green.

## When to use
CI red, local build failing, type-check or lint broken.

## Core idea
Bisect to the offending change, fix the root cause (not the symptom), confirm green locally, then push. Never disable the check to make it pass.
