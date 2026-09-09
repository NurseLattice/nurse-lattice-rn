# RN Quest

A mobile-first RN nursing learning app modeled on the FNP Quest product loop: short lessons, quizzes with rationales, mixed practice, XP, streaks, total study days, progress, theme switching, and offline-ready static delivery.

The long-term curriculum is a 184-lesson traditional nursing-school pathway: foundations, assessment and skills, pathophysiology, pharmacology, Med-Surg, OB, pediatrics, mental health, community health, leadership, and NCLEX-RN integration. Every lesson and question is tagged with its traditional course, NCLEX Client Needs category, and clinical-judgment step. The current local prototype contains fourteen authored lessons and 112 original questions. It is an educational prototype, not an official NCSBN product or a substitute for faculty, clinical supervision, local policy, or current clinical references.

## Run locally

Use npm start, then open the printed local address.

## Validate

Use npm test for content, regression, progress, and JavaScript checks. Use npm run build to create the static dist directory.

## Cloud status

The pilot is intentionally local-first. A separate RN Supabase project can be connected later through js/cloud.js. Do not point it at the FNP Quest backend.
