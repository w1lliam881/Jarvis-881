-- 0004: Scout (ny agent), frågor från agenterna med svarsalternativ, och bilder till agenterna
-- (referensbilder för Scout och bildrutor från klipp för Marketer). Går att köra flera gånger.

-- 1. Scout får spara körningar och skriva i chatten
alter table public.agent_runs drop constraint if exists agent_runs_agent_check;
alter table public.agent_runs add constraint agent_runs_agent_check
  check (agent in ('builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer', 'scout'));

alter table public.agent_messages drop constraint if exists agent_messages_thread_check;
alter table public.agent_messages add constraint agent_messages_thread_check
  check (thread = 'grupp' or thread ~ '^dm:(builder|reviewer|advisor|reminder|noter|planner|marketer|scout)$');
alter table public.agent_messages drop constraint if exists agent_messages_sender_check;
alter table public.agent_messages add constraint agent_messages_sender_check
  check (sender in ('du', 'builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer', 'scout'));

-- 2. Frågor: en agent frågar dig något och ger svarsalternativ. Du svarar med ett vanligt meddelande (reply_to = frågan).
alter table public.agent_messages drop constraint if exists agent_messages_kind_check;
alter table public.agent_messages add constraint agent_messages_kind_check check (kind in ('chatt', 'plan', 'förslag', 'fråga'));
alter table public.agent_messages add column if not exists options jsonb;

-- 3. Bilder till agenterna. Hålls utanför records så att appen inte laddar dem vid start.
--    kind 'scout-ref' = referensbild till en Scout-sökning (ref_id = sökningens id)
--    kind 'clip-frame' = bildruta ur ett klipp (ref_id = klippets id), tagen i webbläsaren när du laddar upp videon
create table if not exists public.agent_media (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  kind text not null check (kind in ('scout-ref', 'clip-frame')),
  ref_id text not null,
  idx int not null default 0,
  data text not null check (data like 'data:image/%' and length(data) < 400000),
  note text not null default '',
  by_email text
);
create index if not exists agent_media_ref on public.agent_media (kind, ref_id, idx);
alter table public.agent_media enable row level security;
drop policy if exists agent_media_rw on public.agent_media;
create policy agent_media_rw on public.agent_media for all using (public.is_allowed()) with check (public.is_allowed());
revoke all on public.agent_media from anon;
grant select, insert, update, delete on public.agent_media to authenticated;
grant all on public.agent_media to service_role;

-- 4. Notis när en agent ställer en fråga
create or replace function public.agent_messages_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sender <> 'du' and (new.thread like 'dm:%' or new.kind in ('förslag', 'fråga')) then
    perform public.jarvis_notify(jsonb_build_object(
      'mode', 'agent',
      'agent', new.sender,
      'title', case
        when new.kind = 'förslag' then initcap(new.sender) || ' vill ha ditt ja'
        when new.kind = 'fråga' then initcap(new.sender) || ' har en fråga'
        else initcap(new.sender) || ' svarade' end,
      'body', left(new.body, 180),
      'url', case when new.thread like 'dm:%' then './#/byn/' || new.sender else './#/byn?chatt=grupp' end
    ));
  end if;
  return new;
end $$;
