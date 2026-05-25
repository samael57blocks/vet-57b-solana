# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| PR creation, opening PRs for review | branch-pr | ~/.config/opencode/skills/branch-pr/SKILL.md |
| PRs over 400 lines, stacked PRs, review slices | chained-pr | ~/.config/opencode/skills/chained-pr/SKILL.md |
| Writing guides, READMEs, RFCs, onboarding docs | cognitive-doc-design | ~/.config/opencode/skills/cognitive-doc-design/SKILL.md |
| PR feedback, issue replies, reviews, comments | comment-writer | ~/.config/opencode/skills/comment-writer/SKILL.md |
| Editing opencode configuration | customize-opencode | ~/.config/opencode/skills/customize-opencode/SKILL.md |
| Go tests, coverage, teatest, golden files | go-testing | ~/.config/opencode/skills/go-testing/SKILL.md |
| GitHub issues, bug reports, feature requests | issue-creation | ~/.config/opencode/skills/issue-creation/SKILL.md |
| Dual review, adversarial review, judgment day | judgment-day | ~/.config/opencode/skills/judgment-day/SKILL.md |
| New skills, agent instructions, AI patterns | skill-creator | ~/.config/opencode/skills/skill-creator/SKILL.md |
| Implementation commits, chained PRs, work units | work-unit-commits | ~/.config/opencode/skills/work-unit-commits/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue (`status:approved` label) — no exceptions
- Every PR MUST have exactly one `type:*` label
- Branch naming: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- Run shellcheck on modified scripts before opening PR
- Use the PR template; blank PRs are blocked by CI
- Wait for automated checks before merge

### chained-pr
- Split PRs over 400 changed lines (unless maintainer accepts `size:exception`)
- Keep each PR reviewable in ≤60 minutes
- Keep tests/docs with the unit they verify
- Include dependency diagram in every chained PR, mark current PR with 📍
- Use Stacked PRs (to main) if each slice can land independently
- Use Feature Branch Chain (with tracker) if feature must integrate before main
- Treat polluted diffs as base bugs: retarget/reboot until diff shows only current work

### cognitive-doc-design
- Lead with the answer: put decision/action/outcome first, context after
- Use progressive disclosure: happy path → details → edge cases → references
- Chunk: group related info into small sections, keep lists short
- Signpost: headings, labels, callouts, summaries for orientation
- Prefer recognition over recall: tables, checklists, examples > prose
- Design for review empathy: reviewer must verify intent without reconstructing the story

### comment-writer
- Be useful fast: start with the actionable point, don't recap the PR
- Be warm and direct, sound like a thoughtful teammate
- Keep 1-3 paragraphs or a tight bullet list
- Explain WHY when asking for a change (technical reason)
- Avoid pile-ons: comment on highest-value issue only
- In Spanish: use Rioplatense voseo (`podés`, `tenés`, `fijate`)
- No em dashes — use commas, periods, or parentheses

### customize-opencode
- Only use when editing opencode's own config files (opencode.json, .opencode/*, ~/.config/opencode/*)
- Do NOT use for user's application code
- Handle `opencode.json` / `opencode.jsonc` schema
- Respect permission rules and MCP server configs

### go-testing
- Prefer table-driven tests with `t.Run(tt.name, ...)`
- Test behavior/state transitions, not implementation trivia
- Use `t.TempDir()` for filesystem tests; never rely on real home dir
- Integration tests: skippable with `testing.Short()` when running external commands
- Bubbletea: test `Model.Update()` directly for state, use `teatest` only for interactive flows
- Golden files must be deterministic; update via repo's `-update` path then rerun without it
- Mock at small interfaces around system/command boundaries

### issue-creation
- Blank issues disabled — MUST use template (bug report or feature request)
- Every issue gets `status:needs-review` automatically on creation
- Maintainer MUST add `status:approved` before any PR opens
- Questions go to Discussions, not issues
- Search existing issues for duplicates before creating

### judgment-day
- Launch TWO blind judges in parallel with identical target/criteria; never review yourself
- Wait for both judges before synthesis
- Classify warnings: `WARNING (real)` only if normal intended use triggers it; otherwise downgrade to INFO
- Terminal states: `JUDGMENT: APPROVED` or `JUDGMENT: ESCALATED`
- After any fix agent, re-launch both judges before commit/push
- After 2 fix iterations with remaining issues, ask user whether to continue

### skill-creator
- Skill is a runtime instruction contract for LLM, not human documentation
- No `Keywords` section; preserve trigger words in `description`
- References must point to local files
- Target 180–450 tokens body, recommended max 700, hard max 1000
- Code templates/schemas go in `assets/`, conceptual detail in `references/`
- Long explanations in SKILL.md → move to supporting file
- Multiple meaningful paths → add compact decision table

### work-unit-commits
- Commit by deliverable work unit, not by file type (no "models" then "services" then "tests")
- Keep tests with the code they verify (same commit)
- Keep docs with the user-visible change they explain
- Tell a story: reviewer should understand why each commit exists from diff + message
- Each commit should be a candidate chained PR when change grows
- If SDD tasks forecast >400-line change, group into chained PR slices before implementing

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | vet-57b/AGENTS.md | Agent instructions — persona, stack, dev rules |
| README.md | vet-57b/README.md | Project overview — exercise goal, tasks, structure |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
