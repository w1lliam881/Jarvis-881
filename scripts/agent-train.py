#!/usr/bin/env python3
"""Coach Claude: sparar veckans betyg för en agent i agent_training (visas i Gymmet i Agentbyn).

  python3 scripts/agent-train.py --week 2026-W48 --agent planner --score 7 \
      --good "Räknade baklänges från deadline" --improve "Höll med Advisor för lätt" --goal "Säg emot minst en gång i byrådet"

Skriver bara till agent_training. Kräver molnmiljön Jarvis-881.
"""
import argparse, json, subprocess, sys

AGENTS = ['builder', 'reviewer', 'advisor', 'reminder', 'noter', 'planner', 'marketer', 'economizer']
p = argparse.ArgumentParser()
p.add_argument('--week', required=True)
p.add_argument('--agent', required=True, choices=AGENTS)
p.add_argument('--score', required=True, type=int, choices=range(1, 11))
p.add_argument('--good', default='')
p.add_argument('--improve', default='')
p.add_argument('--goal', default='')
a = p.parse_args()

tag = '$jarvistrain$'
lit = lambda s: tag + s.replace(tag, '$ jarvistrain $')[:600] + tag
sql = (f"delete from public.agent_training where week = {lit(a.week)} and agent = {lit(a.agent)}; "
       f"insert into public.agent_training (week, agent, score, good, improve, goal) values "
       f"({lit(a.week)}, {lit(a.agent)}, {a.score}, {lit(a.good)}, {lit(a.improve)}, {lit(a.goal)}) returning id")
out = subprocess.run(['curl', '-s', '-X', 'POST', 'https://api.supabase.com/v1/projects/vyvzsurwnjuiwdmdccir/database/query',
                      '-H', 'Content-Type: application/json', '--data-binary', '@-'], input=json.dumps({'query': sql}).encode(), capture_output=True)
res = out.stdout.decode()
print(res)
if '"id"' not in res:
    sys.exit('Kunde inte spara betyget: ' + res)
