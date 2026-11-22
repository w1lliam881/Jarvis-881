-- Jarvis 2.0: databas i Supabase (Postgres, EU-region).
-- En tabell för alla poster (jsonb) med versionsnummer per rad, en ändringslogg,
-- säkerhetskopior och en funktion som sparar flera ändringar atomiskt med versionskontroll.

create table if not exists public.allowed_users (
  email text primary key,
  name text not null
);

create table if not exists public.records (
  collection text not null,
  id text not null,
  data jsonb not null,
  version integer not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  deleted_at timestamptz,
  primary key (collection, id)
);

create table if not exists public.changelog (
  id text primary key,
  at timestamptz not null,
  by text not null,
  collection text not null,
  record_id text not null,
  action text not null,
  summary text not null,
  before jsonb,
  after jsonb
);
create index if not exists changelog_at on public.changelog (at desc);

create table if not exists public.backups (
  id text primary key,
  at timestamptz not null default now(),
  note text not null,
  counts text not null,
  data jsonb not null
);

-- Senast aktiv per användare (visas som "senast inne")
create table if not exists public.presence (
  email text primary key,
  last_seen timestamptz not null default now()
);

-- Bara inloggade användare som finns i allowed_users får läsa och skriva.
create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

alter table public.records enable row level security;
alter table public.changelog enable row level security;
alter table public.backups enable row level security;
alter table public.allowed_users enable row level security;

create policy records_rw on public.records for all using (public.is_allowed()) with check (public.is_allowed());
create policy changelog_r on public.changelog for select using (public.is_allowed());
create policy changelog_i on public.changelog for insert with check (public.is_allowed());
create policy backups_rw on public.backups for all using (public.is_allowed()) with check (public.is_allowed());
create policy allowed_r on public.allowed_users for select using (public.is_allowed());
alter table public.presence enable row level security;
create policy presence_r on public.presence for select using (public.is_allowed());
create policy presence_w on public.presence for insert with check (public.is_allowed() and lower(email) = lower(auth.jwt() ->> 'email'));
create policy presence_u on public.presence for update using (public.is_allowed() and lower(email) = lower(auth.jwt() ->> 'email'));

-- Debet = kredit tvingas av databasen för verifikat som inte är borttagna.
create or replace function public.check_voucher_balance() returns trigger
language plpgsql as $$
declare d bigint; c bigint;
begin
  if new.collection = 'vouchers' and (new.data ->> 'deletedAt') is null then
    select coalesce(sum((l ->> 'debit')::bigint), 0), coalesce(sum((l ->> 'credit')::bigint), 0)
      into d, c from jsonb_array_elements(new.data -> 'lines') l;
    if d <> c then
      raise exception 'Verifikat % balanserar inte (debet % ≠ kredit %)', new.data ->> 'nr', d, c using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists records_voucher_balance on public.records;
create trigger records_voucher_balance before insert or update on public.records
for each row execute function public.check_voucher_balance();

-- Spara flera ändringar i en transaktion. Varje ändring har förväntad version (null = ny post).
-- Om någon annan hunnit ändra posten avbryts allt med felkoden 40001 (konflikt).
create or replace function public.commit_mutations(muts jsonb, log jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare m jsonb; cur integer; coll text; rid text;
begin
  if not public.is_allowed() then raise exception 'Inte behörig' using errcode = '42501'; end if;
  for m in select * from jsonb_array_elements(muts) loop
    coll := m ->> 'collection';
    rid := m -> 'record' ->> 'id';
    select version into cur from public.records where collection = coll and id = rid for update;
    -- Inställningar och spelläge finns från början i version 1 även om raden inte skapats än
    if cur is null and coll = 'meta' then cur := 1; end if;
    if (m -> 'expectedVersion') = 'null'::jsonb then
      if cur is not null then raise exception 'Konflikt: % % finns redan', coll, rid using errcode = 'PT409'; end if;
    elsif cur is null or cur <> (m ->> 'expectedVersion')::integer then
      raise exception 'Konflikt: % % har ändrats av någon annan', coll, rid using errcode = 'PT409';
    end if;
    insert into public.records (collection, id, data, version, updated_at, updated_by, deleted_at)
    values (coll, rid, m -> 'record', (m -> 'record' ->> 'version')::integer, now(), m -> 'record' ->> 'updatedBy', nullif(m -> 'record' ->> 'deletedAt', '')::timestamptz)
    on conflict (collection, id) do update set data = excluded.data, version = excluded.version, updated_at = now(), updated_by = excluded.updated_by, deleted_at = excluded.deleted_at;
  end loop;
  insert into public.changelog (id, at, by, collection, record_id, action, summary, before, after)
  select l ->> 'id', (l ->> 'at')::timestamptz, l ->> 'by', l ->> 'collection', l ->> 'recordId', l ->> 'action', l ->> 'summary', l -> 'before', l -> 'after'
  from jsonb_array_elements(log) l;
end $$;

-- Ersätt all data i en transaktion (import och återställning). Misslyckas något ändras inget.
create or replace function public.replace_all(rows jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_allowed() then raise exception 'Inte behörig' using errcode = '42501'; end if;
  delete from public.records where true;
  insert into public.records (collection, id, data, version, updated_at, updated_by, deleted_at)
  select r ->> 'collection', r ->> 'id', r -> 'data', (r ->> 'version')::integer, now(), r ->> 'updated_by', nullif(r ->> 'deleted_at', '')::timestamptz
  from jsonb_array_elements(rows) r;
end $$;

-- Realtid: andra flikar och enheter får veta när något ändrats.
alter publication supabase_realtime add table public.records;

-- Underlag (bilder och PDF) i en privat bucket.
insert into storage.buckets (id, name, public) values ('underlag', 'underlag', false) on conflict do nothing;
create policy underlag_rw on storage.objects for all using (bucket_id = 'underlag' and public.is_allowed()) with check (bucket_id = 'underlag' and public.is_allowed());

-- Daglig säkerhetskopia kl 03:00 (pg_cron finns på Supabase gratisnivå).
create extension if not exists pg_cron;
create or replace function public.daily_backup() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.backups (id, note, counts, data)
  select to_char(now(), 'YYYY-MM-DD-"auto"'), 'Daglig kopia (servern)',
         (select count(*) from records where deleted_at is null)::text || ' poster',
         jsonb_agg(jsonb_build_object('collection', collection, 'data', data))
  from public.records
  on conflict (id) do nothing;
  delete from public.backups where note like 'Daglig%' and at < now() - interval '30 days';
end $$;
select cron.schedule('jarvis-daily-backup', '0 3 * * *', $$select public.daily_backup()$$);

-- Påminnelser: en rad per enhet som slagit på notiser.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  email text not null,
  subscription jsonb not null,
  remind_at text not null default '18:00',
  kinds jsonb not null default '{"daily": true, "inbox": true, "oldStock": true}',
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy push_own on public.push_subscriptions for all
  using (public.is_allowed() and lower(email) = lower(auth.jwt() ->> 'email'))
  with check (public.is_allowed() and lower(email) = lower(auth.jwt() ->> 'email'));

-- Behörigheter: bara inloggade (och sedan RLS) når tabellerna. Anonyma får ingenting.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.records, public.changelog, public.backups, public.presence, public.push_subscriptions to authenticated;
grant select on public.allowed_users to authenticated;
grant execute on function public.commit_mutations(jsonb, jsonb), public.replace_all(jsonb), public.is_allowed() to authenticated;
revoke all on public.records, public.changelog, public.backups, public.presence, public.push_subscriptions, public.allowed_users from anon;
revoke execute on function public.commit_mutations(jsonb, jsonb), public.replace_all(jsonb) from anon, public;
