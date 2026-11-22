// Supabase Edge Function: skickar påminnelser som webbnotiser. Körs varje timme av pg_cron (se README).
// Hemligheter (sätts med `supabase secrets set`): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:din@mejl.se).
// SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY finns automatiskt i funktionen. Anropas av pg_cron med INGEST_TOKEN.
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  if (req.headers.get('x-jarvis-token') !== Deno.env.get('INGEST_TOKEN')) return new Response('Inte behörig', { status: 401 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

  const now = new Date();
  const hour = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', hour12: false }).format(now);
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(now);
  const monday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Stockholm', weekday: 'short' }).format(now) === 'Mon';

  const { data: subs } = await db.from('push_subscriptions').select('*');
  const due = (subs ?? []).filter((s) => String(s.remind_at).slice(0, 2) === hour);
  if (!due.length) return new Response('inga');

  const { data: rows } = await db.from('records').select('collection,data').in('collection', ['tasks', 'inbox', 'items', 'drops', 'searches']).is('deleted_at', null);
  const all = rows ?? [];
  const tasks = all.filter((r) => r.collection === 'tasks' && !r.data.done && r.data.date <= today).length;
  const watches = all.filter((r) => r.collection === 'searches' && r.data.watch).length;
  const inbox = all.filter((r) => r.collection === 'inbox' && r.data.status === 'väntar').length;
  const drops = new Map(all.filter((r) => r.collection === 'drops').map((r) => [r.data.id, r.data.date]));
  const old = all.filter((r) => {
    if (r.collection !== 'items' || r.data.salePrice > 0) return false;
    const d = drops.get(r.data.dropId);
    return d && (now.getTime() - new Date(`${d}T12:00:00`).getTime()) / 86400000 > 60;
  }).length;

  let sent = 0;
  for (const s of due) {
    const parts: string[] = [];
    if (s.kinds?.daily && tasks) parts.push(`${tasks} uppgifter att göra`);
    if (s.kinds?.inbox && inbox) parts.push(`${inbox} utkast väntar i godkännandekön`);
    if (s.kinds?.oldStock && monday && old) parts.push(`${old} plagg har legat över 60 dagar`);
    if (s.kinds?.watch !== false && watches) parts.push(`kolla dina ${watches} bevakningar`);
    if (!parts.length) continue;
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify({ title: 'Jarvis', body: parts.join(' · '), url: inbox ? './#/ekonomi/ko' : './#/idag', tag: `jarvis-${today}` }));
      sent++;
    } catch (e) {
      // Enheten har slutat ta emot notiser: ta bort prenumerationen
      if ((e as { statusCode?: number }).statusCode === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }
  return new Response(`skickade ${sent}`);
});
