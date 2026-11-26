import { supabaseConfigured } from './supabase-config';

// Publik nyckel för webbnotiser (inte hemlig). Den privata ligger bara i Supabase.
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || 'BJNM8FEBn8YsLi_A6ZgPOOOpgwT-G_J6VzrWsV-Fv4Be6M08gAFw3uGVfMVNNNVHGZHXVssQdgmCoVHtJfpov9o';

export interface PushPrefs {
  time: string; // "HH:MM"
  kinds: { daily: boolean; inbox: boolean; oldStock: boolean; watch?: boolean; agents?: boolean };
}

/** Varför påminnelser inte kan slås på här, eller null om det går. */
export function pushBlocker(): string | null {
  if (!supabaseConfigured()) return 'Påminnelser kräver att Jarvis är publicerad med Supabase.';
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
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
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

/** Skickar en testnotis till dina egna enheter. Returnerar ett felmeddelande eller null. */
export async function testPush(): Promise<string | null> {
  const blocked = pushBlocker();
  if (blocked) return blocked;
  const { sendTestPush } = await import('./supabase');
  return sendTestPush();
}
