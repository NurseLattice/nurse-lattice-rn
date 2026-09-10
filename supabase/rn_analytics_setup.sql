-- RN Quest anonymous usage analytics and owner-only daily summary.
-- Run once in the new RN Quest project's trusted Supabase SQL Editor.

begin;

create table if not exists public.rn_analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_name text not null check (event_name in (
    'page_view',
    'lesson_open',
    'lesson_quiz_start',
    'lesson_quiz_complete',
    'practice_complete'
  )),
  visitor_id uuid not null,
  visitor_day_id uuid not null,
  session_id uuid not null,
  lesson_number smallint check (lesson_number between 1 and 184),
  source text not null check (source in ('facebook', 'instagram', 'google', 'linkedin', 'direct', 'other')),
  app_version text not null check (char_length(app_version) between 1 and 32)
);

comment on table public.rn_analytics_events is
'Anonymous RN Quest usage events. Contains no account ID, email, score, answer, XP, streak, study date, URL, referrer URL, or free-form metadata.';

create index if not exists rn_analytics_events_occurred_at_idx
on public.rn_analytics_events (occurred_at desc);

create index if not exists rn_analytics_events_visitor_idx
on public.rn_analytics_events (visitor_id, event_name, occurred_at desc);

create index if not exists rn_analytics_events_session_idx
on public.rn_analytics_events (session_id, occurred_at desc);

alter table public.rn_analytics_events enable row level security;

revoke all on table public.rn_analytics_events from anon, authenticated;
grant insert on table public.rn_analytics_events to anon;

drop policy if exists "Anonymous visitors can submit constrained RN analytics" on public.rn_analytics_events;
create policy "Anonymous visitors can submit constrained RN analytics"
on public.rn_analytics_events
for insert
to anon
with check (
  event_name in ('page_view', 'lesson_open', 'lesson_quiz_start', 'lesson_quiz_complete', 'practice_complete')
  and visitor_id is not null
  and visitor_day_id is not null
  and session_id is not null
  and source in ('facebook', 'instagram', 'google', 'linkedin', 'direct', 'other')
  and app_version <> ''
  and occurred_at between now() - interval '5 minutes' and now() + interval '5 minutes'
);

create or replace view public.rn_analytics_daily_summary
with (security_invoker = true)
as
with events as (
  select
    (occurred_at at time zone 'America/Los_Angeles')::date as day,
    visitor_id,
    session_id,
    source,
    event_name
  from public.rn_analytics_events
), visitor_days as (
  select distinct day, visitor_id
  from events
  where event_name = 'page_view'
), visitor_summary as (
  select
    current_day.day,
    count(*) as unique_browsers,
    count(*) filter (where exists (
      select 1 from visitor_days prior_day
      where prior_day.visitor_id = current_day.visitor_id
        and prior_day.day < current_day.day
    )) as returning_browsers,
    count(*) filter (where not exists (
      select 1 from visitor_days prior_day
      where prior_day.visitor_id = current_day.visitor_id
        and prior_day.day < current_day.day
    )) as new_browsers
  from visitor_days current_day
  group by current_day.day
), learner_days as (
  select distinct day, visitor_id
  from events
  where event_name = 'lesson_open'
), learner_summary as (
  select
    current_day.day,
    count(*) as learners,
    count(*) filter (where exists (
      select 1 from learner_days prior_day
      where prior_day.visitor_id = current_day.visitor_id
        and prior_day.day < current_day.day
    )) as returning_learners
  from learner_days current_day
  group by current_day.day
), event_summary as (
  select
    day,
    count(*) filter (where event_name = 'page_view') as page_views,
    count(distinct session_id) as sessions,
    count(distinct session_id) filter (where event_name = 'lesson_open') as study_sessions,
    count(*) filter (where event_name = 'lesson_open') as lesson_opens,
    count(*) filter (where event_name = 'lesson_quiz_start') as lesson_quiz_starts,
    count(*) filter (where event_name = 'lesson_quiz_complete') as lesson_quiz_completions,
    count(*) filter (where event_name = 'practice_complete') as practice_completions,
    count(*) filter (where event_name in ('lesson_quiz_complete', 'practice_complete')) as total_activity_completions,
    count(distinct visitor_id) filter (where event_name = 'page_view' and source = 'facebook') as facebook_browsers,
    count(distinct visitor_id) filter (where event_name = 'page_view' and source = 'google') as google_browsers,
    count(distinct visitor_id) filter (where event_name = 'page_view' and source = 'instagram') as instagram_browsers,
    count(distinct visitor_id) filter (where event_name = 'page_view' and source = 'linkedin') as linkedin_browsers,
    count(distinct visitor_id) filter (where event_name = 'page_view' and source = 'direct') as direct_browsers,
    count(distinct visitor_id) filter (where event_name = 'page_view' and source = 'other') as other_source_browsers
  from events
  group by day
)
select
  event_summary.day,
  event_summary.page_views,
  coalesce(visitor_summary.unique_browsers, 0) as unique_browsers,
  coalesce(visitor_summary.returning_browsers, 0) as returning_browsers,
  coalesce(visitor_summary.new_browsers, 0) as new_browsers,
  event_summary.sessions,
  event_summary.study_sessions,
  coalesce(learner_summary.learners, 0) as learners,
  coalesce(learner_summary.returning_learners, 0) as returning_learners,
  event_summary.lesson_opens,
  event_summary.lesson_quiz_starts,
  event_summary.lesson_quiz_completions,
  event_summary.practice_completions,
  event_summary.total_activity_completions,
  event_summary.facebook_browsers,
  event_summary.google_browsers,
  event_summary.instagram_browsers,
  event_summary.linkedin_browsers,
  event_summary.direct_browsers,
  event_summary.other_source_browsers
from event_summary
left join visitor_summary using (day)
left join learner_summary using (day)
order by event_summary.day desc;

comment on view public.rn_analytics_daily_summary is
'Owner-only daily RN Quest analytics grouped by America/Los_Angeles day. Browser identifiers are anonymous estimates, not verified people.';

revoke all on table public.rn_analytics_daily_summary from anon, authenticated;

commit;

-- Verification query to run in the trusted SQL Editor after setup:
-- select * from public.rn_analytics_daily_summary order by day desc;
