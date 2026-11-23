import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { kr, parseKr, toOre } from '../../domain/money';
import type { Ore } from '../../domain/types';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

// ---------- Layout ----------

export function TopBand({ title, sub, right, children, back }: { title: string; sub?: ReactNode; right?: ReactNode; children?: ReactNode; back?: string }) {
  return (
    <header className="top-band safe-top px-5 pb-5 lg:px-8 lg:pb-7">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {back && (
            <a href={back} className="-ml-1 mb-1 inline-flex min-h-[32px] items-center gap-1 text-[13px] text-on-forest-muted">
              <ChevronLeft size={16} aria-hidden /> Tillbaka
            </a>
          )}
          {sub && <div className="text-[13px] text-on-forest-muted">{sub}</div>}
          <h1 className="m-0 truncate font-serif text-[30px] font-semibold leading-tight tracking-[-0.01em]">{title}</h1>
        </div>
        {right}
      </div>
      {children && <div className="relative z-10 mt-4">{children}</div>}
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="page mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pb-32 pt-4 lg:max-w-[1280px] lg:gap-6 lg:px-8 lg:pb-[72px] lg:pt-7">{children}</div>;
}

export function Section({ title, action, children, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="flex flex-col gap-2">
      {(title || action) && (
        <div className="flex items-baseline justify-between px-1">
          {title && <h2 className="m-0 text-[15px] font-semibold">{title}</h2>}
          {action && <div className="text-[13px] font-medium text-accent">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={cx('card', pad && 'p-4', className)}>{children}</div>;
}

export function Row({
  children,
  onClick,
  href,
  className,
  chevron,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  chevron?: boolean;
}) {
  const cls = cx('flex min-h-[52px] w-full items-center gap-3 border-b border-line-2 px-4 py-3 text-left last:border-b-0', (onClick || href) && 'active:bg-surface-2', className);
  const inner = (
    <>
      {children}
      {chevron && <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />}
    </>
  );
  if (href)
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-start gap-2 p-5">
      <div className="font-semibold">{title}</div>
      {text && <p className="m-0 text-[14px] text-muted">{text}</p>}
      {action}
    </div>
  );
}

// ---------- Siffror ----------

export function Money({ v, className, sign, decimals }: { v: Ore; className?: string; sign?: boolean; decimals?: boolean }) {
  const s = kr(Math.abs(v), { decimals });
  return <span className={cx('num', className)}>{v < 0 ? `−${s}` : sign && v > 0 ? `+${s}` : s}</span>;
}

export function Stat({ label, value, sub, tone, onClick }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'warn' | 'pos' | 'neg'; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div';
  return (
    <C type={onClick ? 'button' : undefined} onClick={onClick} className={cx('card flex flex-col items-start p-3 text-left', onClick && 'active:scale-[0.99]')}>
      <span className="text-[12px] text-muted">{label}</span>
      <span className="num mt-0.5 text-[18px] font-medium">{value}</span>
      {sub && <span className={cx('mt-1 text-[12px]', tone === 'warn' ? 'text-me' : tone === 'neg' ? 'text-neg' : tone === 'pos' ? 'text-pos' : 'text-muted')}>{sub}</span>}
    </C>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: 'hi' | 'me' | 'lo' | 'neutral' | 'pos' | 'neg' | 'sun'; children: ReactNode }) {
  const map = {
    hi: 'bg-hi-bg text-hi',
    me: 'bg-me-bg text-me',
    lo: 'bg-lo-bg text-lo',
    pos: 'bg-lo-bg text-pos',
    neg: 'bg-hi-bg text-neg',
    sun: 'bg-me-bg text-me',
    neutral: 'bg-surface-2 text-muted border border-line',
  } as const;
  return <span className={cx('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', map[tone])}>{children}</span>;
}

export function RoiPill({ roi }: { roi: number | null }) {
  if (roi == null || !Number.isFinite(roi)) return <span className="num text-muted">–</span>;
  const r = Math.round(roi);
  return (
    <span className={cx('num inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px]', r >= 0 ? 'bg-lo-bg text-pos' : 'bg-hi-bg text-neg')}>
      {r > 0 ? '+' : r < 0 ? '−' : ''}
      {Math.abs(r).toLocaleString('sv-SE')}&nbsp;%
    </span>
  );
}

export function Bar({ value, max = 1, tone = 'accent', className }: { value: number; max?: number; tone?: 'accent' | 'sun' | 'grad' | 'mint'; className?: string }) {
  const p = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const bg = tone === 'sun' ? 'var(--sun)' : tone === 'mint' ? 'var(--mint)' : tone === 'grad' ? 'linear-gradient(90deg, var(--mint), var(--sun))' : 'var(--accent)';
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-line-2', className)} role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <i className="block h-full rounded-full" style={{ width: `${p}%`, background: bg }} />
    </div>
  );
}

export function Spark({ values, height = 54, on = 'var(--mint)', off = 'rgba(158,219,184,.28)' }: { values: number[]; height?: number; on?: string; off?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden>
      {values.map((v, i) => (
        <span key={i} className="w-1 rounded-sm" style={{ height: v ? Math.max(8, Math.round((v / max) * height)) : 4, background: v ? on : off }} />
      ))}
    </div>
  );
}

export function Bars({ rows, format }: { rows: { label: string; value: number; sub?: string; color?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  if (!rows.length) return <p className="m-0 text-[14px] text-muted">Ingen data ännu.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-[14px]">
            <span className="truncate">{r.label}</span>
            <span className="num shrink-0 text-[13px] text-muted">{r.sub ?? (format ? format(r.value) : r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line-2">
            <i className="block h-full rounded-full" style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: r.value < 0 ? 'var(--neg)' : r.color ?? 'var(--accent)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Columns({ rows, height = 120 }: { rows: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {rows.map((r) => (
        <div key={r.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <i className="block w-full rounded-t" style={{ height: `${(Math.abs(r.value) / max) * 82}%`, minHeight: 2, background: r.value < 0 ? 'var(--neg)' : 'var(--accent)' }} title={`${r.label}: ${kr(r.value)}`} />
          <span className="text-[10px] text-muted">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Formulär ----------

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

/** Beloppsfält i kronor som lagrar ören. Sparar först när man lämnar fältet eller trycker Enter. */
export function MoneyInput({ value, onCommit, placeholder, autoFocus, id }: { value: Ore; onCommit: (v: Ore) => void; placeholder?: string; autoFocus?: boolean; id?: string }) {
  const show = (v: Ore) => (v ? String(v / 100).replace('.', ',') : '');
  const [s, setS] = useState(show(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setS(show(value));
      last.current = value;
    }
  }, [value]);
  const commit = () => {
    const v = toOre(parseKr(s));
    if (v !== value) {
      last.current = v;
      onCommit(v);
    }
  };
  return (
    <div className="relative">
      <input
        id={id}
        className="field num pr-10"
        inputMode="decimal"
        value={s}
        placeholder={placeholder ?? '0'}
        autoFocus={autoFocus}
        onChange={(e) => setS(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">kr</span>
    </div>
  );
}

/** Textfält som sparar när man lämnar det. */
export function TextInput({ value, onCommit, placeholder, type = 'text', inputMode }: { value: string; onCommit: (v: string) => void; placeholder?: string; type?: string; inputMode?: 'decimal' | 'numeric' | 'text' }) {
  const [s, setS] = useState(value);
  useEffect(() => setS(value), [value]);
  return (
    <input
      className="field"
      type={type}
      inputMode={inputMode}
      value={s}
      placeholder={placeholder}
      onChange={(e) => setS(e.target.value)}
      onBlur={() => s !== value && onCommit(s)}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}

export function Select<T extends string>({ value, options, onChange, labels }: { value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({ value, options, onChange, dark }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; dark?: boolean }) {
  return (
    <div className={cx('flex gap-1 rounded-xl p-1', dark ? 'bg-white/10' : 'bg-line-2')} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-[36px] flex-1 rounded-lg px-2 text-[13px] font-semibold transition-colors',
            value === o.value ? (dark ? 'bg-on-forest text-forest' : 'bg-surface text-accent shadow-sm') : dark ? 'text-on-forest-muted' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-[36px] shrink-0 rounded-full border px-3.5 text-[13px] font-semibold',
            value === o.value ? 'border-transparent bg-forest text-on-forest' : 'border-line bg-surface text-muted',
          )}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2">
      <span className="flex flex-col">
        <span className="text-[15px]">{label}</span>
        {sub && <span className="text-[12px] text-muted">{sub}</span>}
      </span>
      <span className="relative inline-flex">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

// ---------- Bottensheet ----------

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus({ preventScroll: true }), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center lg:items-stretch lg:justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Stäng" className="fade-in absolute inset-0 bg-black/45" onClick={onClose} />
      <div ref={ref} className="sheet-enter safe-bottom relative flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-[22px] bg-surface lg:h-full lg:max-h-none lg:max-w-[540px] lg:rounded-none lg:rounded-l-[24px] lg:pt-3 lg:shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
          <div className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-line lg:hidden" aria-hidden />
          <h2 className="m-0 mt-2 font-serif text-[22px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Stäng" className="mt-2 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line-2 px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function useSheet<T = true>() {
  const [state, setState] = useState<T | null>(null);
  return { value: state, open: (v: T) => setState(v), close: () => setState(null), isOpen: state !== null };
}

// ---------- Bekräfta ----------

export function ConfirmButton({ label, confirmLabel = 'Tryck igen för att bekräfta', onConfirm, className }: { label: ReactNode; confirmLabel?: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={cx('btn', armed ? 'btn-danger' : 'btn-ghost', className)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

// ---------- Konfetti ----------

export function confetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#9EDBB8', '#E9B44C', '#1F5A44', '#F4F1E6', '#C97B5A'];
  for (let i = 0; i < 28; i++) {
    const e = document.createElement('span');
    e.className = 'confetti';
    e.style.left = `${5 + Math.random() * 90}vw`;
    e.style.background = colors[i % colors.length];
    e.style.animationDelay = `${Math.random() * 0.35}s`;
    e.style.transform = `rotate(${Math.random() * 180}deg)`;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), 2300);
  }
}
