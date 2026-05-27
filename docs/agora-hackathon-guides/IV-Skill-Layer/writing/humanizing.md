Purpose
Guide product managers through breaking down epics into user stories using Richard Lawrence's complete Humanizing Work methodology—a systematic, flowchart-driven approach that applies 9 splitting patterns sequentially. Use this to identify which pattern applies, split while preserving user value, and evaluate splits based on what they reveal about low-value work you can eliminate. This ensures vertical slicing (end-to-end value) rather than horizontal slicing (technical layers).

This is not arbitrary slicing—it's a proven, methodical process that starts with validation, walks through patterns in order, and evaluates results strategically.

Key Concepts
Core Principles: Vertical Slices Preserve Value
A user story is "a description of a change in system behavior from the perspective of a user." Splitting must maintain vertical slices—work that touches multiple architectural layers and delivers observable user value—not horizontal slices addressing single components (e.g., "front-end story" + "back-end story").

The Three-Step Process
Pre-Split Validation: Check if story satisfies INVEST criteria (except "Small")
Apply Splitting Patterns: Work through 9 patterns sequentially until one fits
Evaluate Splits: Choose the split that reveals low-value work or produces equal-sized stories
The 9 Splitting Patterns (In Order)
Workflow Steps — Thin end-to-end slices, not step-by-step
Operations (CRUD) — Create, Read, Update, Delete as separate stories
Business Rule Variations — Different rules = different stories
Data Variations — Different data types/structures
Data Entry Methods — Simple UI first, fancy UI later
Major Effort — "Implement one + add remaining"
Simple/Complex — Core simplest version first, variations later
Defer Performance — "Make it work" before "make it fast"
Break Out a Spike — Time-box investigation when uncertainty blocks splitting
Meta-Pattern (Applies Across All Patterns)
Identify the core complexity
List all variations
Reduce variations to one complete slice
Make other variations separate stories
Why This Works
Prevents arbitrary splitting: Methodical checklist prevents guessing
Preserves user value: Every story delivers observable value
Reveals waste: Good splits expose low-value work you can deprioritize
Repeatable: Apply to any epic consistently
Facilitation Source of Truth
Use workshop-facilitation as the default interaction protocol for this skill.

It defines:

session heads-up + entry mode (Guided, Context dump, Best guess)
one-question turns with plain-language prompts
progress labels (for example, Context Qx/8 and Scoring Qx/5)
interruption handling and pause/resume behavior
numbered recommendations at decision points
quick-select numbered response options for regular questions (include Other (specify) when useful)
This file defines the domain-specific assessment content. If there is a conflict, follow this file's domain logic.

Application
Step 0: Provide Epic Context
Agent asks:

Please share your epic:

Epic title/ID
Description or hypothesis
Acceptance criteria (especially multiple "When/Then" pairs)
Target persona
Rough estimate
You can paste from Jira, Linear, or describe briefly.