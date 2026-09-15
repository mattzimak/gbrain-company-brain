---
name: company-brain-sync
description: Connect a company brain (a git repo in the template-intelligence layout) to gbrain with the company-brain schema pack, then prove every page is typed and every relationship is a typed edge.
mutating: true
triggers:
  - connect my company brain to gbrain
  - sync the company brain into gbrain
  - import our intelligence repo into gbrain
  - add the company brain as a gbrain source
  - set up the company-brain schema pack
---

# company-brain-sync

A company brain is a git repo of Markdown: `customers/`, `competitors/`,
`suppliers/`, `distributors/`, `people/`, `decisions/`, `meetings/`,
`weekly/`, plus canonical root pages (`company.md`, `strategy.md`,
`product.md`, ...). Every page carries `type:` frontmatter and keeps compiled
truth above a `---` line and a dated timeline below it.

This skill loads that repo into gbrain without losing its structure. Without
the pack, gbrain-base-v2 treats `customer`, `decision`, `strategy` and the
other company types as unknown, and its catch-all rule retypes them to `note`.

## Inputs

- `BRAIN`: absolute path to the company brain repo.
- `SOURCE_ID`: short source name, for example the company slug.
- `PACK_DIR`: a local clone of github.com/mattzimak/gbrain-company-brain (it holds
  `schema/company-brain.yaml` and the lint CLI). `gbrain skillpack scaffold`
  installs only the skills, so if no clone exists, ask where to put one and run
  `git clone https://github.com/mattzimak/gbrain-company-brain <dir>`.

Ask the user for `BRAIN` and `SOURCE_ID` if they are not clear. Never guess
a path.

## Steps

1. **Lint first.** Run `bun $PACK_DIR/src/cli.ts lint $BRAIN`.
   - Exit code 1 means errors. Show them and stop. The user fixes the brain,
     or explicitly accepts syncing with errors.
   - Warnings (dangling links, undated timeline entries) do not block. Report
     the count.
2. **Install the pack.** Copy `$PACK_DIR/schema/company-brain.yaml` to
   `~/.gbrain/schema-packs/company-brain/pack.yaml` (respect `GBRAIN_HOME`).
   Run `gbrain schema validate company-brain` and confirm `valid manifest`.
3. **Activate it.** Run `gbrain schema active`. If the active pack is not
   `company-brain`, tell the user which pack is active and that switching
   changes typing for the whole brain. Only then run
   `gbrain schema use company-brain`.
4. **Register the source.** `gbrain sources add $SOURCE_ID --path $BRAIN`.
   If the source already exists, skip this step.
5. **Sync.** `gbrain sync --source $SOURCE_ID`. Add `--no-embed` when no
   embedding provider is configured, and tell the user to run
   `gbrain embed --stale --source $SOURCE_ID` later.
6. **Extract typed links, frontmatter included.**
   `gbrain extract links --source db --include-frontmatter --source-id $SOURCE_ID`.
   Without `--include-frontmatter`, `owner:`, `supersedes:` and `attendees:`
   never become edges.
7. **Verify, do not assume.**
   - `gbrain schema stats --source $SOURCE_ID --json`: report
     `typed_pages / total_pages`. Anything below 100% gets the untyped slugs
     listed via `gbrain schema review-orphans`.
   - Pick one decision page and run `gbrain graph <slug> --depth 1`. Show the
     user its `owned_by` and `supersedes` edges as proof.

## Report back

One short block: pages synced, typed coverage, number of links, lint
warnings still open, and the next command the user can run
(`company-brain-ask`).

## Known gbrain limitations (0.50)

- `gbrain extract links --source fs` guesses page type from a hardcoded folder
  table and ignores the pack, so pack frontmatter links do not fire there.
  Always use `--source db`.
- Links out of a `meeting` page are labelled `attended` by gbrain's built-in
  rule, even when they point at a decision.
