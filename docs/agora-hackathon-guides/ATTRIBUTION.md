# Attribution

The contents of this folder are mirrored from
[CDGYu/Agora-Hackathon](https://github.com/CDGYu/Agora-Hackathon) — specifically
[`guides/`](https://github.com/CDGYu/Agora-Hackathon/tree/main/guides) — for
use as reference material during the Agora Hackathon Philippines 2026.

| field | value |
|-------|-------|
| upstream repo | https://github.com/CDGYu/Agora-Hackathon |
| upstream path | `guides/` |
| upstream commit | `28905bafacca83c26b09817a1428ddb0d8d132b5` |
| upstream license | **MIT License**, Copyright (c) 2026 CDGYu |
| first imported on | 2026-05-27 (Wed) |
| last refreshed on | 2026-05-27 (Wed) — picked up the new MIT LICENSE upstream |
| imported by | Riri team (`zprinceedwin/riri`) |
| files mirrored | 92 markdown files + the upstream `guides/README.md` |

## License

The upstream repository now publishes an MIT License. A verbatim copy of that
license lives in [`./LICENSE`](LICENSE) right next to this attribution note,
which satisfies the MIT requirement to include the copyright + permission
notice with any redistribution.

To make the boundary explicit:

- **This folder** (`docs/agora-hackathon-guides/`) is licensed **MIT, Copyright
  (c) 2026 CDGYu**. See `LICENSE` in this folder.
- **The rest of the Riri repo** is licensed under the MIT license at the repo
  root, Copyright (c) 2026 Prince Zablan.

Both happen to be MIT, but the copyright holders are different. If you copy
content out of this folder into another project, carry the
`docs/agora-hackathon-guides/LICENSE` notice with it.

## Folder structure (mirrored verbatim)

```
docs/agora-hackathon-guides/
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

## How we use it

These guides are reference-only. They are NOT auto-loaded by any Riri tooling,
and they live under `docs/` to keep them out of the build. Browse them when you
need a template or a primitive for a new workflow.

## Re-syncing

To pull the latest version of the guides:

```powershell
$tmp = "$env:TEMP\agora-hackathon-import"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
git clone --depth 1 https://github.com/CDGYu/Agora-Hackathon.git $tmp
Remove-Item -Recurse -Force docs\agora-hackathon-guides\* `
  -Exclude ATTRIBUTION.md
Copy-Item -Recurse "$tmp\guides\*" docs\agora-hackathon-guides\
Copy-Item "$tmp\LICENSE" docs\agora-hackathon-guides\LICENSE
# bump the upstream commit + refresh date in this file, then commit.
```
