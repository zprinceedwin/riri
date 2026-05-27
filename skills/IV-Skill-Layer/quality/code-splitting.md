# code-splitting

Skill: split bundles for faster first paint.

## When to use
Bundle size is hurting load time; routes have distinct, large dependency trees; large libraries are imported eagerly.

## Core idea
Split at route boundaries first, then around heavy components used conditionally. Measure before and after — splitting that doesn't move a metric is just complexity.
