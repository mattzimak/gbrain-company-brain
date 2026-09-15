# Changelog

All notable changes documented in Keep-a-Changelog shape.

## [0.1.0] - 2026-09-15

### Added

- `schema/company-brain.yaml`: schema pack extending gbrain-base-v2 with the 14 page types of the template-intelligence layout, `owner` / `supersedes` / `attendees` frontmatter links, phrase-based verbs (`competes_with`, `decided_in`, `champion`) and filing rules. Declares no mapping rules, so nothing in a company brain is retyped to `note`.
- `src/cli.ts lint`: checks a brain before sync (missing frontmatter, undeclared types, wrong folders, undated decision filenames, verified pages without `last_verified`, dangling wikilinks, undated timeline entries).
- Skills: `company-brain-sync`, `company-brain-curate`, `company-brain-ask`, each with 5 routing intents and an LLM-judge eval with 3 cases.
- `fixtures/sample-brain/`: a fictional company brain (Kestrel Robotics) used by the tests and the demo.
- Tests: 21 unit tests; an end-to-end test against a real gbrain (PGLite, isolated `GBRAIN_HOME`).
