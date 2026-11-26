-- 0006: Economizer och Coach Claude (nya agenter), Scout borttagen, och Coachens träning av agenterna.
-- Går att köra flera gånger. Ändrar ingen affärsdata.
alter table public.agent_runs drop constraint if exists agent_runs_agent_check;
alter table public.agent_runs add constraint agent_runs_agent_check
  check (agent in ('builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer', 'economizer', 'coach', 'scout'));
alter table public.agent_messages drop constraint if exists agent_messages_thread_check;
alter table public.agent_messages add constraint agent_messages_thread_check
  check (thread = 'grupp' or thread ~ '^dm:(builder|reviewer|advisor|reminder|noter|planner|marketer|economizer|coach|scout)$');
alter table public.agent_messages drop constraint if exists agent_messages_sender_check;
alter table public.agent_messages add constraint agent_messages_sender_check
  check (sender in ('du', 'builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer', 'economizer', 'coach', 'scout'));

-- Träningen i gymmet: Coach Claude ger varje agent betyg och träningsmål varje söndag.
create table if not exists public.agent_training (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  week text not null,
  agent text not null,
  score int not null check (score between 1 and 10),
  good text not null default '',
  improve text not null default '',
  goal text not null default ''
);
create index if not exists agent_training_week on public.agent_training (week desc, agent);
alter table public.agent_training enable row level security;
drop policy if exists agent_training_r on public.agent_training;
create policy agent_training_r on public.agent_training for select using (public.is_allowed());
revoke all on public.agent_training from anon;
grant select on public.agent_training to authenticated;
grant all on public.agent_training to service_role;
