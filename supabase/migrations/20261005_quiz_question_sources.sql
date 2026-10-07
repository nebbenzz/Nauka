create table if not exists public.quiz_question_sources (
  quiz_id uuid not null references public.quiz(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  fichier_id uuid not null references public.fichiers_utilisateur(id) on delete cascade,
  page integer not null check (page > 0),
  extrait text not null check (char_length(extrait) between 10 and 500),
  primary key (quiz_id, question_id)
);

alter table public.quiz_question_sources enable row level security;

grant select on public.quiz_question_sources to authenticated;

drop policy if exists "Quiz owners can read their question sources"
  on public.quiz_question_sources;

create policy "Quiz owners can read their question sources"
  on public.quiz_question_sources for select
  to authenticated
  using (
    exists (
      select 1
      from public.quiz
      where quiz.id = quiz_question_sources.quiz_id
        and quiz.created_by = auth.uid()
    )
    and exists (
      select 1
      from public.fichiers_utilisateur
      where fichiers_utilisateur.id = quiz_question_sources.fichier_id
        and fichiers_utilisateur.user_id = auth.uid()
    )
  );