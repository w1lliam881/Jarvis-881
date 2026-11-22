import { supabaseConfigured } from './supabase-config';

export interface PushPrefs {
  time: string; // "HH:MM"
  kinds: { daily: boolean; inbox: boolean; oldStock: boolean };
}

/** Varför påminnelser inte kan slås på här, eller null om det går. */
export function pushBlocker(): string | null {
  if (!supabaseConfigured()) return 'Påminnelser kräver att Jarvis är publicerad med Supabase.';
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) return 'Påminnelser är inte uppsatta på servern än.';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined')
    return 'Lägg Jarvis på hemskärmen (Safari → Dela → Lägg till på hemskärmen) och öppna den därifrån.';
  if (Notification.permission === 'denied') return 'Notiser är avstängda för Jarvis i iPhonens inställningar (Inställningar → Notiser → Jarvis).';
  return null;
}

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const p = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + p).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePush(prefs: PushPrefs): Promise<string | null> {
  const blocked = pushBlocker();
  if (blocked) return blocked;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'Du behöver tillåta notiser för att få påminnelser.';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(import.meta.env.VITE_VAPID_PUBLIC_KEY as string) }));
  const { savePushSubscription } = await import('./supabase');
  return savePushSubscription(sub.toJSON(), prefs);
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const { deletePushSubscription } = await import('./supabase');
  await deletePushSubscription(sub.endpoint);
  await sub.unsubscribe();
}

export async function pushActive(): Promise<boolean> {
  if (pushBlocker()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}
