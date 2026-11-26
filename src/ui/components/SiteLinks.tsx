// Direktlänkar till dina profiler på sajterna (Doorzo: startsidan). Loggan hämtas från sajten själv (dess ikon), med bokstaven som reserv.
import { useState } from 'react';
import { cx } from './ui';

export interface Site {
  id: string;
  name: string;
  url: string;
  icon: string;
  color: string;
  ink: string;
}

export const SITES: Site[] = [
  { id: 'vinted', name: 'Vinted', url: 'https://www.vinted.se/member/197017030', icon: 'https://www.vinted.se/favicon.ico', color: '#09B1BA', ink: '#FFFFFF' },
  { id: 'plick', name: 'Plick', url: 'https://plick.se/profiler/w1lliam881', icon: 'https://plick.se/favicon.ico', color: '#111111', ink: '#FFFFFF' },
  { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/@w1lliam881', icon: 'https://www.tiktok.com/favicon.ico', color: '#010101', ink: '#25F4EE' },
  { id: 'doorzo', name: 'Doorzo', url: 'https://www.doorzo.com', icon: 'https://www.doorzo.com/favicon.ico', color: '#FF6A00', ink: '#FFFFFF' },
];

export function SiteLogo({ site, size = 36 }: { site: Site; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-xl" style={{ width: size, height: size, background: failed ? site.color : '#FFFFFF', boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }}>
      {failed ? (
        <span className="text-[15px] font-bold" style={{ color: site.ink }}>
          {site.name[0]}
        </span>
      ) : (
        <img src={site.icon} alt="" width={size * 0.62} height={size * 0.62} onError={() => setFailed(true)} referrerPolicy="no-referrer" loading="lazy" />
      )}
    </span>
  );
}

/** En diskret rad med loggor. tone dark = på det gröna bandet. */
export function SiteLinks({ size = 32, tone = 'light', className }: { size?: number; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <div className={cx('flex items-center gap-2', className)} role="list" aria-label="Dina sajter">
      {SITES.map((s) => (
        <a
          key={s.id}
          role="listitem"
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className={cx('rounded-xl transition-transform hover:-translate-y-0.5 active:scale-95', tone === 'dark' && 'ring-1 ring-white/15')}
          aria-label={`Öppna ${s.name}`}
          title={s.name}
        >
          <SiteLogo site={s} size={size} />
        </a>
      ))}
    </div>
  );
}
