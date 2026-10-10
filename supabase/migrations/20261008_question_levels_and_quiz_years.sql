alter table public.questions
  add column if not exists niveau smallint;

update public.questions as question
set niveau = coalesce(notion.niveau, 1)
from public.notions as notion
where question.notion_id = notion.id
  and question.niveau is null;

update public.questions
set niveau = 1
where niveau is null;

alter table public.questions
  alter column niveau set not null;

alter table public.quiz
  add column if not exists niveau_cible smallint,
  add column if not exists niveau_premiere_decouverte smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'questions_niveau_range'
  ) then
    alter table public.questions
      add constraint questions_niveau_range check (niveau between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quiz_niveau_cible_range'
  ) then
    alter table public.quiz
      add constraint quiz_niveau_cible_range check (niveau_cible is null or niveau_cible between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quiz_niveau_premiere_decouverte_range'
  ) then
    alter table public.quiz
      add constraint quiz_niveau_premiere_decouverte_range check (niveau_premiere_decouverte is null or niveau_premiere_decouverte between 1 and 5);
  end if;
end
$$;