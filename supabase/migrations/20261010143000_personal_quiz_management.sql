create or replace function public.update_personal_quiz_metadata(
  p_quiz_id uuid,
  p_user_id uuid,
  p_titre text,
  p_difficulte text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quiz
  set titre = btrim(p_titre),
      difficulte = p_difficulte
  where id = p_quiz_id
    and created_by = p_user_id
    and type = 'personnalise';

  if not found then
    raise exception 'Questionnaire personnalisé introuvable.';
  end if;
end;
$$;

create or replace function public.replace_personal_quiz_questions(
  p_quiz_id uuid,
  p_quiz_genere_id uuid,
  p_user_id uuid,
  p_ordres_a_remplacer integer[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nouvelles_questions integer;
  v_questions_ciblees integer;
begin
  if not exists (
    select 1 from public.quiz
    where id = p_quiz_id and created_by = p_user_id and type = 'personnalise'
  ) then
    raise exception 'Questionnaire personnalisé à modifier introuvable.';
  end if;

  if not exists (
    select 1 from public.quiz
    where id = p_quiz_genere_id and created_by = p_user_id and type = 'personnalise'
  ) then
    raise exception 'Questionnaire temporaire généré introuvable.';
  end if;

  select count(*) into v_nouvelles_questions
  from public.quiz_questions
  where quiz_id = p_quiz_genere_id;

  if p_ordres_a_remplacer is not null then
    select count(*) into v_questions_ciblees
    from public.quiz_questions
    where quiz_id = p_quiz_id
      and ordre = any (p_ordres_a_remplacer);

    if cardinality(p_ordres_a_remplacer) = 0 or v_questions_ciblees <> cardinality(p_ordres_a_remplacer) or v_nouvelles_questions <> cardinality(p_ordres_a_remplacer) then
      raise exception 'La sélection des questions à régénérer est invalide.';
    end if;

    delete from public.quiz_question_sources as source
    using public.quiz_questions as liaison
    where liaison.quiz_id = p_quiz_id
      and liaison.ordre = any (p_ordres_a_remplacer)
      and source.quiz_id = p_quiz_id
      and source.question_id = liaison.question_id;

    delete from public.quiz_questions
    where quiz_id = p_quiz_id
      and ordre = any (p_ordres_a_remplacer);

    insert into public.quiz_questions (quiz_id, question_id, ordre)
    select p_quiz_id, nouvelles.question_id, p_ordres_a_remplacer[nouvelles.rang]
    from (
      select question_id, row_number() over (order by ordre)::integer as rang
      from public.quiz_questions
      where quiz_id = p_quiz_genere_id
    ) as nouvelles;
  else
    delete from public.quiz_question_sources where quiz_id = p_quiz_id;
    delete from public.quiz_questions where quiz_id = p_quiz_id;

    insert into public.quiz_questions (quiz_id, question_id, ordre)
    select p_quiz_id, question_id, ordre
    from public.quiz_questions
    where quiz_id = p_quiz_genere_id;
  end if;

  insert into public.quiz_question_sources (quiz_id, question_id, fichier_id, page, extrait)
  select p_quiz_id, source.question_id, source.fichier_id, source.page, source.extrait
  from public.quiz_question_sources as source
  join public.quiz_questions as liaison
    on liaison.quiz_id = p_quiz_genere_id
    and liaison.question_id = source.question_id
  where source.quiz_id = p_quiz_genere_id;

  update public.quiz as cible
  set titre = genere.titre,
      type = genere.type,
      matiere_id = genere.matiere_id,
      est_avance = genere.est_avance,
      duree_secondes = genere.duree_secondes,
      formation_cible = genere.formation_cible,
      niveau_cible = genere.niveau_cible,
      niveau_premiere_decouverte = genere.niveau_premiere_decouverte,
      difficulte = genere.difficulte
  from public.quiz as genere
  where cible.id = p_quiz_id
    and genere.id = p_quiz_genere_id;

  delete from public.quiz where id = p_quiz_genere_id;
end;
$$;

create or replace function public.delete_personal_quiz_owned(p_quiz_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.quiz
  where id = p_quiz_id
    and created_by = p_user_id
    and type = 'personnalise';

  if not found then
    raise exception 'Questionnaire personnalisé introuvable.';
  end if;
end;
$$;

revoke all on function public.update_personal_quiz_metadata(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.replace_personal_quiz_questions(uuid, uuid, uuid, integer[]) from public, anon, authenticated;
revoke all on function public.delete_personal_quiz_owned(uuid, uuid) from public, anon, authenticated;
grant execute on function public.update_personal_quiz_metadata(uuid, uuid, text, text) to service_role;
grant execute on function public.replace_personal_quiz_questions(uuid, uuid, uuid, integer[]) to service_role;
grant execute on function public.delete_personal_quiz_owned(uuid, uuid) to service_role;
