#!/usr/bin/env python3
"""Sparar en agentkörning i Supabase-tabellen agent_runs så att den syns i Agentbyn.

Användning:
  python3 scripts/agent-save.py --agent reminder --trigger schema --title "..." --summary "..." \
      --body-file /tmp/rapport.md --highlight "3 saker idag" --highlight "Beställ ny drop"

Skriver bara till agent_runs, aldrig till affärsdatan. Kräver molnmiljön Jarvis-881
(nyckeln till api.supabase.com läggs på av nätverksproxyn).
"""
import argparse, json, subprocess, sys

p = argparse.ArgumentParser()
p.add_argument('--agent', required=True, choices=['builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer', 'scout'])
p.add_argument('--trigger', default='kommando', choices=['schema', 'kommando', 'test'])
p.add_argument('--status', default='klar', choices=['klar', 'varning', 'fel'])
p.add_argument('--title', required=True)
p.add_argument('--summary', required=True)
p.add_argument('--body-file')
p.add_argument('--highlight', action='append', default=[])
a = p.parse_args()

body = open(a.body_file, encoding='utf-8').read() if a.body_file else ''
run = {'agent': a.agent, 'trigger': a.trigger, 'status': a.status, 'title': a.title[:200], 'summary': a.summary[:600], 'body': body, 'highlights': a.highlight[:6]}
payload = json.dumps(run, ensure_ascii=False)
tag = '$jarvisrun$'
if tag in payload:
    payload = payload.replace(tag, '$ jarvisrun $')
sql = (
    "insert into public.agent_runs (agent, trigger, status, title, summary, body, highlights) "
    "select r.agent, r.trigger, r.status, r.title, r.summary, r.body, r.highlights "
    f"from jsonb_populate_record(null::public.agent_runs, {tag}{payload}{tag}::jsonb) r returning id, at"
)
out = subprocess.run(
    ['curl', '-s', '-X', 'POST', 'https://api.supabase.com/v1/projects/vyvzsurwnjuiwdmdccir/database/query',
     '-H', 'Content-Type: application/json', '--data-binary', '@-'],
    input=json.dumps({'query': sql}).encode(), capture_output=True,
)
res = out.stdout.decode()
print(res)
if '"id"' not in res:
    sys.exit('Kunde inte spara körningen i agent_runs: ' + res)
