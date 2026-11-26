import { useEffect, useState } from 'react';
import { BarChart3, Home, MoreHorizontal, Package, ShoppingBag, Undo2 } from 'lucide-react';
import { store, useStore } from '../data/store';
import { useRoute, go } from './router';
import { cx } from './components/ui';
import { QuickSheet, type QuickKind } from './Quick';
import { Idag } from './screens/Idag';
import { Lager } from './screens/Lager';
import { Salj } from './screens/Salj';
import { Ekonomi } from './screens/Ekonomi';
import { Mer } from './screens/Mer';
import { Planering } from './screens/Planering';
import { Spelet } from './screens/Spelet';
import { Byn } from './screens/Byn';
import { Welcome } from './screens/Welcome';
import { Sidebar } from './components/Sidebar';
import { Intro } from './components/Intro';
import { QuickFab } from './components/QuickFab';
import { deviceUser } from './Boot';
import { recordVisit } from '../data/actions';
import { meKey } from './me';

const TABS = [
  { id: 'idag', label: 'Idag', icon: Home },
  { id: 'lager', label: 'Lager', icon: Package },
  { id: 'salj', label: 'Sälj', icon: ShoppingBag },
  { id: 'ekonomi', label: 'Ekonomi', icon: BarChart3 },
  { id: 'mer', label: 'Mer', icon: MoreHorizontal },
] as const;

export function App() {
  const { ds } = useStore();
  const route = useRoute();
  const [quick, setQuick] = useState<QuickKind | null>(null);

  useEffect(() => {
    const t = ds?.settings.theme ?? 'system';
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }, [ds?.settings.theme]);

  useEffect(() => {
    const on = (e: Event) => setQuick((e as CustomEvent<QuickKind>).detail);
    window.addEventListener('jarvis-quick', on);
    return () => window.removeEventListener('jarvis-quick', on);
  }, []);

  // Tangentbordsgenvägar på dator: n = ny försäljning, k = ny kostnad, 1–5 = flikar
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[role=dialog]')) return;
      if (e.key === 'n') setQuick('sale');
      else if (e.key === 'k') setQuick('cost');
      else if (e.key === 'u') setQuick('task');
      else if (/^[1-5]$/.test(e.key)) go(`#/${TABS[+e.key - 1].id}`);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  // Day streak: registrera att du varit inne idag (en gång per dag och person)
  const ready = !!ds && (!!ds.settings.migratedAt || ds.drops.length > 0);
  useEffect(() => {
    if (ready) void recordVisit(meKey());
  }, [ready]);

  if (!ds) return null;
  const empty = !ds.settings.migratedAt && !ds.drops.length && !ds.vouchers.length;
  if (empty || (!deviceUser() && !store().backend.email)) return <Welcome />;

  const top = route.path[0] ?? 'idag';
  const tab = ['planering', 'spelet', 'byn'].includes(top) ? 'mer' : top;
  let screen;
  switch (top) {
    case 'lager':
      screen = <Lager route={route} />;
      break;
    case 'salj':
      screen = <Salj />;
      break;
    case 'ekonomi':
      screen = <Ekonomi route={route} />;
      break;
    case 'planering':
      screen = <Planering route={route} />;
      break;
    case 'spelet':
      screen = <Spelet />;
      break;
    case 'byn':
      screen = <Byn route={route} />;
      break;
    case 'mer':
      screen = <Mer route={route} />;
      break;
    default:
      screen = <Idag route={route} />;
  }

  return (
    <div className="min-h-dvh">
      <Sidebar route={route} />
      <main key={top} className="desk-main">
        {screen}
      </main>
      <SaveStatus />
      <Toasts />
      <QuickFab hidden={top === 'byn' && !!route.path[1]} onPick={setQuick} />
      <nav className="no-print safe-bottom fixed lg:hidden inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur" aria-label="Huvudmeny">
        <div className="mx-auto grid max-w-[720px] grid-cols-5 px-2 pt-2">
          {TABS.map((t) => {
            const on = tab === t.id;
            const I = t.icon;
            return (
              <a key={t.id} href={`#/${t.id}`} aria-current={on ? 'page' : undefined} className={cx('flex flex-col items-center gap-0.5 text-[11px]', on ? 'font-semibold text-accent' : 'text-muted')}>
                <span className={cx('grid h-[30px] w-[52px] place-items-center rounded-full', on && 'bg-accent-soft')}>
                  <I size={21} strokeWidth={1.8} aria-hidden />
                </span>
                {t.label}
              </a>
            );
          })}
        </div>
      </nav>
      <QuickSheet kind={quick} setKind={setQuick} />
      <Intro />
    </div>
  );
}

export function openQuick(k: QuickKind) {
  window.dispatchEvent(new CustomEvent('jarvis-quick', { detail: k }));
}

function SaveStatus() {
  const { status, canUndo } = useStore();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (status.state === 'saved' || status.state === 'error') {
      setShow(true);
      const t = setTimeout(() => setShow(false), status.state === 'error' ? 9000 : 4000);
      return () => clearTimeout(t);
    }
    if (status.state === 'saving') setShow(true);
  }, [status]);
  if (!show) return null;
  const err = status.state === 'error';
  return (
    <div className="no-print pointer-events-none fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-3 right-[104px] z-50 flex justify-start lg:bottom-6 lg:left-[288px] lg:right-6" aria-live="polite">
      <div className={cx('pointer-events-auto fade-in flex max-w-[520px] items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] shadow-lg', err ? 'bg-hi-bg text-hi' : 'bg-forest text-on-forest')}>
        {!err && <span className={cx('h-2 w-2 shrink-0 rounded-full', status.state === 'saving' ? 'animate-pulse bg-sun' : 'bg-mint')} />}
        <span className="line-clamp-2">{status.state === 'saving' ? 'Sparar…' : err ? status.message : `Sparat · ${status.message ?? ''}`}</span>
        {!err && status.state === 'saved' && canUndo && !canUndo.startsWith('Ångrade') && (
          <button type="button" className="flex min-h-[32px] items-center gap-1 rounded-lg bg-white/10 px-2 font-semibold" onClick={() => void store().undo()}>
            <Undo2 size={14} aria-hidden /> Ångra
          </button>
        )}
      </div>
    </div>
  );
}

function Toasts() {
  const [items, setItems] = useState<{ id: number; message: string; tone: string }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; tone: string }>).detail;
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { id, ...d }]);
      setTimeout(() => setItems((x) => x.filter((y) => y.id !== id)), 3500);
    };
    window.addEventListener('jarvis-toast', on);
    return () => window.removeEventListener('jarvis-toast', on);
  }, []);
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[100] lg:left-[264px] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cx('pop rounded-2xl px-4 py-2.5 text-[14px] font-semibold shadow-lg', t.tone === 'xp' ? 'bg-sun text-sun-ink' : t.tone === 'error' ? 'bg-hi-bg text-hi' : 'bg-forest text-on-forest')}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
