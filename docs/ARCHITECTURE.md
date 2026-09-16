# Architecture

How the pieces of this skillpack fit together, and why they are shaped the way they are. Read this before changing the schema pack or the linter.

## The flow

```
company brain repo (Markdown, template-intelligence layout)
        |
        v
  bun src/cli.ts lint <brain>            catches what gbrain would silently drop
        |
        v
  ~/.gbrain/schema-packs/company-brain/   the pack, activated with gbrain schema use
        |
        v
  gbrain sources add + gbrain sync        pages land typed: frontmatter type first, then path_prefixes
        |
        v
  gbrain extract links --source db --include-frontmatter
        |                                 owner / supersedes / attendees become edges,
        v                                 phrase cues become decided_in / competes_with / champion
  typed graph in gbrain
        |
        v
  skills: company-brain-sync, -curate, -ask   how an agent installs, writes to and reads the brain
```

## Components

| Path | Role | Notes |
|---|---|---|
| `schema/company-brain.yaml` | The schema pack | `extends: gbrain-base-v2`. Declares the 14 page types of the layout, three phrase-based link verbs, `owner` / `supersedes` / `attendees` frontmatter links, and filing rules. Declares **no** `mapping_rules`. |
| `src/pack.ts` | Reads the pack | Parses the YAML with `Bun.YAML`. Exposes the allowed types (pack types plus the 19 inherited from gbrain-base-v2, listed explicitly because the linter runs without gbrain installed) and the type-to-folder map. |
| `src/lint.ts` | Pre-sync linter | Pure functions over the brain's files. Every rule maps to something gbrain would mis-type, drop or misfile; see the table below. |
| `src/cli.ts` | `lint` and `pack-path` commands | Exit code 1 on errors, 0 on warnings only. |
| `skills/*/SKILL.md` | Agent instructions | Frontmatter `triggers` route a user phrasing to a skill; the body is the in-context procedure. `routing-eval.jsonl` pins five phrasings per skill. |
| `evals/*.judge.json` | LLM-judge evals | Three cases per skill: happy path, sensitive path, missing data. |
| `fixtures/sample-brain/` | Kestrel Robotics | Fictional 15-page brain used by tests and the demo. Covers every folder the pack declares plus root canon pages. |
| `test/` | Unit tests | Pack contract, one broken brain per lint rule, skills contract. No gbrain needed. |
| `e2e/sync.e2e.test.ts` | End-to-end | Real gbrain, throwaway PGLite brain under an isolated `GBRAIN_HOME`. Skips when no `gbrain` is on PATH. |
| `scripts/demo.sh` | Before and after | Two throwaway brains: default pack versus this pack. Source of the numbers in the README. |
| `.github/workflows/ci.yml` | CI | Unit tests, sample-brain lint, `gbrain skillpack doctor` gated at 10/10, e2e against a pinned gbrain commit, gitleaks. |

## Lint rules

| Code | Severity | What gbrain would do without it |
|---|---|---|
| `FM_MISSING` | error (warning for `FACTSHEET.md`) | import the page untyped |
| `FIELD_MISSING` (`type`, `status`) | error | untyped page, or a page whose lifecycle no skill can reason about |
| `FIELD_MISSING` (`owner`, `updated`) | warning | no `owned_by` edge, no freshness signal |
| `TYPE_UNDECLARED` | error | gbrain-base-v2's catch-all retypes it to `note` |
| `WRONG_FOLDER` | error | path_prefixes and frontmatter disagree; filing rules are violated |
| `DECISION_FILENAME` | error | decisions lose their date ordering |
| `STATUS_INVALID` | warning | `status` outside the template's five values |
| `VERIFIED_UNDATED` | warning | a `verified` page with no `last_verified` cannot age out |
| `LINK_DANGLING` | warning | gbrain drops edges whose target page does not exist |
| `TIMELINE_UNDATED` | warning | undated bullets below the `---` are not timeline entries |

## Design decisions

**Extend `gbrain-base-v2`, not `gbrain-base`.** v2 is the current default and the one whose catch-all rule flattens a company brain. Extending it keeps its 19 types and link verbs (`attended`, `supersedes`, `works_at`, ...) available, so `person`, `company` and `meeting` pages need nothing extra.

**No `mapping_rules`.** In gbrain's pack inheritance, `mapping_rules` are child-only (`src/core/schema-pack/merge.ts`): a child pack does not inherit the parent's retype rules. Declaring none is what stops `unify-types` from renaming `customer`, `decision` and `strategy` to `note` and folding `product` into `company`. This is the load-bearing decision; the e2e test pins it.

**Phrase regexes instead of `page_type` bindings for the new verbs.** gbrain's inference binds a verb to every outgoing link of a page type and ignores `target_type` (reported as [garrytan/gbrain#5143](https://github.com/garrytan/gbrain/issues/5143)). Binding `decided_in` to `decision` would label a decision's link to a person `decided_in` too. Sentence cues (`agreed in`, `competes with`, `champion`) are narrower. Regexes are case-sensitive and JavaScript has no inline `(?i)`, hence `[Aa]greed`.

**Root canon pages are typed by frontmatter only.** `strategy.md`, `product.md`, `brand.md`, `ops.md`, `finance.md` have no folder, so their pack entries carry no `path_prefixes`; import honours their `type:`. The linter therefore treats a missing `type:` on a root page as an error.

**The DB extraction path, not the filesystem one.** `gbrain extract links --source fs` guessed page types from a fixed folder table and ignored the pack, so pack frontmatter links never fired there ([garrytan/gbrain#5142](https://github.com/garrytan/gbrain/issues/5142), fix proposed in [#5153](https://github.com/garrytan/gbrain/pull/5153)). Until that lands, every documented command uses `--source db --include-frontmatter`.

**Inherited types are listed by hand in `src/pack.ts`.** The linter must run in CI and on a laptop without gbrain installed, so it cannot resolve the parent pack. The e2e test checks the resolved pack against a real gbrain, which catches drift if v2 changes.

**Tests use a fictional brain.** Real company brains hold customer names and numbers. Kestrel Robotics is invented, small enough to read in a minute, and exercises every rule.

## Versioning

`skillpack.json` and `package.json` carry the same version. `CHANGELOG.md` follows Keep a Changelog. The pack's `gbrain_min_version` is `0.42.0`, the first release with schema packs; CI pins the exact gbrain commit the e2e test runs against.
