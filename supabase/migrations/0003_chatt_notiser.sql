-- 0003: Planner och Marketer, chatten med agenterna (telefonen och byrådet) och notiser som faktiskt kommer fram.
-- Går att köra flera gånger. Ändrar ingen affärsdata.

-- 1. Två nya agenter får spara körningar
alter table public.agent_runs drop constraint if exists agent_runs_agent_check;
alter table public.agent_runs add constraint agent_runs_agent_check
  check (agent in ('builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer'));

-- 2. Chatten: telefonen i varje hus (thread = 'dm:<agent>') och gruppchatten (thread = 'grupp')
create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  thread text not null check (thread = 'grupp' or thread ~ '^dm:(builder|reviewer|advisor|reminder|noter|planner|marketer)$'),
  sender text not null check (sender in ('du', 'builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer')),
  author text,
  body text not null check (length(body) between 1 and 4000),
  kind text not null default 'chatt' check (kind in ('chatt', 'plan', 'förslag')),
  status text check (status in ('väntar', 'godkänd', 'avvisad')),
  reply_to uuid references public.agent_messages(id) on delete set null,
  decided_at timestamptz,
  decided_by text
);
create index if not exists agent_messages_thread_at on public.agent_messages (thread, at desc);

alter table public.agent_messages enable row level security;
drop policy if exists agent_messages_r on public.agent_messages;
drop policy if exists agent_messages_i on public.agent_messages;
drop policy if exists agent_messages_u on public.agent_messages;
-- Läsa: alla i allowed_users
create policy agent_messages_r on public.agent_messages for select using (public.is_allowed());
-- Skriva från appen: bara som 'du', bara vanliga meddelanden, med din egen e-post
create policy agent_messages_i on public.agent_messages for insert
  with check (public.is_allowed() and sender = 'du' and kind = 'chatt' and status is null and lower(coalesce(author, '')) = lower(auth.jwt() ->> 'email'));
-- Ändra från appen: bara svaret på ett förslag (godkänd/avvisad)
create policy agent_messages_u on public.agent_messages for update
  using (public.is_allowed() and kind = 'förslag')
  with check (public.is_allowed() and kind = 'förslag' and status in ('godkänd', 'avvisad'));

revoke all on public.agent_messages from anon, authenticated;
grant select, insert on public.agent_messages to authenticated;
grant update (status, decided_at, decided_by) on public.agent_messages to authenticated;
grant all on public.agent_messages to service_role;

-- 3. Notiser. Databasen ropar på funktionen daily-reminder via pg_net.
--    Adressen och nyckeln ligger i Vault (aldrig i koden): jarvis_functions_url och jarvis_notify_token.
--    scripts/setup-notiser.sh lägger in dem och sätter samma nyckel (NOTIFY_TOKEN) i funktionen.
create extension if not exists pg_net;

create or replace function public.jarvis_notify(payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  u text;
  tok text;
begin
  select decrypted_secret into u from vault.decrypted_secrets where name = 'jarvis_functions_url';
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'jarvis_notify_token';
  if u is null or tok is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(u, '/') || '/daily-reminder',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-jarvis-token', tok),
    body := payload
  );
end $$;
revoke execute on function public.jarvis_notify(jsonb) from public, anon, authenticated;

-- När en agent har jobbat: notis med sammanfattningen
create or replace function public.agent_runs_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.trigger <> 'test' then
    perform public.jarvis_notify(jsonb_build_object(
      'mode', 'agent',
      'agent', new.agent,
      'title', initcap(new.agent) || ': ' || new.title,
      'body', left(new.summary, 180),
      'url', './#/byn/' || new.agent
    ));
  end if;
  return new;
end $$;
drop trigger if exists agent_runs_notify on public.agent_runs;
create trigger agent_runs_notify after insert on public.agent_runs for each row execute function public.agent_runs_notify();

-- När en agent svarar i telefonen, eller vill ha ditt ja i byrådet
create or replace function public.agent_messages_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sender <> 'du' and (new.thread like 'dm:%' or new.kind = 'förslag') then
    perform public.jarvis_notify(jsonb_build_object(
      'mode', 'agent',
      'agent', new.sender,
      'title', case when new.kind = 'förslag' then initcap(new.sender) || ' vill ha ditt ja' else initcap(new.sender) || ' svarade' end,
      'body', left(new.body, 180),
      'url', case when new.thread like 'dm:%' then './#/byn/' || new.sender else './#/byn' end
    ));
  end if;
  return new;
end $$;
drop trigger if exists agent_messages_notify on public.agent_messages;
create trigger agent_messages_notify after insert on public.agent_messages for each row execute function public.agent_messages_notify();

-- Dagliga påminnelsen: varje timme kollar funktionen vem som valt den timmen.
-- Tar bort eventuella äldre jobb som ropade på funktionen på annat sätt, så att inget skickas dubbelt.
do $$
begin
  perform cron.unschedule(jobid) from cron.job where command ilike '%daily-reminder%' and jobname <> 'jarvis-reminders';
  perform cron.unschedule(jobid) from cron.job where jobname = 'jarvis-reminders';
  perform cron.schedule('jarvis-reminders', '2 * * * *', $c$select public.jarvis_notify('{"mode":"daily"}'::jsonb)$c$);
end $$;
