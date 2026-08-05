---
name: manual-template
description: House structure and style rules for devops-cursus manuals — the section order, tone, and formatting every manual (NN-topic-manual.MD) must follow. Load before drafting a new manual or restructuring an existing one.
---

# Manual template

The canonical skeleton lives at `templates/manual-template.MD` — read it
before writing. This skill is the condensed checklist version.

## Required section order

1. Заголовок + `**Доклад для DevOps-менторства**` + Содержание (linked TOC)
2. Введение — problem/benefit contrast (без X / с X)
3. Что такое {Тема} — definition, table for acronyms/variants if relevant
4. Ключевые понятия — comparison of variants, if the topic has forks
   (e.g. CI vs CD vs Continuous Deployment)
5. Архитектура — one "whole topic at a glance" Mermaid diagram, optionally
   a second for a related cross-section (environments, components)
6. Этапы/компоненты подробно — one `###` subsection per stage/component
7. Инструменты — a category → tools table
8. Практические примеры конфигураций — 2-3 real, minimal, copy-adaptable
   configs
9. Стратегии/паттерны — one Mermaid diagram + explanation per pattern, if
   the topic has multiple practical approaches
10. Best Practices — numbered list, each item bolded + a "why" clause
11. Частые ошибки и антипаттерны — Антипаттерн / Проблема / Решение table
12. Метрики эффективности — maturity metrics, if the field has established
    ones (like DORA for CI/CD)
13. Заключение — 3-5 sentences: value delivered + "where to start"

Sections 4, 9, and 12 are optional — include only if they genuinely apply to
the topic. Never pad a section just to keep the count.

## Style rules

- Everything (headings, prose, table contents) is in Russian.
- `---` horizontal rules separate top-level sections.
- Tables over prose whenever comparing 3+ items (tools, antipatterns,
  acronyms).
- Every claim about a specific tool's behavior should be something you'd be
  comfortable defending if a mentee tried it and it didn't match — verify
  rather than guess.
- Mermaid diagrams follow the `mermaid-diagrams` skill.
- New terms get a glossary entry — see the `glossary-sync` skill.

## When to use this skill

- Drafting a brand-new manual (typically via the `devops-writer` agent).
- Restructuring an existing manual that has drifted from the template.
- Reviewing a manual's structure (the `tech-reviewer` agent checks against
  this same order).
