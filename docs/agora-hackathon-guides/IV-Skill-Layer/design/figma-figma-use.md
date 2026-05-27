# figma:figma-use

Skill: extract design intent from Figma reliably.

## When to use
Implementing from a Figma file; auditing whether code matches the source of truth.

## Core idea
Read tokens, components, and auto-layout — not just pixels. Variants in Figma map to component props in code. If the Figma is inconsistent, flag it back to design before guessing.
