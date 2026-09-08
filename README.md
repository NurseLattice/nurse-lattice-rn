# RN Quest

A mobile-first NCLEX-RN learning pilot modeled on the FNP Quest product loop: short lessons, quizzes with rationales, mixed practice, XP, streaks, total study days, progress, theme switching, and offline-ready static delivery.

The pilot curriculum follows the eight Client Needs content areas in the official 2026 NCLEX-RN Test Plan. It includes one starter lesson per area and three original questions per lesson. It is an educational prototype, not an official NCSBN product or a substitute for faculty, clinical supervision, local policy, or current clinical references.

## Run locally

Use npm start, then open the printed local address.

## Validate

Use npm test for content, regression, progress, and JavaScript checks. Use npm run build to create the static dist directory.

## Cloud status

The pilot is intentionally local-first. A separate RN Supabase project can be connected later through js/cloud.js. Do not point it at the FNP Quest backend.

