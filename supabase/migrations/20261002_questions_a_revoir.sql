create table if not exists public.questions_a_revoir (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  quiz_id uuid not null references public.quiz(id) on delete cascade,
  repetitions integer not null default 0 check (repetitions >= 0),
  a_revoir_le timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists questions_a_revoir_due_idx
  on public.questions_a_revoir (user_id, a_revoir_le);

alter table public.questions_a_revoir enable row level security;

grant select on public.questions_a_revoir to authenticated;

drop policy if exists "Users can read their own review questions"
  on public.questions_a_revoir;

create policy "Users can read their own review questions"
  on public.questions_a_revoir for select
  to authenticated
  using (auth.uid() = user_id);
