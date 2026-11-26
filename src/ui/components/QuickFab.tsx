// Snabbknappen nere till höger: sålt något, nytt inköp och dina sajter. Valen rullar upp med en kort animation.
import { useEffect, useRef, useState } from 'react';
import { Package, ShoppingBag, Zap, X } from 'lucide-react';
import { SITES, SiteLogo } from './SiteLinks';
import { cx } from './ui';
import type { QuickKind } from '../Quick';

export function QuickFab({ onPick, hidden }: { onPick: (k: QuickKind) => void; hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onHash = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('hashchange', onHash);
    };
  }, [open]);
  if (hidden) return null;
  const pick = (k: QuickKind) => {
    setOpen(false);
    onPick(k);
  };
  const actions = [
    { k: 'sale' as const, icon: ShoppingBag, t: 'Sålt något', s: 'Pris och plattform, klart' },
    { k: 'drop' as const, icon: Package, t: 'Nytt inköp', s: 'Klistra in plaggen' },
  ];
  return (
    <div ref={ref} className="no-print fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-2 lg:bottom-8 lg:right-8">
      {open && (
        <div className="flex flex-col items-end gap-2" role="menu" aria-label="Snabbval">
          <div className="fab-item flex items-center gap-2 rounded-2xl bg-surface p-2 shadow-[0_8px_24px_rgba(23,63,49,.22)] ring-1 ring-line" style={{ animationDelay: '120ms' }}>
            {SITES.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" role="menuitem" className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-1 active:scale-95" aria-label={`Öppna ${s.name}`} onClick={() => setOpen(false)}>
                <SiteLogo site={s} size={38} />
                <span className="text-[11px] font-medium text-muted">{s.name}</span>
              </a>
            ))}
          </div>
          {actions.map((a, i) => (
            <button
              key={a.k}
              type="button"
              role="menuitem"
              onClick={() => pick(a.k)}
              className="fab-item flex min-h-[52px] items-center gap-3 rounded-2xl bg-surface py-2 pl-3 pr-4 text-left shadow-[0_8px_24px_rgba(23,63,49,.22)] ring-1 ring-line"
              style={{ animationDelay: `${60 - i * 60}ms` }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
                <a.icon size={18} aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">{a.t}</span>
                <span className="text-[12px] text-muted">{a.s}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Stäng snabbval' : 'Snabbval: sålt något, nytt inköp och dina sajter'}
        className={cx('btn btn-sun h-[54px] rounded-2xl px-5 shadow-[0_6px_16px_rgba(23,63,49,.25)] transition-transform', open && 'scale-95')}
      >
        <span className={cx('grid transition-transform duration-200', open && 'rotate-90')}>{open ? <X size={20} strokeWidth={2.4} aria-hidden /> : <Zap size={20} strokeWidth={2.4} aria-hidden />}</span>
        Snabbt
      </button>
    </div>
  );
}
