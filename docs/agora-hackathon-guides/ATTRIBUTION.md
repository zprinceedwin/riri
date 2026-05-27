# Attribution

The contents of this folder are mirrored from
[CDGYu/Agora-Hackathon](https://github.com/CDGYu/Agora-Hackathon) — specifically
[`guides/`](https://github.com/CDGYu/Agora-Hackathon/tree/main/guides) — for
use as reference material during the Agora Hackathon Philippines 2026.

| field | value |
|-------|-------|
| upstream repo | https://github.com/CDGYu/Agora-Hackathon |
| upstream path | `guides/` |
| upstream commit | `e7e3bf2c2a9c8d85e2a501525b356477b1365a06` |
| imported on | 2026-05-27 (Wed) |
| imported by | Riri team (`zprinceedwin/riri`) |
| files imported | 92 markdown files + the upstream `guides/README.md` |

## License

The upstream repository does NOT publish a `LICENSE` file. Under default GitHub
terms ([§D.4](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#4-license-grant-to-other-users))
this means the original copyright is reserved by the upstream author(s). The
mirror in this folder is included here as a reference under the same forking
permission GitHub grants for public repos.

If you intend to reuse this content **outside the scope of viewing it in this
project**, please first:

1. Contact the upstream author at <https://github.com/CDGYu>.
2. Request explicit permission or wait for them to publish a LICENSE.

The Riri project's own MIT license at the repo root does **not** apply to the
files in this folder.

## Folder structure (mirrored verbatim)

```
docs/agora-hackathon-guides/
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
