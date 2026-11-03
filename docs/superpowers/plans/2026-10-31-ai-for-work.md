# AI For Work Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Vietnamese AI For Work blog, editorial admin, grounded article generation and published-content RAG specified in the project plan.

**Architecture:** Next.js 15 App Router with server-rendered public pages and small client islands. PostgreSQL/Prisma stores content, encrypted provider settings and anonymous chat sessions. Route handlers authorize all admin operations independently of middleware. Publishing atomically converts BlockNote JSON to Markdown and replaces searchable chunks.

**Tech Stack:** TypeScript, Next.js 15, React, Tailwind, shadcn/ui, Prisma/PostgreSQL, BlockNote, GSAP, Three.js. Native fetch for Gemini/Groq; no orchestration framework or embeddings.

**Spec:** `docs/AI-For-Work-Project-Plan.md`

## Global constraints

- Dark by default; Vietnamese interface; mobile and reduced-motion support.
- Recursive chunks: 512 tokens, overlap 50, separators `["\n\n", "\n", ". ", " "]`.
- PostgreSQL `simple` FTS with GIN index and `ts_rank`; published posts only.
- Exactly one generation attempt per supplied topic; category rejection creates no draft.
- Provider keys are entered through Settings and never sent back to clients.
- Single seeded admin; secure session cookies; no public registration.
- Matbao deployment uses a regular Node server and external PostgreSQL.

## Review focus

1. Long Vietnamese text and unbroken input must terminate chunking with exact token limits.
2. Editing/unpublishing must replace/remove indexed chunks atomically.
3. Anonymous users must not access admin or another chat session.
4. Invalid AI JSON, invalid categories, timeouts and rate limits must produce actionable failures without phantom drafts.
5. Empty retrieval must not call a model to invent an answer; citations must link only to retrieved published posts.

## Tasks

### 1. Foundation, security and persistence

Files: package/config files, `prisma/schema.prisma`, migrations, `prisma/seed.ts`, `src/lib/auth.ts`, `src/lib/settings.ts`, `src/lib/http.ts`, `src/middleware.ts`, login/settings routes and pages.

- [x] Write tests for validation, encrypted secrets and auth token expiry/tampering.
- [x] Initialize dependencies, schema, SQL generated search column, single-admin seed and auth.
- [x] Build protected admin shell and settings; verify tests and Prisma validation.

### 2. Content, publishing and public blog

Files: `src/lib/chunking.ts`, `src/lib/content.ts`, `src/lib/posts.ts`, public routes/components, admin post API/editor.

- [x] Write tests for recursive 512/50 chunking and content conversion.
- [x] Implement CRUD and atomic publication indexing; public category filtering/search/pagination.
- [x] Implement BlockNote editor, renderer, TOC and related chat questions.
- [x] Verify content tests and database publish/edit/unpublish lifecycle.

### 3. AI generation, topics and chat

Files: `src/lib/ai/*`, `src/lib/search.ts`, `src/lib/chat.ts`, topic/category APIs, generation API, chat API and UI.

- [x] Write tests for generated payload validation, rejected categories, exact generation count and source restrictions.
- [x] Implement sequential per-topic generation with Google Search grounding and per-topic progress/errors.
- [x] Add topics CRUD and extensible allowed categories, preserving eight initial categories.
- [x] Implement RAG retrieval, eight-message server history, anonymous capability cookies, clear history, retention and rate limits.
- [x] Add protected optional cron endpoint using the same generation service.
- [x] Verify provider contract tests with mocked HTTP and PostgreSQL integration tests.

### 4. Polish, deployment and verification

Files: public styling, Three.js hero, GSAP transitions, metadata/sitemap/robots, `README.md`, `.env.example`, Docker assets, verification scripts.

- [x] Implement graphite/emerald editorial layout, self-hosted fonts, lazy 3D hero and accessible chat sidebar.
- [x] Add loading/error/empty states, SEO and deployment instructions.
- [x] Run full tests, typecheck, production build and local HTTP smoke checks; document unavailable browser QA.
- [x] Document actual verification results and required user configuration.

## Execution ledger

- Initial state: workspace contains only the supplied project document; no Git repository, CodeGraph index or application.
- Ruling: execute directly in the current workspace because the user explicitly requests building from the supplied plan. No worktree/commit is possible without an existing repository.
- Ruling: keep deployment local and prepare Matbao instructions, matching the named deployment target; do not register an unrelated hosted Site.
- Ruling: allow admin category additions to resolve the spec's NEEDS_NEW_CATEGORY recovery flow; seed the exact eight required categories.
- Ruling: illustration option requests editorial image suggestions in generated content, as described in the writing prompt; no image-generation service is specified.
- Design: editorial blog for Vietnamese office workers; Linear-inspired shadcn foundation, graphite dark surfaces, emerald accent, Geist typography, asymmetric hero. Dials: variance 6, motion 4, density 3.
- Verified: 21 unit tests, 12 real-PostgreSQL integration checks, Prisma validation, TypeScript, production build, standalone startup and 18 HTTP smoke groups pass. npm audit reports zero vulnerabilities.
- Review fixes: serialized table widths; restricted unsupported editor blocks; stable retry request IDs; Markdown-aware citation sanitation; literal prompt escaping; pipe-safe tables; Vietnamese uppercase folding in C-locale PostgreSQL.
- Ruling: use dual-stack localhost binding because this Windows resolver only returns ::1. Production HOSTNAME can be supplied by hosting; Docker uses 0.0.0.0.
- Verification limits: browser access host unavailable; live Gemini/Groq credentials and Matbao account not connected. See docs/Verification.md and README.md.
