// Bilder till agenterna, gjorda i webbläsaren: förminskade referensbilder och bildrutor ur ett klipp.
// Inget laddas upp någon annanstans än till er egen databas, och inga AI-anrop görs här.
import { useCallback, useEffect, useState } from 'react';
import { store } from '../data/store';
import type { MediaItem, MediaKind } from '../data/backend';

function toJpeg(src: CanvasImageSource, w: number, h: number, max: number, quality = 0.72): string {
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

/** En bild förminskad till högst max pixlar på längsta sidan, som JPEG. */
export async function downscaleImage(file: File, max = 640): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return toJpeg(img, img.naturalWidth, img.naturalHeight, max);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Bildrutor jämnt utspridda i ett klipp (första och sista sekunden inräknade), förminskade.
 * Används så att Marketer kan se hur klippet ser ut. Ljudet följer inte med.
 */
export async function videoFrames(file: File, count = 6, max = 480): Promise<{ data: string; note: string }[]> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  try {
    await new Promise<void>((ok, fail) => {
      v.onloadedmetadata = () => ok();
      v.onerror = () => fail(new Error('Videon gick inte att läsa i webbläsaren. Prova en annan fil (mp4 eller mov).'));
    });
    const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
    const out: { data: string; note: string }[] = [];
    for (let i = 0; i < count; i++) {
      const t = Math.min(dur - 0.05, Math.max(0.05, (dur * i) / Math.max(1, count - 1)));
      await new Promise<void>((ok) => {
        v.onseeked = () => ok();
        v.currentTime = t;
      });
      out.push({ data: toJpeg(v, v.videoWidth, v.videoHeight, max, 0.7), note: `${t.toFixed(1).replace('.', ',')} s av ${dur.toFixed(1).replace('.', ',')} s` });
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Bilderna för en sak (en Scout-sökning eller ett klipp). Fungerar bara med Supabase. */
export function useMedia(kind: MediaKind, refId: string | null) {
  const media = store().backend.media;
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    if (!media || !refId) return setItems([]);
    try {
      setItems(await media.list(kind, refId));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [media, kind, refId]);
  useEffect(() => {
    void load();
  }, [load]);
  const add = async (imgs: { data: string; note?: string }[]) => {
    if (!media || !refId || !imgs.length) return false;
    setBusy(true);
    try {
      await media.add(kind, refId, imgs);
      await load();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!media) return;
    await media.remove(id).catch((e) => setErr(e instanceof Error ? e.message : String(e)));
    await load();
  };
  return { items, busy, err, add, remove, available: !!media };
}
