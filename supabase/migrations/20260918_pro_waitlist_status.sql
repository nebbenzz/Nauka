create or replace function public.est_inscrit_pro_waitlist(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pro_waitlist
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.est_inscrit_pro_waitlist(text) to anon, authenticated;
