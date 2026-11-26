import { useEffect, useState } from 'react';
import { store } from '../../data/store';
import type { PresenceInfo } from '../../data/backend';
import { initial } from '../../domain/changes';
import { deviceUser } from '../Boot';
import { Sheet, cx } from './ui';

function useBackendPresence(): PresenceInfo[] {
  const b = store().backend;
  const me = b.email || deviceUser() || 'Du';
  const [list, setList] = useState<PresenceInfo[]>([{ user: me, name: me, online: true, lastSeen: null, me: true }]);
  useEffect(() => (b.presence ? b.presence(setList) : undefined), [b]);
  return list;
}

export function lastSeenText(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Har inte varit inne än';
  const d = new Date(iso);
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  if (mins < 2) return 'Nyss';
  if (mins < 60) return `För ${mins} min sedan`;
  const day = (x: Date) => x.toLocaleDateString('sv-SE');
  const yesterday = new Date(now.getTime() - 86400000);
  if (day(d) === day(now)) return `Idag ${time}`;
  if (day(d) === day(yesterday)) return `Igår ${time}`;
  return `${d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} ${time}`;
}

/** Den inloggade först, sedan de som är aktiva, sedan de som var inne senast. */
export function sortPresence(list: PresenceInfo[]): PresenceInfo[] {
  return [...list].sort((a, b) => Number(b.me) - Number(a.me) || Number(b.online) - Number(a.online) || (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));
}

/** Cirklar med första bokstaven. Aktiva har en grön prick, de andra är nedtonade. Tryck för att se när någon senast var inne. */
export function Presence() {
  const list = useBackendPresence();
  const [open, setOpen] = useState(false);
  const people = sortPresence(list);
  const shared = !!store().backend.presence;
  const others = people.filter((p) => !p.me);
  const label = people.map((p) => `${p.me ? 'du' : p.name}: ${p.online ? 'aktiv nu' : `senast inne ${lastSeenText(p.lastSeen).toLowerCase()}`}`).join(', ');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex -space-x-1.5" aria-label={`${label}. Tryck för mer.`} title={label}>
        {people.map((p) => (
          <span
            key={p.user}
            className={cx('relative grid h-8 w-8 place-items-center rounded-full border-2 border-forest text-[13px] font-bold', p.me ? 'bg-on-forest text-forest' : 'bg-sun text-sun-ink', !p.online && 'opacity-60 grayscale-[.4]')}
          >
            {initial(p.user)}
            <i className={cx('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-forest', p.online ? 'bg-mint' : 'bg-muted')} />
          </span>
        ))}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Vem är inne">
        <div className="flex flex-col gap-1 pb-2">
          {people.map((p) => (
            <div key={p.user} className="flex min-h-[60px] items-center gap-3 border-b border-line-2 last:border-0">
              <span className={cx('relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold', p.me ? 'bg-forest text-on-forest' : 'bg-sun text-sun-ink')}>
                {initial(p.user)}
                <i className={cx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface', p.online ? 'bg-pos' : 'bg-line')} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {p.name}
                  {p.me && <span className="text-muted"> (du)</span>}
                </span>
                <span className={cx('block text-[13px]', p.online ? 'text-pos' : 'text-muted')}>{p.online ? 'Aktiv nu' : 'Inte inne just nu'}</span>
              </span>
              {!p.me && (
                <span className="shrink-0 text-right">
                  <span className="block text-[11px] text-muted">Senast inne</span>
                  <span className="block text-[13px] font-semibold">{p.online ? 'Nu' : lastSeenText(p.lastSeen)}</span>
                </span>
              )}
            </div>
          ))}
          {shared && !others.length && <p className="m-0 mt-2 text-[13px] text-muted">Det finns ingen mer person med tillgång än. När kompisen är tillagd syns hen här, med när hen senast var inne.</p>}
          {!shared && <p className="m-0 mt-2 text-[13px] text-muted">När Jarvis är publicerad med Supabase och din kompis loggar in syns hen här, med när hen senast var inne.</p>}
        </div>
      </Sheet>
    </>
  );
}
