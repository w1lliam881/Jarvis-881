-- Agenternas arbete: varje körning av Builder, Reviewer, Advisor, Reminder och Noter sparas här
-- så att appen kan visa det i Agentbyn. Agenterna skriver via serverns nyckel (service_role / Management API),
-- appen läser bara.
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('builder', 'reviewer', 'advisor', 'reminder', 'noter')),
  at timestamptz not null default now(),
  trigger text not null default 'kommando' check (trigger in ('schema', 'kommando', 'test')),
  status text not null default 'klar' check (status in ('klar', 'varning', 'fel')),
  title text not null,
  summary text not null,
  body text not null default '',
  highlights jsonb not null default '[]'::jsonb
);
create index if not exists agent_runs_agent_at on public.agent_runs (agent, at desc);

alter table public.agent_runs enable row level security;
drop policy if exists agent_runs_r on public.agent_runs;
create policy agent_runs_r on public.agent_runs for select using (public.is_allowed());

grant select on public.agent_runs to authenticated;
revoke all on public.agent_runs from anon;
grant all on public.agent_runs to service_role;
