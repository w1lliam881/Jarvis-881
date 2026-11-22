import { daysBetween, todayISO } from './dates';
import { allLanded, isSold, live } from './metrics';
import type { Dataset, VideoPost, VideoType } from './types';

type Need = 'face' | 'voice' | 'package' | 'garments' | 'time';

export interface IdeaTemplate {
  key: string;
  type: VideoType;
  title: string;
  hook: string;
  setup: string;
  needs: Need[];
  length: number; // sekunder
  tags: ('nydrop' | 'gammalt' | 'siffror' | 'japan' | 'jeans' | 'märke' | 'trend' | 'allmänt')[];
  tip: string;
}

// {drop} = senaste dropen, {brand} = vanligaste märket i lager, {n} = antal plagg i senaste dropen,
// {old} = antal plagg över 60 dagar, {best} = bästa säljaren, {cat} = största kategorin i lager
export const IDEAS: IdeaTemplate[] = [
  { key: 'unbox-raw', type: 'Unboxing', title: 'Öppna {drop} i en tagning', hook: '{n} plagg från Japan. Jag har inte sett något av dem i verkligheten än.', setup: 'Kameran på stativ ovanför bordet. Öppna lådan och visa varje plagg i två sekunder. Klipp bort tystnad.', needs: ['package'], length: 30, tags: ['nydrop', 'japan'], tip: 'Lägg det bästa plagget sist så att folk tittar klart.' },
  { key: 'unbox-rank', type: 'Unboxing', title: 'Rangordna plaggen i {drop}', hook: 'Jag rankar varje plagg i dropen från sämst till bäst.', setup: 'Lägg plaggen i en rad på golvet. Flytta dem till rätt plats medan du pratar.', needs: ['package', 'voice'], length: 60, tags: ['nydrop'], tip: 'Fråga tittarna om de håller med. Kommentarer lyfter klippet.' },
  { key: 'unbox-guess', type: 'Unboxing', title: 'Gissa vad jag betalade', hook: 'Gissa vad den här kostade i Japan.', setup: 'Visa ett plagg, paus med text "gissa", sedan rätt pris inklusive frakt och tull.', needs: ['garments'], length: 15, tags: ['nydrop', 'siffror', 'japan'], tip: 'Visa hemkostnaden, inte bara Doorzo-priset. Det skapar diskussion.' },
  { key: 'unbox-asmr', type: 'Unboxing', title: 'ASMR-unboxing av {drop}', hook: '(Inget prat, bara ljudet av kartong och plast.)', setup: 'Nära bilder, mikrofon nära bordet, mjukt ljus. Inget tal, ingen musik.', needs: ['package'], length: 30, tags: ['nydrop'], tip: 'Funkar bra sent på kvällen.' },
  { key: 'unbox-fail', type: 'Unboxing', title: 'Fynd och flopp i {drop}', hook: 'Det här var ett kap. Det här var ett misstag.', setup: 'Visa bästa och sämsta köpet sida vid sida med pris.', needs: ['package', 'voice'], length: 30, tags: ['nydrop', 'siffror'], tip: 'Ärlighet om misstag bygger förtroende.' },
  { key: 'proc-pack', type: 'Process', title: 'Packa en order', hook: 'Någon i {city} köpte precis den här.', setup: 'Vik plagget, lägg i påse, tejpa, skriv etikett. Nära bilder och tydligt ljud.', needs: ['garments'], length: 15, tags: ['allmänt'], tip: 'Visa aldrig köparens namn eller adress.' },
  { key: 'proc-wash', type: 'Process', title: 'Före och efter: tvätt och fix', hook: 'Så här såg den ut när den kom.', setup: 'Före-bild, snabb klippning av tvätt/lagning, efter-bild med övergång.', needs: ['garments', 'time'], length: 30, tags: ['jeans'], tip: 'Övergången på ett handklapp eller knäpp gör klippet delbart.' },
  { key: 'proc-photo', type: 'Process', title: 'Så fotar jag en annons', hook: 'Samma jeans. Två olika bilder. Vilken säljer?', setup: 'Visa en dålig och en bra annonsbild, och hur du ställer upp ljus och bakgrund.', needs: ['garments'], length: 30, tags: ['allmänt'], tip: 'Avsluta med att visa den färdiga annonsen.' },
  { key: 'proc-measure', type: 'Process', title: 'Så mäter jag jeans rätt', hook: 'Därför stämmer storleken på lappen sällan på vintage.', setup: 'Visa midja, innerben och lår med måttband. Jämför med lappen.', needs: ['garments', 'voice'], length: 30, tags: ['jeans'], tip: 'Spara-vänligt: folk sparar mätguider.' },
  { key: 'proc-repair', type: 'Process', title: 'Laga ett hål på 60 sekunder', hook: 'Den här såldes inte. Tills jag gjorde det här.', setup: 'Visa hålet, lagningen i snabbspolning och resultatet.', needs: ['garments', 'time'], length: 60, tags: ['jeans', 'gammalt'], tip: 'Koppla till ett plagg som legat länge.' },
  { key: 'proc-day', type: 'Process', title: 'En dag med {drop}', hook: 'Från tullen till första försäljningen.', setup: 'Korta klipp genom dagen: paket hämtas, öppnas, fotas, läggs upp.', needs: ['package', 'time'], length: 60, tags: ['nydrop', 'japan'], tip: 'Sätt klockslag som text i hörnet.' },
  { key: 'tips-proxy', type: 'Tips', title: '3 misstag nybörjare gör med proxyköp', hook: 'Jag har gjort alla tre. Det kostade mig {cost}.', setup: 'Tre punkter med text på skärmen. Ett exempel per punkt.', needs: ['voice'], length: 30, tags: ['japan', 'siffror'], tip: 'Nämn frakt och tull, det är det folk missar.' },
  { key: 'tips-tags', type: 'Tips', title: 'Så ser du om dina Levi\'s är äkta vintage', hook: 'Kolla den här lappen innan du köper.', setup: 'Nära bilder på röd lapp, knappens baksida och söm.', needs: ['garments'], length: 30, tags: ['jeans', 'märke'], tip: 'Visa ett äkta och ett nyare par sida vid sida.' },
  { key: 'tips-fit', type: 'Tips', title: 'Vilken passform passar dig', hook: 'Rak, slim eller bootcut? Så väljer du.', setup: 'Visa tre jeans på galge och på kropp, med text om vem de passar.', needs: ['garments', 'face'], length: 30, tags: ['jeans'], tip: 'Fråga i slutet vilken de vill se mer av.' },
  { key: 'tips-care', type: 'Tips', title: 'Därför ska du inte tvätta dina jeans så ofta', hook: 'Du förstör dina fades i tvättmaskinen.', setup: 'Visa ett par med fina fades och förklara kort.', needs: ['garments', 'voice'], length: 15, tags: ['jeans'], tip: 'Kort och självsäkert.' },
  { key: 'tips-japan', type: 'Tips', title: 'Varför jag köper kläder från Japan', hook: 'Japanerna tar hand om sina kläder bättre än någon annan.', setup: 'Visa tre plagg i fint skick och berätta kort om varför.', needs: ['voice', 'garments'], length: 30, tags: ['japan'], tip: 'Bra första klipp för nya följare.' },
  { key: 'tips-words', type: 'Tips', title: 'Japanska ord som hittar fynd', hook: 'Sök på det här ordet så hittar du det ingen annan ser.', setup: 'Visa skärmen med söktermer från Jarvis Doorzo-sökning och resultatet.', needs: ['voice'], length: 30, tags: ['japan'], tip: 'Visa aldrig hela din bästa sökning. Spara något till dig själv.' },
  { key: 'style-3ways', type: 'Styling', title: 'Ett plagg, tre outfits', hook: 'Samma {cat} på tre sätt.', setup: 'Tre snabba outfitbyten med samma plagg, gärna med hopp-klipp.', needs: ['face', 'garments'], length: 15, tags: ['gammalt'], tip: 'Välj ett plagg som legat länge. Styling säljer det som annonsen inte gör.' },
  { key: 'style-flatlay', type: 'Styling', title: 'Flatlay-outfit av {brand}', hook: 'En hel outfit bara från mitt lager.', setup: 'Lägg ut outfiten på golvet och filma uppifrån, ett plagg i taget.', needs: ['garments'], length: 15, tags: ['märke', 'gammalt'], tip: 'Fungerar utan att visa ansiktet.' },
  { key: 'style-fit', type: 'Styling', title: 'Fit check med veckans fynd', hook: 'Det här kom med senaste dropen och jag vill nästan behålla den.', setup: 'Spegelselfie-video, vänd dig långsamt, nära bild på detaljer.', needs: ['face', 'garments'], length: 15, tags: ['nydrop'], tip: 'Lägg länk till annonsen i bio.' },
  { key: 'style-season', type: 'Styling', title: 'Vinteroutfit i denim', hook: 'Så bär du jeans när det är minusgrader.', setup: 'Lager på lager: jeans, stickat, jacka. Visa en del i taget.', needs: ['face', 'garments'], length: 30, tags: ['trend'], tip: 'Säsongsklipp funkar bäst precis när vädret slår om.' },
  { key: 'story-numbers', type: 'Berättelse', title: 'Veckans siffror', hook: 'Så mycket tjänade jag på second hand den här veckan.', setup: 'Visa sålt, kostnad och resultat från Jarvis med text på skärmen.', needs: [], length: 30, tags: ['siffror'], tip: 'Ärliga siffror, även dåliga veckor, ger trogna följare.' },
  { key: 'story-roi', type: 'Berättelse', title: 'Från {cost} till {sale}', hook: 'Jag köpte den här för {cost}. Den såldes för {sale}.', setup: 'Bild på plagget, pris i Japan, frakt och tull, säljpris. Räkna ihop på skärmen.', needs: [], length: 15, tags: ['siffror', 'japan'], tip: 'Bästa säljaren just nu: {best}.' },
  { key: 'story-why', type: 'Berättelse', title: 'Varför jag startade 881', hook: 'Jag började med 0 kr och en idé.', setup: 'Prata direkt i kameran, korta klipp med bilder från början.', needs: ['face', 'voice'], length: 60, tags: ['allmänt'], tip: 'Fäst klippet högst upp på profilen.' },
  { key: 'story-fail', type: 'Berättelse', title: 'Mitt dyraste misstag', hook: 'Det här plagget har legat i {days} dagar.', setup: 'Visa plagget, berätta vad som gick fel och vad du lärde dig.', needs: ['voice', 'garments'], length: 30, tags: ['gammalt'], tip: 'Avsluta med att plagget är till salu.' },
  { key: 'story-goal', type: 'Berättelse', title: 'Mitt mål den här månaden', hook: 'Jag ska sälja {goal} den här månaden. Häng med.', setup: 'Kort klipp med målet och var du är nu. Följ upp i slutet av månaden.', needs: ['face', 'voice'], length: 15, tags: ['siffror'], tip: 'Serier får folk att komma tillbaka.' },
  { key: 'trend-pov', type: 'Trend/humor', title: 'POV: du köper jeans från Japan', hook: 'POV: tullen ringer.', setup: 'Kort sketch med text på skärmen och ett trendigt ljud.', needs: ['face'], length: 15, tags: ['trend', 'japan'], tip: 'Kolla vilka ljud som trendar samma dag.' },
  { key: 'trend-expect', type: 'Trend/humor', title: 'Förväntning mot verklighet', hook: 'Annonsen. Det som kom.', setup: 'Delad skärm: annonsbild och verkligheten.', needs: ['package'], length: 15, tags: ['trend', 'nydrop'], tip: 'Humor gör att folk delar.' },
  { key: 'trend-things', type: 'Trend/humor', title: 'Saker bara resellers förstår', hook: 'När någon frågar "sista pris?" på en annons för 100 kr.', setup: 'Tre korta sketcher med text.', needs: ['face'], length: 15, tags: ['trend'], tip: 'Relaterbart innehåll når långt.' },
  { key: 'sell-rack', type: 'Försäljning', title: 'Allt som finns kvar just nu', hook: '{unsold} plagg kvar. När de är slut är de slut.', setup: 'Gå längs klädstången och visa varje plagg en sekund, pris som text.', needs: ['garments'], length: 30, tags: ['gammalt'], tip: 'Länka till profilen på Vinted/Plick.' },
  { key: 'sell-oldstock', type: 'Försäljning', title: 'Ge {old} gamla plagg en ny chans', hook: 'De här förtjänar ett nytt hem.', setup: 'Visa de äldsta plaggen med nya bilder och nytt ljus.', needs: ['garments'], length: 30, tags: ['gammalt'], tip: 'Publicera om annonserna samma dag som klippet.' },
  { key: 'sell-brand', type: 'Försäljning', title: 'Allt från {brand} i lager', hook: 'Gillar du {brand}? Då är det här för dig.', setup: 'Visa alla plagg från märket med storlek som text.', needs: ['garments'], length: 15, tags: ['märke'], tip: 'Använd märket som hashtag.' },
  { key: 'sell-size', type: 'Försäljning', title: 'Jeans i din storlek', hook: 'W30? Den här är för dig.', setup: 'Ett klipp per storlek, eller storlekarna som text i tur och ordning.', needs: ['garments'], length: 15, tags: ['jeans'], tip: 'Storlek i första sekunden får rätt köpare att stanna.' },
  { key: 'bts-tull', type: 'Bakom kulisserna', title: 'Vad tullen kostar på riktigt', hook: 'Så mycket betalade jag i tull på det senaste paketet.', setup: 'Visa fakturan (dölj personuppgifter) och räkna per plagg.', needs: ['voice'], length: 30, tags: ['siffror', 'japan'], tip: 'Frakt och tull är det folk undrar mest över.' },
  { key: 'bts-storage', type: 'Bakom kulisserna', title: 'Så förvarar jag lagret', hook: 'Här bor {unsold} plagg.', setup: 'Visa hyllor och lådor, hur du hittar rätt plagg snabbt.', needs: [], length: 15, tags: ['allmänt'], tip: 'Ordning och reda bygger förtroende.' },
  { key: 'bts-jarvis', type: 'Bakom kulisserna', title: 'Systemet jag använder för att hålla koll', hook: 'Så vet jag exakt vad varje plagg tjänar.', setup: 'Skärminspelning av Jarvis: drop, plagg, vinst.', needs: [], length: 30, tags: ['siffror'], tip: 'Dölj belopp du inte vill visa.' },
  { key: 'bts-buying', type: 'Bakom kulisserna', title: 'Följ med när jag handlar på Doorzo', hook: 'Jag har 3 000 kr. Vad hittar jag?', setup: 'Skärminspelning av sökning och kalkyl, avsluta med vad du köpte.', needs: ['voice', 'time'], length: 60, tags: ['japan', 'siffror'], tip: 'Visa kalkylens omdöme: Köp, Tveksam eller Avstå.' },
];

export interface Context {
  drop: string;
  n: number;
  brand: string;
  cat: string;
  old: number;
  unsold: number;
  best: string;
  cost: string;
  sale: string;
  days: number;
  newDrop: boolean;
}

export function ideaContext(ds: Dataset, today = todayISO()): Context {
  const drops = live(ds.drops).sort((a, b) => (a.date < b.date ? 1 : -1));
  const L = allLanded(ds);
  const unsold = L.filter((l) => !isSold(l.item));
  const latest = drops[0];
  const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((o, x) => ((o[x] = (o[x] ?? 0) + 1), o), {})).sort((a, b) => b[1] - a[1])[0]?.[0];
  const best = L.filter((l) => l.profit != null).sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))[0];
  const oldest = unsold.sort((a, b) => (a.drop.date < b.drop.date ? -1 : 1))[0];
  return {
    drop: latest?.name ?? 'senaste dropen',
    n: latest ? L.filter((l) => l.drop.id === latest.id).length : 0,
    brand: count(unsold.map((l) => l.item.brand).filter(Boolean)) ?? count(L.map((l) => l.item.brand).filter(Boolean)) ?? 'favoritmärket',
    cat: (count(unsold.map((l) => l.item.category)) ?? 'jeans').toLowerCase(),
    old: unsold.filter((l) => daysBetween(l.drop.date, today) > 60).length,
    unsold: unsold.length,
    best: best ? best.item.name : 'ditt bästa plagg',
    cost: best ? `${Math.round(best.landed / 100)} kr` : '200 kr',
    sale: best ? `${Math.round(best.item.salePrice / 100)} kr` : '800 kr',
    days: oldest ? daysBetween(oldest.drop.date, today) : 60,
    newDrop: !!latest && latest.status === 'hemma' && daysBetween(latest.date, today) <= 21,
  };
}

export function fill(s: string, c: Context): string {
  return s
    .replace(/\{drop\}/g, c.drop)
    .replace(/\{n\}/g, String(c.n || 'Alla'))
    .replace(/\{brand\}/g, c.brand)
    .replace(/\{cat\}/g, c.cat)
    .replace(/\{old\}/g, String(c.old))
    .replace(/\{unsold\}/g, String(c.unsold))
    .replace(/\{best\}/g, c.best)
    .replace(/\{cost\}/g, c.cost)
    .replace(/\{sale\}/g, c.sale)
    .replace(/\{days\}/g, String(c.days))
    .replace(/\{goal\}/g, '20 plagg')
    .replace(/\{city\}/g, 'Göteborg');
}

// ---------- Statistik per typ ----------

export const engagement = (v: VideoPost) => (v.views ? (v.likes + v.comments * 2 + v.shares * 3 + v.saves * 3) / v.views : 0);

export interface TypeStats {
  type: VideoType;
  count: number;
  avgViews: number;
  avgEng: number;
}

export function statsByType(videos: VideoPost[]): TypeStats[] {
  const m = new Map<VideoType, VideoPost[]>();
  for (const v of videos) if (v.views > 0) m.set(v.type, [...(m.get(v.type) ?? []), v]);
  return [...m].map(([type, vs]) => ({
    type,
    count: vs.length,
    avgViews: vs.reduce((s, v) => s + v.views, 0) / vs.length,
    avgEng: vs.reduce((s, v) => s + engagement(v), 0) / vs.length,
  }));
}

export interface Filters {
  type: VideoType | 'Alla';
  length: number | 0;
}

export interface RankedIdea {
  idea: IdeaTemplate;
  title: string;
  hook: string;
  setup: string;
  tip: string;
  score: number;
  why: string[];
}

/** Välj idéer: dina förutsättningar, din historik, aktuellt lager och aldrig en använd eller avfärdad idé. */
export function suggestIdeas(ds: Dataset, f: Filters, limit = 5, today = todayISO()): RankedIdea[] {
  const c = ideaContext(ds, today);
  const ab = ds.settings.videoAbilities;
  const used = new Set(live(ds.ideas).filter((i) => i.status !== 'sparad').map((i) => i.ideaKey));
  const stats = statsByType(live(ds.videos));
  const maxEng = Math.max(0.0001, ...stats.map((s) => s.avgEng));
  const preferred = new Set(ds.settings.videoTypes);
  const postedTypes = live(ds.videos).slice(-5).map((v) => v.type);
  const out: RankedIdea[] = [];
  for (const idea of IDEAS) {
    if (used.has(idea.key)) continue;
    if (f.type !== 'Alla' && idea.type !== f.type) continue;
    if (f.length && Math.abs(idea.length - f.length) > 30) continue;
    if (idea.needs.some((n) => !ab[n])) continue;
    let score = 50;
    const why: string[] = [];
    const st = stats.find((s) => s.type === idea.type);
    if (st && st.count >= 2) {
      const rel = st.avgEng / maxEng;
      score += Math.round(rel * 25);
      if (rel > 0.75) why.push(`${idea.type} har gett dig bäst engagemang`);
    }
    if (preferred.has(idea.type)) {
      score += 10;
      why.push('En typ du brukar göra');
    }
    if (idea.tags.includes('nydrop') && c.newDrop) {
      score += 20;
      why.push(`${c.drop} är ny`);
    }
    if (idea.tags.includes('gammalt') && c.old >= 3) {
      score += 15;
      why.push(`${c.old} plagg har legat över 60 dagar`);
    }
    if (idea.tags.includes('nydrop') && !c.newDrop) score -= 15;
    const repeats = postedTypes.filter((t) => t === idea.type).length;
    if (repeats >= 3) {
      score -= 10;
      why.push('Du har gjort många sådana nyligen, variera gärna');
    }
    out.push({ idea, title: fill(idea.title, c), hook: fill(idea.hook, c), setup: fill(idea.setup, c), tip: fill(idea.tip, c), score, why });
  }
  return out.sort((a, b) => b.score - a.score || a.idea.key.localeCompare(b.idea.key)).slice(0, limit);
}

// ---------- Bedöm en egen idé ----------

export interface Assessment {
  score: number; // 1–10
  verdict: 'Stark idé' | 'Bra idé' | 'Kan bli bra' | 'Tveksam';
  good: string[];
  improve: string[];
}

const HOOK_WORDS = /(\?|hur|varför|så här|gissa|pov|topp|bästa|sämsta|misstag|hemlig|aldrig|ingen|kr\b|\d)/i;

/** Regelbaserad bedömning av en egen videoidé utifrån din historik, ditt lager och dina senaste klipp. */
export function assessIdea(ds: Dataset, p: { text: string; type: VideoType; lengthSec: number; hour: number }, today = todayISO()): Assessment {
  const good: string[] = [];
  const improve: string[] = [];
  let pts = 5;
  const vids = live(ds.videos).filter((v) => v.views > 0);
  const stats = statsByType(vids);
  const st = stats.find((s) => s.type === p.type);
  const best = stats.slice().sort((a, b) => b.avgEng - a.avgEng)[0];
  if (st && best && st.count >= 2) {
    if (st.type === best.type) {
      pts += 2;
      good.push(`${p.type} är din bästa typ hittills`);
    } else if (st.avgEng < best.avgEng * 0.6) {
      pts -= 1;
      improve.push(`${p.type} har gett lägre engagemang än ${best.type} för dig`);
    }
  } else if (vids.length < 4) improve.push('Logga fler klipp med statistik så blir bedömningen träffsäkrare');

  // Längd: jämför med dina bästa klipp
  const top = vids.slice().sort((a, b) => engagement(b) - engagement(a)).slice(0, Math.max(3, Math.ceil(vids.length / 4)));
  if (top.length >= 3) {
    const avgLen = top.reduce((s, v) => s + v.lengthSec, 0) / top.length;
    if (Math.abs(p.lengthSec - avgLen) <= 15) {
      pts += 1;
      good.push(`Längden passar dina bästa klipp (cirka ${Math.round(avgLen)} s)`);
    } else improve.push(`Dina bästa klipp är runt ${Math.round(avgLen)} sekunder`);
    const hours = top.map((v) => new Date(v.postedAt).getHours());
    const avgH = hours.reduce((a, b) => a + b, 0) / hours.length;
    if (Math.abs(p.hour - avgH) <= 2) {
      pts += 1;
      good.push(`Tiden passar när dina bästa klipp postades (runt kl ${Math.round(avgH)})`);
    } else improve.push(`Testa att posta runt kl ${Math.round(avgH)}, då har dina bästa klipp gått ut`);
  } else if (p.lengthSec > 60) improve.push('Kortare än 60 sekunder brukar hålla kvar tittarna bättre');

  // Krok: första meningen
  const first = p.text.split(/[.!\n]/)[0] ?? '';
  if (HOOK_WORDS.test(first)) {
    pts += 1;
    good.push('Början väcker nyfikenhet');
  } else improve.push('Börja med en fråga, en siffra eller ett påstående som får folk att stanna');
  if (p.text.trim().length < 25) {
    pts -= 1;
    improve.push('Beskriv idén lite mer: vad syns, vad sägs, hur slutar den?');
  }

  // Koppling till lagret
  const c = ideaContext(ds, today);
  const t = p.text.toLowerCase();
  const unsold = allLanded(ds).filter((l) => !isSold(l.item));
  const mentions = unsold.filter((l) => (l.item.brand && t.includes(l.item.brand.toLowerCase())) || t.includes(l.item.name.toLowerCase()) || t.includes(l.item.category.toLowerCase().replace(/r$/, ''))).length;
  if (mentions > 0) {
    pts += 1;
    good.push(`Visar plagg du har i lager (${mentions} matchar)`);
  } else if (unsold.length) improve.push(`Visa gärna något från lagret, t.ex. ${c.brand} eller ${c.cat}`);
  if (c.newDrop && /unbox|drop|paket|nytt|nya/.test(t)) {
    pts += 1;
    good.push(`${c.drop} är ny, rätt läge för det här`);
  }
  if (c.old >= 3 && /gammal|kvar|rea|ny chans|styl/.test(t)) {
    pts += 1;
    good.push(`Hjälper dig sälja de ${c.old} plagg som legat länge`);
  }

  // Nyhet: likhet med tidigare titlar
  const words = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const mine = words(p.text);
  const similar = live(ds.videos).filter((v) => {
    const o = words(`${v.title} ${v.note}`);
    const inter = [...mine].filter((w) => o.has(w)).length;
    return mine.size && inter / mine.size > 0.5;
  });
  if (similar.length) {
    pts -= 1;
    improve.push(`Liknar "${similar[0].title}" som du redan gjort, ge den en ny vinkel`);
  }

  const score = Math.max(1, Math.min(10, pts));
  const verdict = score >= 8 ? 'Stark idé' : score >= 6 ? 'Bra idé' : score >= 4 ? 'Kan bli bra' : 'Tveksam';
  return { score, verdict, good, improve };
}

// ---------- Marknadsföringsanalys ----------

export function marketingSummary(ds: Dataset, today = todayISO()) {
  const vids = live(ds.videos);
  const withStats = vids.filter((v) => v.views > 0);
  const byType = statsByType(withStats).sort((a, b) => b.avgEng - a.avgEng);
  const lenBuckets = [
    { label: 'Upp till 15 s', min: 0, max: 15 },
    { label: '16–30 s', min: 16, max: 30 },
    { label: '31–60 s', min: 31, max: 60 },
    { label: 'Över 60 s', min: 61, max: 9999 },
  ].map((b) => {
    const vs = withStats.filter((v) => v.lengthSec >= b.min && v.lengthSec <= b.max);
    return { ...b, count: vs.length, avgViews: vs.length ? vs.reduce((s, v) => s + v.views, 0) / vs.length : 0, avgEng: vs.length ? vs.reduce((s, v) => s + engagement(v), 0) / vs.length : 0 };
  });
  const hours = Array.from({ length: 24 }, (_, h) => {
    const vs = withStats.filter((v) => new Date(v.postedAt).getHours() === h);
    return { hour: h, count: vs.length, avgViews: vs.length ? vs.reduce((s, v) => s + v.views, 0) / vs.length : 0 };
  });
  const bestHour = hours.filter((h) => h.count).sort((a, b) => b.avgViews - a.avgViews)[0] ?? null;
  const songs = new Map<string, number[]>();
  for (const v of withStats) if (v.song) songs.set(v.song, [...(songs.get(v.song) ?? []), v.views]);
  const topSongs = [...songs].map(([song, xs]) => ({ song, count: xs.length, avgViews: xs.reduce((a, b) => a + b, 0) / xs.length })).sort((a, b) => b.avgViews - a.avgViews).slice(0, 5);
  // Plagg som visats och sedan sålts inom 14 dagar
  const items = live(ds.items);
  const conv = vids
    .filter((v) => v.itemIds.length)
    .map((v) => {
      const shown = items.filter((i) => v.itemIds.includes(i.id));
      const soldAfter = shown.filter((i) => isSold(i) && i.saleDate && i.saleDate >= v.postedAt.slice(0, 10) && daysBetween(v.postedAt.slice(0, 10), i.saleDate) <= 14);
      return { video: v, shown: shown.length, sold: soldAfter.length };
    });
  const totals = withStats.reduce((o, v) => ({ views: o.views + v.views, likes: o.likes + v.likes, comments: o.comments + v.comments, shares: o.shares + v.shares, saves: o.saves + v.saves }), { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 });
  const top = withStats.slice().sort((a, b) => b.views - a.views).slice(0, 5);
  const insights: string[] = [];
  if (byType.length >= 2) insights.push(`${byType[0].type} ger bäst engagemang (${(byType[0].avgEng * 100).toFixed(1)} %), ${byType.at(-1)!.type} sämst.`);
  const bestLen = lenBuckets.filter((b) => b.count >= 2).sort((a, b) => b.avgEng - a.avgEng)[0];
  if (bestLen) insights.push(`Klipp på ${bestLen.label.toLowerCase()} fungerar bäst för dig.`);
  if (bestHour) insights.push(`Klipp postade runt kl ${bestHour.hour} har flest visningar i snitt.`);
  const shownSold = conv.reduce((s, c) => s + c.sold, 0);
  const shownTot = conv.reduce((s, c) => s + c.shown, 0);
  if (shownTot) insights.push(`${shownSold} av ${shownTot} plagg som visats i klipp såldes inom 14 dagar.`);
  const pending = vids.filter((v) => v.views === 0 && daysBetween(v.postedAt.slice(0, 10), today) >= 2).length;
  if (pending) insights.push(`${pending} klipp saknar statistik. Lägg in den så blir analysen bättre.`);
  return { count: vids.length, withStats: withStats.length, totals, byType, lenBuckets, bestHour, topSongs, conv, top, insights };
}
