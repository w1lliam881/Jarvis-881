// Supabase Edge Function: Jarvis-chatten. Skickar konversationen till Claude Sonnet 5.5.
// Verktygen körs i appen (där datan finns); den här funktionen håller nyckeln, modellen och kostnadstaket.
// Hemlighet: ANTHROPIC_API_KEY (sätts i Supabase → Edge Functions → Secrets). Valfritt: AI_MONTHLY_CAP_SEK (standard 50).
import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const MODEL = 'claude-sonnet-5-5';
// Priser i USD per miljon tokens för Claude Sonnet 5.5. Växelkursen är medvetet hög så att taket hålls.
const PRICE = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };
const SEK_PER_USD = 11;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM = `Du är Jarvis, assistent åt 881 – ett litet svenskt företag som köper second hand- och vintagekläder (främst denim) från Japan via Doorzo och säljer dem på Vinted och Plick.

Svara på kort, saklig och naturlig svenska. Använd verktygen för att läsa verklig data innan du svarar på frågor om siffror – gissa aldrig belopp. Belopp i verktygssvaren är i kronor.

Regler:
- Föreslå aldrig ett försäljningspris för ett enskilt plagg. Användaren bestämmer alla priser. Siffror på kategori- eller märkesnivå (snitt, maxpris vid inköp) är okej.
- Ändringar (försäljning, kostnad, uppgift) gör du bara genom propose_-verktygen. Användaren godkänner varje förslag i appen innan något sparas.
- När du rekommenderar att användaren ska göra något med specifika plagg (t.ex. publicera om, fota, paketera), anropa suggest_items med plaggens id så att Jarvis kan följa upp om de såldes.
- Bokföringen är ett stöd för eget bruk, inte skatterådgivning.
- Håll svaren korta: oftast 2–6 meningar eller en kort lista.`;

const s = (props: Record<string, unknown>, required: string[]) => ({ type: 'object' as const, properties: props, required, additionalProperties: false });
const TOOLS: Anthropic.Tool[] = [
  { name: 'overview', description: 'Läget denna månad: sålt, vinst, lager, kontrollpoäng och resultat.', input_schema: s({}, []) },
  {
    name: 'search_items',
    description: 'Sök plagg i lagret och bland sålda. Returnerar högst 25 plagg med id, produkt-ID, namn, märke, storlek, hemkostnad, säljpris, säljdatum och ålder.',
    input_schema: s({ query: { type: 'string', description: 'Fritext: namn, märke, storlek eller produkt-ID. Tomt = alla.' }, status: { type: 'string', enum: ['osålda', 'sålda', 'alla'] } }, ['query', 'status']),
  },
  {
    name: 'sales_summary',
    description: 'Försäljning grupperad per märke, kategori eller månad för en period.',
    input_schema: s({ period: { type: 'string', description: '"2026", "2026-11" eller "" för allt' }, group_by: { type: 'string', enum: ['märke', 'kategori', 'månad'] } }, ['period', 'group_by']),
  },
  { name: 'stale_items', description: 'Osålda plagg äldre än ett antal dagar, äldst först.', input_schema: s({ min_days: { type: 'integer' } }, ['min_days']) },
  { name: 'drops', description: 'Alla drops med kostnad, intäkt, ROI och andel sålda.', input_schema: s({}, []) },
  { name: 'quarter_report', description: 'Kvartalsrapport: vad som tjänar pengar och vad som borde köpas mer eller mindre av.', input_schema: s({ quarter: { type: 'string', description: 'T.ex. "2026-Q4". Tomt = innevarande.' } }, ['quarter']) },
  {
    name: 'suggest_items',
    description: 'Registrera vilka plagg du rekommenderar en åtgärd för, så att Jarvis kan mäta om de såldes efteråt.',
    input_schema: s({ item_ids: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } }, ['item_ids', 'reason']),
  },
  {
    name: 'propose_sale',
    description: 'Föreslå att registrera en försäljning. Använd bara priset användaren själv har angett. Användaren godkänner i appen.',
    input_schema: s({ item_id: { type: 'string' }, price_kr: { type: 'number' }, date: { type: 'string', description: 'YYYY-MM-DD' }, platform: { type: 'string', enum: ['Vinted', 'Plick', 'Egen hemsida', 'Annat'] } }, ['item_id', 'price_kr', 'date', 'platform']),
  },
  {
    name: 'propose_cost',
    description: 'Föreslå att bokföra en kostnad eller händelse. Användaren godkänner i appen.',
    input_schema: s(
      {
        type: { type: 'string', enum: ['shipping', 'customs', 'purchase', 'material', 'ads', 'platformfee', 'bankfee', 'deposit', 'withdrawal'] },
        amount_kr: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        text: { type: 'string' },
      },
      ['type', 'amount_kr', 'date', 'text'],
    ),
  },
  { name: 'propose_task', description: 'Föreslå en uppgift. Användaren godkänner i appen.', input_schema: s({ title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } }, ['title', 'date']) },
];
// Cacha systemprompten och verktygen (de är samma varje gång)
TOOLS[TOOLS.length - 1] = { ...TOOLS[TOOLS.length - 1], cache_control: { type: 'ephemeral' } };

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Fel metod' }, 405);
  // Användaren måste vara inloggad och godkänd
  const auth = req.headers.get('Authorization') ?? '';
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: allowed } = await user.rpc('is_allowed');
  if (!allowed) return json({ error: 'Inte behörig.' }, 403);
  const { data: who } = await user.auth.getUser();
  const email = who.user?.email ?? 'okänd';
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'Jarvis-chatten är inte uppsatt än (nyckel saknas).' }, 503);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const capOre = Math.round(Number(Deno.env.get('AI_MONTHLY_CAP_SEK') ?? '50') * 100);
  const { data: usage } = await admin.from('ai_usage').select('cost_ore').gte('at', monthStart());
  const spent = (usage ?? []).reduce((a, r) => a + (r.cost_ore ?? 0), 0);
  if (spent >= capOre) return json({ error: `Månadens tak på ${capOre / 100} kr är nått. Jarvis-chatten öppnar igen nästa månad.`, spent_ore: spent, cap_ore: capOre }, 402);

  const body = await req.json().catch(() => null);
  const messages = body?.messages;
  if (!Array.isArray(messages) || !messages.length || JSON.stringify(messages).length > 400_000) return json({ error: 'Ogiltig fråga.' }, 400);

  const client = new Anthropic({ apiKey: key });
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: `${SYSTEM}\n\nIdag är det ${new Date().toISOString().slice(0, 10)}.`, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      tool_choice: { type: 'auto' },
      messages,
    } as never);
    const u = (res as unknown as { usage: Record<string, number> }).usage;
    const usd =
      ((u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) / 1_000_000;
    const cost = Math.ceil(usd * SEK_PER_USD * 100);
    await admin.from('ai_usage').insert({ email, kind: 'fråga', cost_ore: cost, input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0 });
    return json({ content: (res as unknown as { content: unknown }).content, stop_reason: (res as unknown as { stop_reason: string }).stop_reason, spent_ore: spent + cost, cap_ore: capOre });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return json({ error: status === 429 ? 'Claude är upptagen just nu, försök igen om en stund.' : `Claude svarade inte: ${(e as Error).message}` }, status >= 400 && status < 600 ? status : 500);
  }
});
