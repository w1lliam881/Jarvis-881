#!/usr/bin/env python3
"""Chatten med agenterna: läs och skriv i telefonerna (dm:<agent>) och byrådet (grupp).

  python3 scripts/agent-chat.py read [--thread grupp|dm:advisor] [--limit 60]
  python3 scripts/agent-chat.py unanswered            # alla dina meddelanden som ingen agent svarat på, per tråd
  python3 scripts/agent-chat.py post --agent planner --thread grupp --body "..." [--kind chatt|plan|förslag] [--reply-to <id>]
  python3 scripts/agent-chat.py decisions             # förslag och vad William svarade (godkänd/avvisad/väntar)
  python3 scripts/agent-chat.py answers               # frågor från agenterna och Williams svar
  python3 scripts/agent-chat.py post --agent planner --thread grupp --kind fråga --body "..." --options "Ja|Nej|Vet inte"

Skriver bara till agent_messages, aldrig till affärsdatan. Ett förslag (--kind förslag) får status 'väntar'
och genomförs aldrig förrän William tryckt Godkänn i appen. Kräver molnmiljön Jarvis-881.
"""
import argparse, json, subprocess, sys

AGENTS = ['builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer', 'economizer', 'coach']
URL = 'https://api.supabase.com/v1/projects/vyvzsurwnjuiwdmdccir/database/query'


def q(sql):
    out = subprocess.run(['curl', '-s', '-X', 'POST', URL, '-H', 'Content-Type: application/json', '--data-binary', '@-'],
                         input=json.dumps({'query': sql}).encode(), capture_output=True)
    res = out.stdout.decode()
    try:
        return json.loads(res)
    except Exception:
        sys.exit('Fel från databasen: ' + res)


def lit(s):
    tag = '$jarvischat$'
    return tag + s.replace(tag, '$ jarvischat $') + tag


p = argparse.ArgumentParser()
sub = p.add_subparsers(dest='cmd', required=True)
r = sub.add_parser('read'); r.add_argument('--thread'); r.add_argument('--limit', type=int, default=60)
sub.add_parser('unanswered')
sub.add_parser('decisions')
sub.add_parser('answers')
w = sub.add_parser('post')
w.add_argument('--agent', required=True, choices=AGENTS)
w.add_argument('--thread', required=True)
w.add_argument('--body', required=True)
w.add_argument('--kind', default='chatt', choices=['chatt', 'plan', 'förslag', 'fråga'])
w.add_argument('--options', help='Svarsalternativ för en fråga, avdelade med |')
w.add_argument('--reply-to')
a = p.parse_args()

if a.cmd == 'read':
    where = f"where thread = {lit(a.thread)}" if a.thread else ''
    rows = q(f"select id, to_char(at at time zone 'Europe/Stockholm','YYYY-MM-DD HH24:MI') tid, thread, sender, kind, status, body "
             f"from (select * from public.agent_messages {where} order by at desc limit {int(a.limit)}) x order by tid")
    print(json.dumps(rows, ensure_ascii=False, indent=1))
elif a.cmd == 'unanswered':
    rows = q("""
      with last_agent as (select thread, max(at) at from public.agent_messages where sender <> 'du' group by thread)
      select m.id, to_char(m.at at time zone 'Europe/Stockholm','YYYY-MM-DD HH24:MI') tid, m.thread, m.author, m.body
      from public.agent_messages m left join last_agent l on l.thread = m.thread
      where m.sender = 'du' and (l.at is null or m.at > l.at) order by m.thread, m.at""")
    print(json.dumps(rows, ensure_ascii=False, indent=1))
elif a.cmd == 'decisions':
    rows = q("select id, to_char(at at time zone 'Europe/Stockholm','YYYY-MM-DD HH24:MI') tid, sender, status, decided_by, body "
             "from public.agent_messages where kind = 'förslag' order by at desc limit 30")
    print(json.dumps(rows, ensure_ascii=False, indent=1))
elif a.cmd == 'answers':
    rows = q("""
      select f.id, to_char(f.at at time zone 'Europe/Stockholm','YYYY-MM-DD HH24:MI') tid, f.sender agent, f.thread, f.body fraga, f.options alternativ,
             s.body svar, to_char(s.at at time zone 'Europe/Stockholm','YYYY-MM-DD HH24:MI') svarade
      from public.agent_messages f left join public.agent_messages s on s.reply_to = f.id and s.sender = 'du'
      where f.kind = 'fråga' order by f.at desc limit 30""")
    print(json.dumps(rows, ensure_ascii=False, indent=1))
else:
    if a.thread != 'grupp' and a.thread not in [f'dm:{x}' for x in AGENTS]:
        sys.exit('Fel tråd. Använd grupp eller dm:<agent>.')
    if a.kind == 'förslag' and a.thread != 'grupp':
        sys.exit('Förslag läggs i gruppchatten (grupp) så att William ser dem samlat.')
    status = "'väntar'" if a.kind == 'förslag' else 'null'
    opts = [o.strip() for o in (a.options or '').split('|') if o.strip()][:4]
    if a.kind != 'fråga' and opts:
        sys.exit('--options används bara med --kind fråga.')
    opts_sql = lit(json.dumps(opts, ensure_ascii=False)) + '::jsonb' if opts else 'null'
    reply = lit(a.reply_to) + '::uuid' if a.reply_to else 'null'
    res = q(f"insert into public.agent_messages (thread, sender, body, kind, status, reply_to, options) values "
            f"({lit(a.thread)}, {lit(a.agent)}, {lit(a.body[:4000])}, {lit(a.kind)}, {status}, {reply}, {opts_sql}) returning id, at")
    print(json.dumps(res, ensure_ascii=False))
    if not (isinstance(res, list) and res and 'id' in res[0]):
        sys.exit('Kunde inte spara meddelandet.')
