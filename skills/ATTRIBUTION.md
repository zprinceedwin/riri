# Attribution

The contents of this folder are mirrored from
[CDGYu/Agora-Hackathon](https://github.com/CDGYu/Agora-Hackathon) — specifically
[`guides/`](https://github.com/CDGYu/Agora-Hackathon/tree/main/guides) — for
use as **agent-invocable skills** during the Agora Hackathon Philippines 2026.

| field | value |
|-------|-------|
| upstream repo | https://github.com/CDGYu/Agora-Hackathon |
| upstream path | `guides/` |
| upstream commit | `28905bafacca83c26b09817a1428ddb0d8d132b5` |
| upstream license | **MIT License**, Copyright (c) 2026 CDGYu |
| first imported on | 2026-05-27 (Wed) |
| last refreshed on | 2026-05-27 (Wed) — moved into `/skills` at repo root |
| imported by | Riri team (`zprinceedwin/riri`) |
| files mirrored | 92 markdown files + the upstream `guides/README.md` |

## License

The upstream repository publishes an MIT License. A verbatim copy of that
license lives in [`./LICENSE`](LICENSE) right next to this attribution note,
which satisfies the MIT requirement to include the copyright + permission
notice with any redistribution.

To make the boundary explicit:

- **This folder** (`/skills/`) is licensed **MIT, Copyright (c) 2026 CDGYu**.
  See `LICENSE` in this folder.
- **The rest of the Riri repo** is licensed under the MIT license at the repo
  root, Copyright (c) 2026 Prince Zablan.

Both happen to be MIT, but the copyright holders are different. If you copy
content out of this folder into another project, carry the `skills/LICENSE`
notice with it.

## Folder structure (mirrored verbatim, with a renamed root)

```
skills/
├── ATTRIBUTION.md               # this file
├── LICENSE                      # upstream MIT LICENSE (Copyright (c) 2026 CDGYu)
├── README.md                    # the upstream guides README
├── I-Workflow/                  # workflow primitives (triage, dispatch, …)
├── II-Completion-Mandate/       # completion criteria (code review, …)
├── III-Agent-Layer/             # role-specific agent prompts
├── IV-Skill-Layer/              # reusable skills (debugging, design, …)
├── V-Hook-Layer/                # event hooks (logs, gates, …)
├── VI-Config-Layer/             # config templates (CLAUDE.md, commands, …)
└── VII-Memory-Layer/            # memory artefacts (ADRs, PRDs, …)
```

(The upstream layout uses `guides/` as the root; we renamed it to `skills/` to
match how the team actually uses these files — as agent-invocable skills.)

## How we use it

These files are reference templates that an AI coding agent can load on demand:
a teammate or a subagent reads the relevant markdown file before starting a
task that matches its scope (debugging, code review, dispatch planning, etc.).
They are NOT auto-loaded by any Riri runtime tooling.

## Re-syncing from upstream

To pull the latest version of the upstream guides into `skills/`:

```powershell
$tmp = "$env:TEMP\agora-hackathon-import"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
git clone --depth 1 https://github.com/CDGYu/Agora-Hackathon.git $tmp

# Wipe everything in skills/ except our own ATTRIBUTION.md, then re-copy.
Get-ChildItem skills -Force -Exclude ATTRIBUTION.md `
  | Remove-Item -Recurse -Force
Copy-Item -Recurse "$tmp\guides\*" skills\
Copy-Item "$tmp\LICENSE" skills\LICENSE

# Bump the upstream commit + refresh date in this file, then commit.
```
