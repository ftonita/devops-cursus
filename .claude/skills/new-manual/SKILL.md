---
name: new-manual
description: Orchestrates the full devops-cursus pipeline for a brand-new manual — devops-writer drafts, tech-reviewer reviews, fixes loop back to devops-writer until the review comes back clean (or a round cap is hit), then quiz-builder, then ROADMAP.MD is updated. Use this whenever the user asks to write, create, draft, or add a new DevOps manual/lesson/chapter/урок on a topic — in Russian or English ("напиши мануал про Docker", "создай урок по Kubernetes", "добавь главу про мониторинг", "draft a chapter on Terraform"). Do not call the devops-writer agent directly for a brand-new topic — this pipeline is the entry point so the result always gets reviewed and iterated on automatically.
---

# New manual pipeline

You are orchestrating `devops-writer`, `tech-reviewer`, and `quiz-builder`
(via the `Agent` tool) to take a topic from nothing to a finished, reviewed
manual — without the user having to invoke each agent by hand or babysit
the loop. Every `Agent` call in this pipeline is **foreground**
(`run_in_background: false`) — each step's result is required before the
next step can happen, so nothing here should run in the background.

## Step 0 — resolve the topic and slot

1. Read `ROADMAP.MD`. If the user named a topic already listed there, use
   its number and filename. If it's a new topic, pick the next free number
   and propose the filename — if the topic is ambiguous or could overlap
   an existing entry, ask the user to confirm before proceeding rather than
   guessing.
2. Set that row's status to 🚧 in `ROADMAP.MD` so the repo state reflects
   work in progress even if the pipeline gets interrupted.

## Step 1 — draft

Call `devops-writer` (foreground) with the topic and target filename
(`manuals/NN-topic-manual.MD`). It drafts the manual and syncs new terms
into `glossary/GLOSSARY.MD` itself (per its own instructions) — you don't
need to do that separately.

## Step 2 — review / fix loop

Run up to **3 rounds**:

1. Call `tech-reviewer` (foreground) on the manual file.
2. Read its `VERDICT:` line.
   - `VERDICT: READY` → break out of the loop, go to Step 3.
   - `VERDICT: NEEDS_FIXES` → collect the `[blocking]` findings (ignore
     `[minor]` ones — the reviewer already either fixed them itself or
     they don't block readiness) and call `devops-writer` (foreground)
     again, passing it the manual path and the exact blocking findings
     list, asking it to make targeted fixes for those findings only — not
     a rewrite.
3. Loop back to 1.

If round 3 finishes and the verdict is still `NEEDS_FIXES`: stop looping.
Don't keep spending rounds chasing convergence — surface the remaining
blocking findings to the user directly, leave the manual's `ROADMAP.MD`
status at 🚧, and let the user decide whether to continue manually or
accept the gaps. This is a deliberate cost cap, not a quality shortcut —
say so plainly if it triggers.

## Step 3 — quiz

Call `quiz-builder` (foreground) to generate the companion
`manuals/NN-topic-quiz.MD`. Skip this step only if the user explicitly
said they don't want a quiz for this manual.

## Step 4 — close out

1. Set the topic's `ROADMAP.MD` status to ✅ (only reached if Step 2 ended
   with `VERDICT: READY`).
2. Report back to the user (in Russian, per this repo's standing
   convention): what was created (manual + quiz file paths), how many
   review rounds it took, and a one-line mention of any `[minor]` findings
   the reviewer left as-is. If the loop was cut off at the round cap,
   lead with that instead of burying it.

## Notes

- Don't skip straight to calling `devops-writer` for what looks like a
  small ask ("допиши раздел про X в существующий мануал про Y") — this
  pipeline is for **new** manuals. Editing an existing one is a direct
  `devops-writer` or `tech-reviewer` call, not this skill.
- Don't parallelize Step 1/2/3 — they're strictly sequential by design,
  each one depends on the previous step's output.
