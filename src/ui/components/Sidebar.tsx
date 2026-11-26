import { BarChart3, Castle, BookOpen, Calculator, Clapperboard, Database, Gamepad2, History, Home, Languages, LineChart, Package, Settings as Cog, ShoppingBag, Upload, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore } from '../../data/store';
import { kr } from '../../domain/money';
import { overview } from '../../domain/metrics';
import { monthName, todayISO } from '../../domain/dates';
import type { Route } from '../router';
import { Presence } from './Presence';
import { cx } from './ui';

type Icon = typeof Home;
interface Link {
  href: string;
  label: string;
  icon: Icon;
  key?: string;
  sub?: { href: string; label: string }[];
}

const MAIN: Link[] = [
  { href: '#/idag', label: 'Idag', icon: Home, key: '1', sub: [{ href: '#/idag', label: 'Översikt' }, { href: '#/idag?v=kalender', label: 'Kalender' }] },
  { href: '#/lager', label: 'Lager', icon: Package, key: '2', sub: [{ href: '#/lager', label: 'Plagg' }, { href: '#/lager/drops', label: 'Drops' }] },
  { href: '#/salj', label: 'Sälj', icon: ShoppingBag, key: '3' },
  {
    href: '#/ekonomi/oversikt',
    label: 'Ekonomi',
    icon: BarChart3,
    key: '4',
    sub: [
      { href: '#/ekonomi/oversikt', label: 'Översikt' },
      { href: '#/ekonomi/verifikat', label: 'Verifikat' },
      { href: '#/ekonomi/rapporter', label: 'Rapporter' },
      { href: '#/ekonomi/analys', label: 'Analys' },
      { href: '#/ekonomi/manad', label: 'Månadsmål' },
      { href: '#/ekonomi/kvartal', label: 'Kvartal' },
      { href: '#/ekonomi/kontroll', label: 'Kontroll' },
    ],
  },
];

const PLAN: Link[] = [
  { href: '#/planering/kalkyl', label: 'Kalkyl', icon: Calculator },
  { href: '#/planering/framtid', label: 'Framtid och budget', icon: Wallet },
  { href: '#/planering/doorzo', label: 'Doorzo och bevakningar', icon: Languages },
  { href: '#/planering/marknad', label: 'Marknadsföring', icon: LineChart },
  { href: '#/planering/video', label: 'Videoidéer', icon: Clapperboard },
];

const DATA: Link[] = [
  { href: '#/mer/backup', label: 'Säkerhetskopior', icon: Database },
  { href: '#/mer/import', label: 'Import', icon: Upload },
  { href: '#/mer/logg', label: 'Ändringslogg', icon: History },
  { href: '#/mer/installningar', label: 'Inställningar', icon: Cog },
  { href: '#/mer/guide', label: 'Guide', icon: BookOpen },
];

/** Avgör om en länk motsvarar nuvarande sida. */
function active(href: string, route: Route, exact = false): boolean {
  const [p, q] = href.replace(/^#\//, '').split('?');
  const parts = p.split('/');
  const cur = route.path.length ? route.path : ['idag'];
  if (cur[0] !== parts[0]) return false;
  if (parts[0] === 'ekonomi' && !cur[1]) return parts[1] === 'oversikt' || !parts[1];
  if (parts[0] === 'idag') return exact ? (q ? route.query.get('v') === 'kalender' : route.query.get('v') !== 'kalender') : true;
  if (parts[0] === 'lager' && exact) return parts[1] === 'drops' ? cur[1] === 'drops' || cur[1] === 'drop' : cur[1] !== 'drops' && cur[1] !== 'drop';
  if (parts.length > 1) return cur[1] === parts[1];
  return true;
}

function Item({ l, route, small }: { l: Link; route: Route; small?: boolean }) {
  const on = active(l.href, route);
  const I = l.icon;
  return (
    <>
      <a href={l.href} aria-current={on ? 'page' : undefined} className={cx('side-link', on && 'side-link-on', small && 'side-link-small')}>
        <I size={small ? 16 : 18} strokeWidth={1.9} aria-hidden />
        <span className="flex-1 truncate">{l.label}</span>
        {l.key && <kbd className="side-kbd">{l.key}</kbd>}
      </a>
      {on && l.sub && (
        <div className="mb-1 ml-[30px] flex flex-col border-l border-white/10 pl-2">
          {l.sub.map((s) => (
            <a key={s.href} href={s.href} className={cx('side-sub', active(s.href, route, true) && 'side-sub-on')}>
              {s.label}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-forest-muted/70">{title}</div>
      {children}
    </div>
  );
}

/** Sidomeny som bara visas på bred skärm (dator). Telefonen behåller menyn i botten. */
export function Sidebar({ route }: { route: Route }) {
  const { ds, status } = useStore();
  if (!ds) return null;
  const today = todayISO();
  const o = overview(ds, today);
  return (
    <aside className="sidebar no-print" aria-label="Huvudmeny">
      <div className="flex items-center justify-between gap-2 px-3 pt-6">
        <a href="#/idag" className="block">
          <span className="block font-serif text-[28px] font-semibold leading-none tracking-[-0.01em]">Jarvis</span>
          <span className="mt-1 block text-[12px] text-on-forest-muted">881 · denim från Japan</span>
        </a>
        <Presence />
      </div>

      <div className="mx-3 mt-5 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
        <div className="text-[11px] text-on-forest-muted">Sålt i {monthName(o.month, false)}</div>
        <div className="tabnum whitespace-nowrap font-serif text-[24px] font-medium leading-tight">{kr(o.soldRevenue)}</div>
        <div className="text-[12px] text-on-forest-muted">
          {o.soldCount} plagg · <span className="text-mint">{kr(o.soldProfit)} vinst</span>
        </div>
      </div>

      <nav className="mt-4 flex flex-col">
        {MAIN.map((l) => (
          <Item key={l.href} l={l} route={route} />
        ))}
        <Item l={{ href: '#/byn', label: 'Agentbyn', icon: Castle }} route={route} />
        {ds.settings.gameEnabled && <Item l={{ href: '#/spelet', label: 'Spelet', icon: Gamepad2 }} route={route} />}
      </nav>

      <Group title="Planering">
        {PLAN.map((l) => (
          <Item key={l.href} l={l} route={route} small />
        ))}
      </Group>

      <Group title="Data och inställningar">
        {DATA.map((l) => (
          <Item key={l.href} l={l} route={route} small />
        ))}
      </Group>

      <div className="mt-auto px-3 pb-5 pt-6 text-[11px] leading-relaxed text-on-forest-muted/80">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-mint">
          <i className={cx('h-1.5 w-1.5 rounded-full', status.state === 'saving' ? 'bg-sun' : status.state === 'error' ? 'bg-neg' : 'bg-mint')} />
          {status.state === 'saving' ? 'Sparar…' : status.state === 'error' ? 'Kunde inte spara' : status.at ? `Sparat ${new Date(status.at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}` : 'Synkad'}
        </div>
        Snabbt nere till höger. Genvägar: <kbd className="side-kbd">N</kbd> försäljning · <kbd className="side-kbd">K</kbd> kostnad · <kbd className="side-kbd">U</kbd> uppgift · <kbd className="side-kbd">1–5</kbd> flikar
      </div>
    </aside>
  );
}

