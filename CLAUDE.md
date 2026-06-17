# Project Context

Always read these documents before coding:

- docs/Project.md
- docs/requirement.md
- docs/ERD.md
- docs/BUSINESS_FLOW.md
- docs/BACKEND_RULES.md

Backend location:

backend/

Frontend location:

frontend/


Rules:
- Use pnpm
- Follow existing architecture
- Do not modify database schema without asking
- Never modify Prisma schema without approval
- Never create migration without approval
- Follow existing backend architecture
- Do not modify Accurate client
- Use existing response helper
- Use existing error handler

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec