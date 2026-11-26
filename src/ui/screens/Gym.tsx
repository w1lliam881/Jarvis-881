// Gymmet: Coach Claudes betyg för agenterna varje söndag.
import { useEffect, useState } from 'react';
import { store } from '../../data/store';
import type { TrainingRow } from '../../data/backend';
import { agentById } from '../../domain/agents';
import { AgentSprite } from '../../game/village';

const LINE = 'rgba(233,238,234,.14)';
const PANEL = 'rgba(0,0,0,.22)';
const MUTED = '#A9B5AE';
const SUN = '#E9B44C';

export function GymBoard() {
  const b = store().backend;
  const [rows, setRows] = useState<TrainingRow[] | null>(null);
  useEffect(() => {
    if (!b.agentTraining) {
      try {
        setRows(JSON.parse(sessionStorage.getItem('jarvis-agent-training') ?? '[]') as TrainingRow[]);
      } catch {
        setRows([]);
      }
      return;
    }
    b.agentTraining(80).then(setRows, () => setRows([]));
  }, [b]);
  const weeks = [...new Set((rows ?? []).map((r) => r.week))].sort().reverse();
  const week = weeks[0];
  const prev = weeks[1];
  const now = (rows ?? []).filter((r) => r.week === week).sort((a, b) => b.score - a.score);
  const before = (agent: string) => (rows ?? []).find((r) => r.week === prev && r.agent === agent)?.score;
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2 className="font-pixel m-0 text-[12px] leading-relaxed" style={{ color: SUN }}>
          Veckans betyg {week ? `· vecka ${week.slice(-2)}` : ''}
        </h2>
        <p className="m-0 mt-1 text-[12px]" style={{ color: MUTED }}>
          Coach Claude tränar agenterna varje söndag kl 18:30: betyg 1–10, vad som var bra, vad som måste bli bättre och veckans träningsmål.
        </p>
      </div>
      {!now.length && (
        <p className="m-0 border-2 p-3 text-[13px]" style={{ borderColor: LINE, background: PANEL, color: MUTED }}>
          {rows == null ? 'Hämtar…' : 'Ingen träning än. Första passet är på söndag.'}
        </p>
      )}
      {now.map((r) => {
        const def = agentById(r.agent);
        if (!def) return null;
        const p = before(r.agent);
        return (
          <div key={r.id} className="flex gap-3 border-2 p-3" style={{ borderColor: LINE, background: PANEL }}>
            <span className="grid h-12 w-12 shrink-0 place-items-center" style={{ background: def.wall }}>
              <AgentSprite def={def} size={38} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{def.name}</span>
                <span className="font-pixel text-[12px]" style={{ color: r.score >= 7 ? '#9EDBB8' : r.score >= 5 ? SUN : '#F4A08F' }}>
                  {r.score}/10{p != null && p !== r.score ? ` ${r.score > p ? '▲' : '▼'}` : ''}
                </span>
              </div>
              <div className="mt-1 h-2" style={{ background: 'rgba(255,255,255,.08)' }}>
                <i className="block h-full" style={{ width: `${r.score * 10}%`, background: r.score >= 7 ? '#9EDBB8' : r.score >= 5 ? SUN : '#F4A08F' }} />
              </div>
              {r.good && <div className="mt-1.5 text-[13px] text-[#D5DDD8]">Bra: {r.good}</div>}
              {r.improve && <div className="text-[13px] text-[#F4C9BD]">Bättre: {r.improve}</div>}
              {r.goal && <div className="text-[13px]" style={{ color: SUN }}>Träningsmål: {r.goal}</div>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
