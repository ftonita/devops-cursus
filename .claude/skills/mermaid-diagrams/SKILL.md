---
name: mermaid-diagrams
description: House style for Mermaid diagrams in devops-cursus manuals — which diagram type to use for which purpose, and syntax conventions that avoid render failures. Load before writing or reviewing a mermaid code block in a manual.
---

# Mermaid diagrams in devops-cursus manuals

## Choosing a diagram type

- **`flowchart LR`** — processes and pipelines (left-to-right = time/steps
  flowing forward). Use for "here's the whole pipeline/process at a
  glance" diagrams and per-stage detail diagrams.
- **`flowchart TD`** — architecture, environments, traffic routing, or
  anything with a hierarchical/branching shape rather than a linear flow.
- **`subgraph`** — group nodes that belong to the same environment,
  version, or logical unit (e.g. `subgraph Blue["Blue (текущая, v1)"]`).
  Always give subgraphs a readable Russian label, not just an ID.

## Syntax conventions (avoid render failures)

- Multi-line node text: wrap the whole label in double quotes and use
  `\n` for the break — `A["CI сервер\nобнаруживает изменения"]`. Never
  rely on a raw newline inside brackets.
- Decision nodes use `{}`: `I{Тесты прошли?}`.
- Edge labels go between pipes: `I -- Да --> K` or `LB -->|95% трафика| Stable`.
- If a node label contains punctuation, slashes, or Cyrillic combined with
  special characters, quote it: `B["Компиляция /\nTranspile"]`.
- Keep node IDs short ASCII letters/numbers (`A`, `B1`, `Stage2`) — put the
  Russian text inside the label, not the ID.
- Dashed arrows (`-.->`) signal optional/conditional or feedback flows
  (e.g. monitoring feedback loops, gradual traffic shifts); solid arrows
  (`-->`) signal the default/primary path.

## Scope

- Keep a single diagram under ~15 nodes — split into a per-stage diagram
  (in the "Этапы подробно" section) rather than cramming everything into
  the top-level architecture diagram.
- Every manual should have at least one diagram in "Архитектура"; stage
  and strategy sections get their own diagrams only when a visual actually
  clarifies something prose doesn't (e.g. Blue-Green/Canary traffic
  splitting), not by default for every subsection.

## Reviewing

When reviewing (via `tech-reviewer`), flag: unmatched brackets/quotes,
unquoted labels containing `()`, `/`, or `:`, raw newlines inside node
text, and diagrams exceeding the ~15-node guideline.
