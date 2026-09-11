# NurseLattice RN Quest anonymous daily analytics

NurseLattice RN Quest records a minimal set of anonymous aggregate events on the published `nurselattice.github.io` site. This feature is independent from local learning progress and does not enable accounts or progress synchronization.

The browser sends only the event name, optional lesson number, app version, broad source category, a random browser identifier, a random daily identifier, a session identifier, and the server-generated event time. It does not send an account ID, email, score, answer, XP, streak, study dates, URL, raw referrer URL, patient information, or free-form metadata.

Statistics do not run on local preview pages. They are disabled when Global Privacy Control or Do Not Track is enabled, or when the visitor turns them off on the About page.

## Supabase setup

1. Open the trusted SQL Editor in the dedicated NurseLattice RN Quest Supabase project.
2. Run `supabase/rn_analytics_setup.sql` once.
3. Confirm that `anon` can insert into `public.rn_analytics_events` but cannot select, update, or delete rows.
4. Confirm that `anon` and `authenticated` cannot select `public.rn_analytics_daily_summary`.
5. Publish the matching NurseLattice RN Quest web release only after these checks pass.

The public browser uses only the project's publishable key. Never place a secret key, service-role key, or database password in this repository.

## Daily Summary

Open Database → Views → `rn_analytics_daily_summary`, or run this query in the trusted SQL Editor:

```sql
select *
from public.rn_analytics_daily_summary
order by day desc;
```

The view groups events by America/Los_Angeles calendar day and reports page views, anonymous browser estimates, new and returning browsers, sessions, study sessions, learners, lesson opens, quiz starts and completions, practice completions, and broad acquisition sources.

These values are browser estimates. One person using multiple devices or clearing browser data may appear more than once, and public anonymous event submission cannot prove human identity.

## Retention

Review retention periodically. To retain 90 days, run this manually in the trusted SQL Editor:

```sql
delete from public.rn_analytics_events
where occurred_at < now() - interval '90 days';
```
