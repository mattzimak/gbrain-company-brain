---
name: company-brain-ask
description: Answer questions about the company from its gbrain-synced company brain, walking typed edges (owned_by, supersedes, decided_in, champion, competes_with, attended) and citing every page used.
mutating: false
triggers:
  - ask the company brain
  - who owns this account in our brain
  - what did we decide about this and why
  - which decision replaced this one
  - brief me on this customer from the company brain
---

# company-brain-ask

A synced company brain answers questions a folder of Markdown cannot, because
its relationships are typed edges in gbrain. This skill answers from those
edges and the pages behind them, with citations, and says plainly when the
brain does not know.

## Precondition

The brain was synced with `company-brain-sync`. Check with
`gbrain schema active` (expect `company-brain`) and
`gbrain sources list` (expect the brain's source id). If either is missing,
offer to run `company-brain-sync` first.

## Question patterns and the queries behind them

| Question | Queries |
|---|---|
| Who owns account X? | `gbrain search "X"` for the slug, then `gbrain graph <slug> --depth 1`; read `owned_by` |
| Who is our champion at X? | `gbrain graph customers/<x> --depth 1`; read `champion`, then open that person page |
| What did we decide about Y, and why? | `gbrain list --type decision`, `gbrain search "Y"`; for the decision found, `gbrain graph <slug>` for `decided_in` (the meeting) and `supersedes` (what it replaced); read both pages |
| Is this decision still current? | `gbrain graph <slug> --depth 2`; a newer decision with `supersedes -> <slug>` means it is not. Check the page's `status` too |
| Who do we compete with, and where? | `gbrain list --type competitor`; per competitor read compiled truth and `competes_with` edges |
| Brief me on customer X | Customer page compiled truth, its timeline, `owned_by`, `champion`, and the most recent meeting that links to it |
| Open questions from last week | `gbrain list --type weekly --limit 1`, then follow its links |

`gbrain think "<question>" --source <id>` gives a multi-hop synthesis when an
LLM provider is configured. Treat its answer as a draft and verify every
claim against the pages it cites.

## Answer format

1. The answer in one to three sentences.
2. **Sources:** each page used, as `[[slug]]`, with the fact taken from it.
3. **Freshness:** the `last_verified` date of the key page. If older than
   90 days, say so.
4. **Gaps:** what the brain does not record. Never fill a gap from memory or
   training data.

## Rules

- Read only. This skill never edits the brain. Changes go through
  `company-brain-curate`.
- `status: superseded` or `archived` pages are history, not current truth.
  Say which is which.
- Pages marked `audience: internal` stay internal. Do not paste their content
  into anything public.
