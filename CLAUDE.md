# devops-cursus

Repository of DevOps mentoring materials ("manuals") written in Russian for a
DevOps mentoring course. This file is agent-facing (English); the learning
content itself is written in Russian for the target audience.

## Repo layout

- `manuals/` — numbered manual chapters (`NN-topic-manual.MD`), the actual
  learning content. Written in Russian, one topic per file.
- `templates/manual-template.MD` — canonical section structure every new
  manual must follow (mirrors `manuals/02-cicd-manual.MD`).
- `glossary/GLOSSARY.MD` — shared glossary of terms introduced across
  manuals. Keep in sync whenever a manual introduces a new term.
- `ROADMAP.MD` — planned/completed topics with their target manual numbers
  and status.
- `.claude/agents/` — subagents for the authoring workflow:
  - `devops-writer` (opus) — drafts new manuals from the template.
  - `tech-reviewer` (opus) — checks technical accuracy, structure, and
    diagram syntax of a manual.
  - `quiz-builder` (sonnet) — generates a companion self-check/lab file for
    a finished manual.
  - `devops-researcher` (haiku) — read-only fact-gathering (WebSearch/
    WebFetch). Called by `devops-writer` and `tech-reviewer` to offload
    research; never invoked to produce manual content itself.

  **Model/cost strategy:** research and lookup is cheap and mechanical, so
  it runs on `devops-researcher` (haiku). Writing and reviewing require
  judgment and are worth paying for, so they run on `devops-writer` /
  `tech-reviewer` (opus). `devops-writer` and `tech-reviewer` do not call
  WebSearch/WebFetch directly — they delegate to `devops-researcher` (via
  the `Agent` tool) and batch related questions into one delegation rather
  than one call per fact, to avoid paying subagent-spawn overhead
  repeatedly. `quiz-builder` needs judgment but no research, so it runs on
  the mid-tier `sonnet`.
- `.claude/skills/` — reusable skills backing that workflow:
  - `new-manual` — **the entry point for a brand-new manual.** Orchestrates
    devops-writer → tech-reviewer → fix loop → quiz-builder → ROADMAP.MD
    update automatically. Triggers on requests like "напиши мануал про X" /
    "создай урок по Y" — don't call `devops-writer` directly for those.
  - `manual-template` — the section structure and style rules.
  - `mermaid-diagrams` — house style for Mermaid diagrams used in manuals.
  - `glossary-sync` — how to extract and add new terms to the glossary.

## Conventions

- Manual content (headings, prose, diagrams, tables) is written in
  **Russian** — the audience is Russian-speaking mentees.
- File naming: `NN-topic-manual.MD`, two-digit zero-padded prefix matching
  the order in `ROADMAP.MD`.
- Every manual follows the section order in `templates/manual-template.MD`:
  Введение → Что такое X → сравнение ключевых понятий → архитектура
  (Mermaid) → этапы/компоненты подробно → инструменты (таблица) →
  практические примеры конфигураций → стратегии/паттерны (Mermaid) →
  best practices → частые ошибки и антипаттерны (таблица) → метрики →
  заключение.
- Mermaid diagrams follow `.claude/skills/mermaid-diagrams` (flowchart
  LR for processes/pipelines, TD for architecture/environments, subgraphs
  for grouping, `\n` inside quoted labels for line breaks).
- New technical terms (acronyms, tool names, patterns) get an entry in
  `glossary/GLOSSARY.MD` — see `.claude/skills/glossary-sync`.

## Workflow for a new manual

Any request to write/create/add a new manual, lesson, or chapter on a
DevOps topic should go through the **`new-manual` skill** — don't hand-roll
the steps below, the skill does them automatically:

1. Resolve topic + number/filename against `ROADMAP.MD`.
2. `devops-writer` drafts `manuals/NN-topic-manual.MD` (and syncs the
   glossary itself).
3. `tech-reviewer` reviews it; if `VERDICT: NEEDS_FIXES`, its `[blocking]`
   findings go back to `devops-writer` for a targeted fix — repeats up to
   3 rounds, then stops and surfaces whatever's left rather than looping
   forever.
4. `quiz-builder` generates the companion `manuals/NN-topic-quiz.MD`.
5. `ROADMAP.MD` status is updated (✅ if the review converged, 🚧 with a
   note if the round cap was hit).

Editing an *existing* manual (expand a section, fix something) doesn't need
the full pipeline — call `devops-writer` or `tech-reviewer` directly.
