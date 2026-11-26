#!/usr/bin/env bash
# Sätter upp chatten och notiserna i Supabase. Körs EN gång (går att köra igen) i molnmiljön Jarvis-881,
# där nyckeln till api.supabase.com läggs på automatiskt. Skriver aldrig ut några hemligheter.
#  1. Kör migrationen 0003 (agent_messages, Planner/Marketer, triggers, timjobbet för påminnelser)
#  2. Skapar en ny notisnyckel och lägger den i Vault (databasen) och som NOTIFY_TOKEN i funktionen
#  3. Deployar funktionen daily-reminder (utan JWT-kontroll, den skyddas av nyckeln)
#  4. Provar: anropar funktionen och visar svaret
set -euo pipefail
cd "$(dirname "$0")/.."
REF=vyvzsurwnjuiwdmdccir
API=https://api.supabase.com/v1/projects/$REF

sql() { python3 -c "import json,sys;print(json.dumps({'query':sys.stdin.read()}))" | curl -s -X POST "$API/database/query" -H "Content-Type: application/json" --data @-; echo; }

echo "1. Migration 0003"
sql < supabase/migrations/0003_chatt_notiser.sql

echo "2. Notisnyckel"
TOKEN=$(python3 -c "import secrets;print(secrets.token_hex(24))")
printf "%s" "
do \$\$
declare i uuid;
begin
  select id into i from vault.secrets where name = 'jarvis_notify_token';
  if i is null then perform vault.create_secret('$TOKEN', 'jarvis_notify_token'); else perform vault.update_secret(i, '$TOKEN'); end if;
  select id into i from vault.secrets where name = 'jarvis_functions_url';
  if i is null then perform vault.create_secret('https://$REF.supabase.co/functions/v1', 'jarvis_functions_url'); end if;
end \$\$;
select name from vault.secrets where name like 'jarvis_%';" | sql
python3 -c "import json,sys;print(json.dumps([{'name':'NOTIFY_TOKEN','value':sys.argv[1]}]))" "$TOKEN" \
  | curl -s -o /dev/null -w "secrets: %{http_code}\n" -X POST "$API/secrets" -H "Content-Type: application/json" --data @-

echo "3. Deploy daily-reminder"
curl -s -w "\ndeploy: %{http_code}\n" -X POST "$API/functions/deploy?slug=daily-reminder" \
  -F 'metadata={"entrypoint_path":"index.ts","name":"daily-reminder","verify_jwt":false};type=application/json' \
  -F "file=@supabase/functions/daily-reminder/index.ts;filename=index.ts;type=application/typescript" | tail -c 400

echo "4. Prov"
sleep 20
echo "select public.jarvis_notify('{\"mode\":\"daily\"}'::jsonb);" | sql
sleep 8
echo "select id, status_code, left(content::text, 200) svar, created from net._http_response order by created desc limit 3;" | sql
echo "select jobname, schedule, active from cron.job;" | sql
echo "select count(*) prenumerationer, string_agg(remind_at, ', ') tider from public.push_subscriptions;" | sql
