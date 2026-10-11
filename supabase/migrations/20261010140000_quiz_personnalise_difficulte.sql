alter table public.quiz
  add column if not exists difficulte text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_difficulte_range'
  ) then
    alter table public.quiz
      add constraint quiz_difficulte_range
      check (difficulte is null or difficulte in ('facile', 'moyen', 'difficile'));
  end if;
end
$$;

update public.quiz
set difficulte = 'moyen'
where type = 'personnalise'
  and difficulte is null;
