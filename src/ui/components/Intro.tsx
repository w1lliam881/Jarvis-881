import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Castle, History, KeyRound, Package, Plus, ShoppingBag, X } from 'lucide-react';
import { store } from '../../data/store';
import { go } from '../router';
import { cx } from './ui';

interface Step {
  icon: typeof Plus;
  title: string;
  body: ReactNode;
  action?: { label: string; href: string };
}

function steps(name: string): Step[] {
  return [
    {
      icon: Package,
      title: name ? `Hej ${name}, välkommen till Jarvis` : 'Välkommen till Jarvis',
      body: (
        <>
          <p>Här sköter ni 881: lagret, försäljningen och bokföringen, på samma ställe.</p>
          <p>Du och William ser samma data. Det någon av er ändrar syns direkt hos den andra.</p>
        </>
      ),
    },
    {
      icon: Plus,
      title: 'Ny: det du gör mest',
      body: (
        <>
          <p>
            Knappen <b>Ny</b> (gul) registrerar en försäljning, en kostnad, en ny drop eller en uppgift. Bokföringen sköts av sig själv.
          </p>
          <p>Sålt något? Ny → Försäljning, sök plagget, skriv priset och spara.</p>
        </>
      ),
    },
    {
      icon: ShoppingBag,
      title: 'Var saker finns',
      body: (
        <ul>
          <li>
            <b>Idag</b>: läget just nu, uppgifter och senast sålt.
          </li>
          <li>
            <b>Lager</b>: alla plagg och drops. Tryck på ett plagg för produkt-ID, mått och annonstext.
          </li>
          <li>
            <b>Sälj</b>: allt som sålts, per månad.
          </li>
          <li>
            <b>Ekonomi</b>: verifikat, rapporter, analys och Kontroll.
          </li>
        </ul>
      ),
    },
    {
      icon: History,
      title: 'Du kan inte förstöra något',
      body: (
        <>
          <p>
            Allt sparas direkt. Blev det fel trycker du <b>Ångra</b> i rutan längst ner. Under Mer → Ändringslogg syns vem som ändrat vad, och en säkerhetskopia tas
            varje dag.
          </p>
          <p>Bokföringen är ett stöd. Låt någon som kan redovisning titta på den innan den används till deklarationen.</p>
        </>
      ),
    },
    {
      icon: Castle,
      title: 'Agentbyn',
      body: (
        <p>
          Under Mer → Agentbyn bor sju agenter som läser era siffror och skriver påminnelser, råd, planer och en journal. Du kan chatta med dem i telefonen i varje hus. De ändrar aldrig något själva. Tryck på
          ett hus för att läsa vad de skrivit.
        </p>
      ),
    },
    {
      icon: KeyRound,
      title: 'Välj ett lösenord',
      body: (
        <>
          <p>Sista steget. Välj ett eget lösenord nu, så att bara du vet det. Sedan loggar du in med e-post och ditt lösenord, även i appen på hemskärmen.</p>
          <p>Du hittar det under <b>Mer → Inställningar → Lösenord</b>. Minst 8 tecken.</p>
        </>
      ),
      action: { label: 'Välj lösenord nu', href: '#/mer/installningar' },
    },
  ];
}

/** Bara för testerna (utan Supabase): sessionStorage 'jarvis-intro-test' = namn. */
function testIntro() {
  try {
    const name = sessionStorage.getItem('jarvis-intro-test');
    if (name == null) return undefined;
    return { seen: false, name, markSeen: async () => sessionStorage.removeItem('jarvis-intro-test') };
  } catch {
    return undefined;
  }
}

/** Introduktion som visas första gången man loggar in. Sparas på kontot, så den kommer inte tillbaka på andra enheter. */
export function Intro() {
  const intro = store().backend.intro ?? testIntro();
  const [open, setOpen] = useState(() => !!intro && !intro.seen);
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const list = steps(intro?.name ?? '');
  const step = list[i];

  const close = (href?: string) => {
    setOpen(false);
    void intro?.markSeen();
    if (href) go(href);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setI((x) => Math.min(list.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button[data-next]')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !step) return null;
  const Icon = step.icon;
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Introduktion till Jarvis">
      <div className="fade-in absolute inset-0 bg-black/55" aria-hidden />
      <div ref={ref} className="sheet-enter safe-bottom relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[22px] bg-surface sm:rounded-[22px]">
        <div className="top-band px-5 pb-5 pt-5">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-mint">
              <Icon size={22} aria-hidden />
            </span>
            <button type="button" onClick={() => close()} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-on-forest-muted" aria-label="Hoppa över introduktionen">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="relative z-10 mt-3 text-[12px] text-on-forest-muted">
            {i + 1} av {list.length}
          </div>
          <h2 className="relative z-10 m-0 mt-1 font-serif text-[24px] font-semibold leading-tight">{step.title}</h2>
        </div>
        <div className="intro-body flex-1 overflow-y-auto px-5 py-4 text-[15px] leading-relaxed">{step.body}</div>
        <div className="flex items-center justify-between gap-3 border-t border-line-2 px-5 py-3">
          <div className="flex gap-1.5" aria-hidden>
            {list.map((_, k) => (
              <i key={k} className={cx('h-1.5 rounded-full transition-all', k === i ? 'w-5 bg-accent' : 'w-1.5 bg-line')} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" className="btn btn-ghost h-11 min-h-0 px-4" onClick={() => setI(i - 1)}>
                Tillbaka
              </button>
            )}
            {step.action ? (
              <button type="button" data-next className="btn btn-ghost h-11 min-h-0 px-4" onClick={() => close()}>
                Senare
              </button>
            ) : (
              <button type="button" data-next className="btn btn-primary h-11 min-h-0 px-4" onClick={() => setI(i + 1)}>
                Nästa
              </button>
            )}
          </div>
        </div>
        {step.action && (
          <div className="px-5 pb-4">
            <button type="button" className="btn btn-sun w-full" onClick={() => close(step.action!.href)}>
              {step.action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

