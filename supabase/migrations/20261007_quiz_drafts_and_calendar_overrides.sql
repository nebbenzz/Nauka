create table if not exists public.quiz_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quiz(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

alter table public.quiz_drafts enable row level security;
grant select, insert, update, delete on public.quiz_drafts to authenticated;

drop policy if exists "Users can manage their own quiz drafts" on public.quiz_drafts;
create policy "Users can manage their own quiz drafts"
  on public.quiz_drafts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.revision_calendar_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  jour_initial date not null,
  jour_cible date,
  ignoree boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, jour_initial),
  check ((ignoree and jour_cible is null) or (not ignoree and jour_cible is not null)),
  check (jour_cible is null or jour_cible <> jour_initial)
);

alter table public.revision_calendar_overrides enable row level security;
grant select, insert, update, delete on public.revision_calendar_overrides to authenticated;

drop policy if exists "Users can manage their own calendar overrides" on public.revision_calendar_overrides;
create policy "Users can manage their own calendar overrides"
  on public.revision_calendar_overrides for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);