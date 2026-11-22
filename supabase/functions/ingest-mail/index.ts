// Supabase Edge Function: tar emot mejl från Vinted, Plick och Doorzo (skickas av ett Google Apps Script i ditt Gmail)
// och lägger dem som utkast i godkännandekön. Inget bokförs förrän du godkänner i appen.
// Hemlighet: INGEST_TOKEN (samma som i Apps Script).
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

/** Spara så lite personuppgifter som möjligt: ta bort adressrader, telefonnummer och allt efter leveransadressen. */
function minimize(text: string): string {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (/^(leverans|frakt|shipping|delivery)?\s*adress|^address/i.test(l)) break;
    if (/\b\d{3}\s?\d{2}\b\s+[A-ZÅÄÖ]/.test(l)) continue; // postnummer + ort
    if (/(\+46|\b07\d)[\d\s-]{6,}/.test(l)) continue; // telefon
    if (/@/.test(l) && !/vinted|plick|doorzo/i.test(l)) continue; // e-postadresser
    out.push(raw);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').slice(0, 6000);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Fel metod' }, 405);
  const token = Deno.env.get('INGEST_TOKEN');
  if (!token || req.headers.get('x-jarvis-token') !== token) return json({ error: 'Inte behörig' }, 401);
  const m = await req.json().catch(() => null);
  if (!m?.id || !m?.body) return json({ error: 'Ogiltigt mejl' }, 400);
  const from = String(m.from ?? '');
  const subject = String(m.subject ?? '').slice(0, 200);
  const src = /vinted/i.test(from + subject) ? 'Vinted' : /plick/i.test(from + subject) ? 'Plick' : /doorzo/i.test(from + subject) ? 'Doorzo' : null;
  if (!src) return json({ ok: true, ignored: true });

  const now = new Date().toISOString();
  const id = `gmail-${String(m.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const date = /^\d{4}-\d{2}-\d{2}/.test(String(m.date ?? '')) ? String(m.date).slice(0, 10) : now.slice(0, 10);
  const draft = {
    id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Gmail',
    deletedAt: null,
    source: 'gmail',
    status: 'väntar',
    title: `${src}: ${subject}`,
    eventType: src === 'Doorzo' ? 'shipping' : 'sale',
    amount: 0,
    date,
    rawText: `Från: ${src}\nÄmne: ${subject}\nDatum: ${date}\n\n${minimize(String(m.body))}`,
    dropId: null,
    itemId: null,
    platform: src === 'Doorzo' ? null : src,
    confidence: 0, // 0 = appen tolkar texten när du öppnar kön
  };
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Samma mejl två gånger ignoreras (id från Gmail)
  const { error } = await db.from('records').upsert({ collection: 'inbox', id, data: draft, version: 1, updated_by: 'Gmail' }, { onConflict: 'collection,id', ignoreDuplicates: true });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, id });
});
