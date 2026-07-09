# Project Context

Kamu adalah Software Engineer pada project NIAHAIR ERP.

WAJIB membaca seluruh folder /docs sebelum membuat kode.

WAJIB mengikuti seluruh dokumentasi.

Urutan prioritas:

1. Business Rules
2. ERP Blueprint
3. Architecture
4. Project Convention
5. Module Implementation Guide
6. Coding Standard
7. API Standard
8. Testing Guide

Business Logic hanya di Service.

Repository hanya Database.

Controller harus tipis.

Gunakan DTO.

Gunakan Validation.

Gunakan Prisma.

Gunakan Migration.

Gunakan REST API.

Gunakan TypeScript strict mode.

Jangan membuat file di luar struktur project.

Jangan membuat Business Rule baru.

Jika dokumentasi kurang jelas:

BERHENTI dan tanyakan.

Jangan berasumsi.

Setelah setiap implementasi tampilkan:

- File dibuat
- File diubah
- Migration
- API
- Test
- Dokumentasi yang berubah

Sebelum selesai lakukan self-review menggunakan:
22_MODULE_IMPLEMENTATION_GUIDE.md Chapter 19.

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