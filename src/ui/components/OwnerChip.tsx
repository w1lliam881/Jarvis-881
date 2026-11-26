// Liten etikett på en sida: vilken agent som ansvarar för den. Tryck för att be agenten om något (öppnar telefonen).
import { agentById, type AgentId } from '../../domain/agents';
import { AgentSprite } from '../../game/village';
import { cx } from './ui';

export function OwnerChip({ agent, tone = 'light', className }: { agent: AgentId; tone?: 'light' | 'dark'; className?: string }) {
  const def = agentById(agent);
  if (!def) return null;
  return (
    <a
      href={`#/byn/${def.id}?chatt=1`}
      className={cx(
        'inline-flex min-h-[32px] items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[12px] font-medium transition-colors',
        tone === 'dark' ? 'bg-white/10 text-on-forest hover:bg-white/15' : 'bg-surface-2 text-muted ring-1 ring-line hover:text-text',
        className,
      )}
      title={`${def.name} ansvarar för sidan. Tryck för att be ${def.name} om något.`}
    >
      <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: def.wall }}>
        <AgentSprite def={def} size={18} />
      </span>
      {def.name} ansvarar · be om något
    </a>
  );
}
