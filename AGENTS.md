# RN Quest project rules

RN Quest is a mobile-first NCLEX-RN learning web app. Preserve lessons, quizzes, XP, streak, streak freeze, total study days, progress, theme switching, offline support, and version parity.

## Content

Keep the curriculum aligned to the current official NCLEX-RN test plan. Questions must be original, have one defensible best answer, plausible distractors, and a teaching explanation. Do not present the app as medical advice, clinical decision support, continuing education, or official NCSBN material.

## Safety and data

Never reuse FNP Quest storage keys, credentials, user data, or Supabase projects. Browser code may contain only a publishable key. Any future exposed database table must use RLS and account ownership policies.

## Testing

Before release, run npm test and npm run build. Verify mobile layout, all lessons and quizzes, answer explanations, light/dark themes, XP persistence, streak behavior, unique total study days, version parity, and that no FNP or secret credentials leaked into the project.

