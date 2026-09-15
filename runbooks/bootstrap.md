# Bootstrap

Post-scaffold steps. gbrain displays this but does NOT auto-execute. The
agent walks each step only with the user's go-ahead.

1. show user: "company-brain is installed: a schema pack for company brains in the template-intelligence layout, plus three skills (company-brain-sync, company-brain-curate, company-brain-ask)."
2. agent: check prerequisites with `bun --version` (the lint CLI needs Bun) and `gbrain --version` (0.42 or newer).
3. ask user: "Which company brain repo should I connect, and what short source id should it get?"
4. agent: run the company-brain-sync skill with that path and source id. It lints first, asks before switching the active schema pack, and ends with verified typed coverage.
5. show user: "Try: 'who owns the <customer> account' or 'curate this meeting into the company brain'."
