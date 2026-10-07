alter table public.profiles
  add column if not exists sessions_par_semaine integer not null default 3 check (sessions_par_semaine between 1 and 7),
  add column if not exists duree_session_minutes integer not null default 10 check (duree_session_minutes between 5 and 45);
