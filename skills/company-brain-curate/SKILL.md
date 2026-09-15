---
name: company-brain-curate
description: Fold facts from a meeting or an inbox/extracted staging file into the company brain, using gbrain to find the affected pages and the brain's curation contract to decide what can be committed and what needs human approval.
mutating: true
triggers:
  - curate this meeting into the company brain
  - update the brain from this transcript
  - fold the extracted facts into our brain
  - which brain pages does this meeting change
  - process the inbox extracted facts
---

# company-brain-curate

Meetings produce facts. This skill turns them into precise, cited edits to
the company brain, and never lets an agent silently change what the company
is or decides.

## Read the contract first

If the brain has `docs/CURATION.md` (or `docs/contracts/curation.md`), read it
before anything else. Its tiers override the defaults below.

Default tiers, from the template-intelligence curation contract:

| Tier | What | How it lands |
|---|---|---|
| **SAFE** | `inbox/extracted/**`, `meetings/**`, `weekly/**`; dated timeline appends below `---` on entity pages; new entity stubs with `status: draft`; additive, cited compiled-truth updates on `draft` or `active` entity pages | Commit to main |
| **SENSITIVE** | `strategy.md`, `company.md`, `brand.md`, `product.md`; new `decisions/**`; finance and ops; any `audience` change; compiled-truth edits on `status: verified` pages; any delete, rename or move | Branch + pull request + human approval |

When in doubt about the tier, treat it as **SENSITIVE**.

## Steps

1. **Load the source.** Read the meeting page or the `inbox/extracted/` file.
   Skip a staging file whose frontmatter already says `curated: true`.
2. **Find the pages it touches, with gbrain.** For each entity named in the
   facts:
   - `gbrain search "<entity name>" --source <id>` to find the canonical page.
   - `gbrain graph <slug> --depth 1` to see who owns it and what it links to.
     The `owned_by` edge tells you whom to name in the PR.
   - No page found: plan a new stub in the folder the pack's filing rules name
     (`customers/`, `people/`, ...), `status: draft`.
3. **Draft the edits.** One edit per fact:
   - Timeline append: `- YYYY-MM-DD: <fact> ([[meetings/<source>]])`.
   - Compiled-truth change: the exact sentence to replace and its replacement.
   - Tier: SAFE or SENSITIVE, with the rule that decided it.
4. **Show the plan before writing.** A table of page, edit, tier and source.
   Stop here if the user only asked which pages change.
5. **Apply.** Commit SAFE edits to main in one commit that cites the source.
   Put SENSITIVE edits on a branch `bot/<slug>` and open one pull request that
   quotes the source sentence for every change.
6. **Mark provenance.** Set `curated: true` and `curated_date` on the staging
   file.
7. **Re-sync.** Run `gbrain sync --source <id>` and
   `gbrain extract links --source db --include-frontmatter --source-id <id>`,
   then `bun <pack>/src/cli.ts lint <brain>` must still report 0 errors.

## Hard rules

1. **Cite the source.** Every edit links the meeting it came from. No citation,
   no write.
2. **Timelines are append-only.** Correct a wrong entry with a new dated entry.
3. **Decisions are immutable** once merged. A new decision supersedes an old
   one through `supersedes:` frontmatter.
4. **Never invent** numbers, dates, names or contract terms. Missing data is
   left out or written as `<unknown>`.
5. **Uncertain facts** get an inline `[VERIFY]` tag and go to the SENSITIVE
   tier.
6. **Only humans set `status: verified`.** New pages start as `draft`.
