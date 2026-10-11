create or replace function public.get_or_create_notion(p_matiere_id uuid, p_nom text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom text := btrim(p_nom);
  v_notion_id uuid;
begin
  if v_nom is null or v_nom = '' then
    raise exception 'Le nom de la notion ne peut pas être vide.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_matiere_id::text || ':' || v_nom, 0));

  select id
  into v_notion_id
  from public.notions
  where matiere_id = p_matiere_id
    and nom = v_nom
  limit 1;

  if v_notion_id is not null then
    return v_notion_id;
  end if;

  insert into public.notions (matiere_id, nom, niveau)
  values (p_matiere_id, v_nom, 1)
  returning id into v_notion_id;

  return v_notion_id;
end;
$$;

revoke all on function public.get_or_create_notion(uuid, text) from public, anon, authenticated;
grant execute on function public.get_or_create_notion(uuid, text) to service_role;
