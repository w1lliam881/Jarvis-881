// Supabase Edge Function: skickar webbnotiser till telefonen.
//  - mode "daily": varje timme (pg_cron, jobbet jarvis-reminders). Den som valt den timmen får alltid en notis,
//    även en lugn dag (förut skickades inget om det inte fanns uppgifter, och då kom aldrig någon notis).
//  - mode "agent": direkt när en agent har jobbat, svarat i telefonen eller vill ha ditt ja (databastriggers).
//  - mode "test": knappen "Skicka testnotis" i appen. Kräver inloggning och skickar bara till dig själv.
// Hemligheter (supabase secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, INGEST_TOKEN och NOTIFY_TOKEN.
// Deployas utan JWT-kontroll (databasen anropar med x-jarvis-token). Se scripts/setup-notiser.sh.
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Sub = { endpoint: string; email: string; subscription: webpush.PushSubscription; remind_at: string; kinds: Record<string, boolean> | null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

  let body: { mode?: string; agent?: string; title?: string; body?: string; url?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = body.mode ?? 'daily';
  const token = req.headers.get('x-jarvis-token');
  const trusted = !!token && [Deno.env.get('INGEST_TOKEN'), Deno.env.get('NOTIFY_TOKEN')].includes(token);

  const { data: subsData } = await db.from('push_subscriptions').select('*');
  const subs = (subsData ?? []) as Sub[];
  const now = new Date();
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(now);

  const send = async (s: Sub, payload: Record<string, string>) => {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' });
      return true;
    } catch (e) {
      // Enheten tar inte längre emot notiser: ta bort prenumerationen
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      console.error('push misslyckades', code, (e as Error).message);
      return false;
    }
  };

  // ---------- Testnotis från appen ----------
  if (mode === 'test') {
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: u } = await db.auth.getUser(jwt);
    const email = u.user?.email?.toLowerCase();
    if (!email) return new Response(JSON.stringify({ sent: 0, error: 'Inte inloggad' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const mine = subs.filter((s) => s.email.toLowerCase() === email);
    let sent = 0;
    for (const s of mine) if (await send(s, { title: 'Jarvis', body: 'Testnotis: notiserna fungerar.', url: './#/idag', tag: 'jarvis-test' })) sent++;
    return new Response(JSON.stringify({ sent, devices: mine.length }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  if (!trusted) return new Response('Inte behörig', { status: 401, headers: cors });

  // ---------- En agent har jobbat eller svarat ----------
  if (mode === 'agent') {
    let sent = 0;
    for (const s of subs) {
      if (s.kinds?.agents === false) continue;
      if (await send(s, { title: body.title ?? 'Jarvis', body: body.body ?? '', url: body.url ?? './#/byn', tag: `jarvis-agent-${body.agent ?? 'x'}-${Date.now()}` })) sent++;
    }
    return new Response(`skickade ${sent}`, { headers: cors });
  }

  // ---------- Dagliga påminnelsen ----------
  const hour = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', hour12: false }).format(now).padStart(2, '0');
  const monday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Stockholm', weekday: 'short' }).format(now) === 'Mon';
  // Marketer: klipp som just passerat 48 timmar utan siffror får en notis (en gång, den timmen de passerar)
  {
    const { data: vids } = await db.from('records').select('data').eq('collection', 'videos').is('deleted_at', null);
    const H = 3600000;
    const justDue = (vids ?? [])
      .map((r) => r.data as { title?: string; postedAt?: string; views?: number })
      .filter((v) => {
        const age = now.getTime() - new Date(v.postedAt ?? 0).getTime();
        return !(Number(v.views) > 0) && age >= 48 * H && age < 49 * H;
      });
    if (justDue.length) {
      const t = justDue[0].title ? `"${String(justDue[0].title).slice(0, 60)}"` : 'Ditt klipp';
      for (const s of subs) {
        if (s.kinds?.daily === false) continue;
        await send(s, {
          title: 'Marketer: dags för siffrorna',
          body: `${justDue.length > 1 ? `${justDue.length} klipp` : t} lades upp för två dygn sedan. Fyll i visningar, likes och sparade från TikTok-analysen.`,
          url: './#/byn/marketer',
          tag: `jarvis-clip-${now.toISOString().slice(0, 13)}`,
        });
      }
    }
  }

  const due = subs.filter((s) => String(s.remind_at).padStart(5, '0').slice(0, 2) === hour);
  if (!due.length) return new Response('inga denna timme', { headers: cors });

  const { data: rows } = await db.from('records').select('collection,data').in('collection', ['tasks', 'inbox', 'items', 'drops', 'searches']).is('deleted_at', null);
  const all = rows ?? [];
  const tasks = all.filter((r) => r.collection === 'tasks' && !r.data.done && r.data.date <= today).length;
  const watches = all.filter((r) => r.collection === 'searches' && r.data.watch).length;
  const inbox = all.filter((r) => r.collection === 'inbox' && r.data.status === 'väntar').length;
  const drops = new Map(all.filter((r) => r.collection === 'drops').map((r) => [r.data.id, r.data.date]));
  const unsold = all.filter((r) => r.collection === 'items' && !(r.data.salePrice > 0) && !r.data.returnedAt);
  const old = unsold.filter((r) => {
    const d = drops.get(r.data.dropId);
    return d && (now.getTime() - new Date(`${d}T12:00:00`).getTime()) / 86400000 > 60;
  }).length;
  const { data: lastRun } = await db.from('agent_runs').select('agent,summary,at').neq('trigger', 'test').order('at', { ascending: false }).limit(1).maybeSingle();
  const { count: waiting } = await db.from('agent_messages').select('id', { count: 'exact', head: true }).eq('kind', 'förslag').eq('status', 'väntar');

  let sent = 0;
  for (const s of due) {
    const k = s.kinds ?? {};
    const parts: string[] = [];
    if (k.daily !== false && tasks) parts.push(`${tasks} uppgifter att göra`);
    if (k.inbox !== false && inbox) parts.push(`${inbox} utkast väntar i godkännandekön`);
    if (k.oldStock !== false && monday && old) parts.push(`${old} plagg har legat över 60 dagar`);
    if (k.watch !== false && watches) parts.push(`kolla dina ${watches} bevakningar`);
    if (waiting) parts.push(`${waiting} förslag från agenterna väntar på ditt ja`);
    if (!parts.length) {
      if (k.daily === false) continue;
      // Lugn dag: skicka ändå, så att du vet att notiserna fungerar och vad som hänt
      const recent = lastRun && now.getTime() - new Date(lastRun.at).getTime() < 24 * 3600000 ? ` ${lastRun.summary}` : '';
      parts.push(`Inget akut idag. ${unsold.length} plagg i lager.${recent}`.slice(0, 220));
    }
    if (await send(s, { title: 'Jarvis', body: parts.join(' · '), url: inbox ? './#/ekonomi/ko' : './#/idag', tag: `jarvis-${today}` })) sent++;
  }
  return new Response(`skickade ${sent}`, { headers: cors });
});
