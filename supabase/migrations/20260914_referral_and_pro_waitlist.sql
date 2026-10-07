alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists pro_expires_at timestamptz;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  questionnaire_completed_at timestamptz,
  rewarded_at timestamptz,
  constraint referrals_not_self check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_id_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

create policy "Users can read their referrals"
  on public.referrals for select
  to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

create table if not exists public.pro_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.pro_waitlist enable row level security;

create policy "Anyone can join the Pro waitlist"
  on public.pro_waitlist for insert
  to anon, authenticated
  with check (char_length(email) between 3 and 320);

create or replace function public.generer_code_parrainage()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  nouveau_code text;
begin
  loop
    nouveau_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = nouveau_code);
  end loop;
  return nouveau_code;
end;
$$;

grant execute on function public.generer_code_parrainage() to authenticated;

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
  set plan = case when plan = 'pro' and pro_expires_at is null then plan else 'pro' end,
      pro_expires_at = case when plan = 'pro' and pro_expires_at is null then null else greatest(coalesce(pro_expires_at, now()), now()) + interval '7 days' end,
      abonnement_intervalle = case when plan = 'pro' and pro_expires_at is null then abonnement_intervalle else 'parrainage' end
  where id in (parrainage.referrer_id, parrainage.referred_id);

  return true;
end;
$$;

grant execute on function public.recompenser_parrainage(uuid, uuid) to authenticated;
