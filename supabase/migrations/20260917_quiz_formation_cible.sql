alter table public.quiz
  add column if not exists formation_cible text;

create index if not exists quiz_formation_cible_idx
  on public.quiz (formation_cible);