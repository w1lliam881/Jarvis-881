import { useEffect, useState } from 'react';

export interface Route {
  path: string[];
  query: URLSearchParams;
  raw: string;
}

/**
 * Hash-routing (#/lager/drop/123). I förhandsvisningen (en ram som inte släpper igenom #/sökväg)
 * hålls adressen i minnet i stället, och länkar fångas upp.
 */
const MEMORY = import.meta.env.MODE === 'preview';
let memoryHash = '#/idag';
const EVENT = 'jarvis-route';

function currentHash(): string {
  return MEMORY ? memoryHash : location.hash;
}

function parse(): Route {
  const raw = currentHash().replace(/^#\/?/, '') || 'idag';
  const [p, q] = raw.split('?');
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q ?? ''), raw };
}

export function go(hash: string) {
  const h = hash.startsWith('#') ? hash : `#/${hash}`;
  if (MEMORY) {
    memoryHash = h;
    window.dispatchEvent(new Event(EVENT));
  } else location.hash = h;
}

if (MEMORY && typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement | null)?.closest?.('a');
    const href = a?.getAttribute('href');
    if (a && href?.startsWith('#')) {
      e.preventDefault();
      go(href);
    }
  });
}

export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => {
      setR(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener(MEMORY ? EVENT : 'hashchange', on);
    return () => window.removeEventListener(MEMORY ? EVENT : 'hashchange', on);
  }, []);
  return r;
}
