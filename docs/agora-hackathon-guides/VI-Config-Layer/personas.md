# personas

Config: the personas Claude can adopt, mapped to the Agent Layer.

## Purpose
Pre-built behavioral profiles (tech-lead, backend, frontend, QA, …) Claude can switch into for a slice of work. Each persona pins a default skill set and tone.

## Schema (sketch)
```yaml
personas:
  - name: backend
    skills: [test-driven-development, systematic-debugging, security-review]
    tone: terse, evidence-driven
  - name: design
    skills: [front-design, ui-ux-pro-max, figma-figma-use]
    tone: visual, opinionated
```

## How to apply
Dispatch references the persona; the harness loads the persona's skill defaults before the agent runs.
