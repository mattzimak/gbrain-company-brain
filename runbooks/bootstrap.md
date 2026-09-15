# Bootstrap

Post-scaffold steps. gbrain displays this but does NOT auto-execute.
The agent reads it and walks per-step at its own discretion.

1. show user: "company-brain is installed. Try one of the trigger phrases from skills/company-brain/SKILL.md."
2. (edit me) agent: printf -- '---\ntype: config\n---\n\nconfig body\n' | gbrain put wiki/_company-brain-config
