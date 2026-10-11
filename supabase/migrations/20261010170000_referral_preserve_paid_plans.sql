create or replace function public.recompenser_parrainage(p_referred_id uuid, p_quiz_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  parrainage public.referrals%rowtype;
begin
  if auth.uid() is distinct from p_referred_id then
    raise exception 'Utilisateur non autorisé';
  end if;

  if not exists (
    select 1 from public.resultats
    where user_id = p_referred_id and quiz_id = p_quiz_id
  ) then
    return false;
  end if;

  select * into parrainage
  from public.referrals
  where referred_id = p_referred_id and rewarded_at is null
  for update;

  if not found then return false; end if;

  update public.referrals
  set questionnaire_completed_at = coalesce(questionnaire_completed_at, now()), rewarded_at = now()
  where id = parrainage.id;

  update public.profiles
  set plan = 'pro',
      pro_expires_at = case
        when plan = 'pro' and pro_expires_at is null and abonnement_intervalle is null then null
        else greatest(coalesce(pro_expires_at, now()), now()) + interval '7 days'
      end,
      abonnement_intervalle = case
        when plan = 'pro' and pro_expires_at is null and abonnement_intervalle is null then null
        when abonnement_intervalle in ('mensuel', 'annuel') then abonnement_intervalle
        else 'parrainage'
      end
  where id in (parrainage.referrer_id, parrainage.referred_id);

  return true;
end;
$$;

grant execute on function public.recompenser_parrainage(uuid, uuid) to authenticated;
