# RN Quest

A mobile-first RN nursing learning app modeled on the FNP Quest product loop: short lessons, quizzes with rationales, mixed practice, XP, streaks, total study days, progress, theme switching, and offline-ready static delivery.

The long-term curriculum is a 184-lesson traditional nursing-school pathway: foundations, assessment and skills, pathophysiology, pharmacology, Med-Surg, OB, pediatrics, mental health, community health, leadership, and NCLEX-RN integration. Every lesson and question is tagged with its traditional course, NCLEX Client Needs category, and clinical-judgment step. The current prototype contains fifty-three authored lessons and 530 original single-best-answer questions. Foundations of Nursing Practice, Health Assessment & Nursing Skills, and Pathophysiology are complete, and Pharmacology is in progress; later lessons remain planned. It is an educational prototype, not an official NCSBN product or a substitute for faculty, clinical supervision, local policy, or current clinical references.

The reviewed learning flow includes shuffled answer positions, missed-question review, last and best lesson scores, and a continue action that advances past completed lessons. Existing local progress is retained. Completion and XP measure study activity, not clinical readiness or a predicted NCLEX result. It is not an adaptive exam or full NGN simulator.

All available lesson and quiz files are pre-cached after a successful service-worker installation. Updates wait for the learner to choose when to reload. When upgrading from an older release without an update notice, close all RN Quest tabs and reopen the site; do not clear browser data because that also removes progress.

## Run locally

Use npm start, then open the printed local address.

## Validate

Use npm test for content, regression, progress, and JavaScript checks. Use npm run build to create the static dist directory.

## Cloud status

Learning progress remains local-first and `js/cloud.js` is intentionally unconfigured. Anonymous aggregate usage events use a dedicated RN Supabase project through `js/analytics.js`; setup and privacy details are documented in `docs/ANONYMOUS_ANALYTICS.md`. Do not point RN Quest at the FNP Quest backend.
