---
name: glossary-sync
description: How to keep glossary/GLOSSARY.MD in sync as manuals are added — extracting new terms and linking them back to source. Load after drafting/editing a manual, before considering it finished.
---

# Glossary sync

`glossary/GLOSSARY.MD` is the single shared glossary across all manuals in
`devops-cursus`. It prevents each manual from re-explaining the same terms
and lets mentees look a term up once regardless of which manual introduced
it.

## Process

1. Read the manual you just wrote or edited.
2. Identify candidate terms: acronyms, tool-agnostic patterns/strategies
   (e.g. Blue-Green Deployment), and named practices/principles (e.g.
   Immutable Artifact, Infrastructure as Code) — not vendor product names
   (Prometheus, Terraform) unless the manual gives them a specific
   definition beyond "a tool that does X".
3. For each candidate, check `glossary/GLOSSARY.MD`:
   - **Not present** → add a new row, alphabetically ordered by the term
     (Latin-alphabet terms and acronyms sort before Cyrillic ones, matching
     the existing table).
   - **Present but the manual's usage conflicts with it** → flag this to
     the user/reviewer rather than silently overwriting; the two manuals
     may be describing genuinely different things.
   - **Present and consistent** → leave it, optionally link to it from the
     manual instead of repeating the definition.
4. Each new row: `| Термин | Короткое определение на русском | Ссылка на
   мануал-источник, вида [NN-topic-manual](../manuals/NN-topic-manual.MD#anchor) |`.
   Keep definitions to one sentence — the glossary is a lookup index, not a
   second copy of the manual.

## When to use this skill

- Right after `devops-writer` finishes a draft, before marking the manual
  ✅ in `ROADMAP.MD`.
- During a `tech-reviewer` pass, to flag terms used but never defined
  anywhere (inline or in the glossary).
