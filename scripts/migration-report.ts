// Skapar docs/MIGRERINGSRAPPORT.md från en v14-export. Kör: npm run migrate:report -- <fil.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { importV14, reconcile, sourceTotals } from '../src/domain/import-v14';
import { runChecks, healthScore } from '../src/domain/checks';
import { kr } from '../src/domain/money';

const file = process.argv[2] ?? 'fixtures/v14-audit.json';
const src = JSON.parse(readFileSync(file, 'utf8'));
const { dataset, warnings } = importV14(src);
const r = reconcile(src, dataset);
const s = sourceTotals(src);
const fmt = (n: number, u: 'st' | 'öre') => (u === 'öre' ? kr(n, { decimals: true }) : `${n} st`).replace(/ /g, ' ');
const checks = runChecks(dataset, new Date().toISOString().slice(0, 10));
const lines = [
  '# Migreringsrapport: Jarvis v14 → Jarvis 2.0',
  '',
  `Källa: \`${file}\` · skapad ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  '',
  `**Resultat: ${r.ok ? 'alla siffror stämmer' : 'avvikelser finns, se nedan'}.**`,
  '',
  '## Antal och summor',
  '',
  '| Kontroll | v14 | Jarvis 2.0 | Stämmer |',
  '|---|---:|---:|:---:|',
  ...r.lines.map((l) => `| ${l.label} | ${fmt(l.source, l.unit)} | ${fmt(l.target, l.unit)} | ${l.ok ? 'Ja' : '**Nej**'} |`),
  '',
  '## Saldo per konto (bokföringens totaler)',
  '',
  '| Konto | v14 | Jarvis 2.0 | Stämmer |',
  '|---|---:|---:|:---:|',
  ...r.accounts.map((a) => `| ${a.account} | ${fmt(a.source, 'öre')} | ${fmt(a.target, 'öre')} | ${a.ok ? 'Ja' : '**Nej**'} |`),
  '',
  '## Ändringar när automatiska verifikat räknas om',
  '',
  'Efter importen räknar Jarvis fram de automatiska verifikaten från plaggen (exakt ett per händelse). Det här skiljer sig från hur v14 senast sparade dem. Inget raderas förrän du har godkänt importen i appen.',
  '',
  ...(r.ledgerChanges.details.length ? r.ledgerChanges.details.map((d) => `- ${d}`) : ['- Inga ändringar.']),
  '',
  'Förklaring:',
  '',
  '- **Försäljning av äldre plagg bokförs per månad.** v14 lade all samlad försäljning för en drop på ett datum. Ett plagg i Drop Aug/sep (A.P.C. Denim Jacket, 400 kr) såldes 19 november men låg i septembers verifikat. Nu hamnar det i november. Totalen är densamma.',
  '- **Sålda plagg som saknade verifikat får ett.** Ett plagg (average joe, 800 kr, 19 november) var markerat som sålt i v14 men hade inget verifikat. Intäkten i bokföringen ökar därför med 800 kr jämfört med v14:s sparade bokföring, och stämmer nu med plaggen.',
  '',
  '## Saker att titta på efter importen',
  '',
  `Hälsopoäng efter import: **${healthScore(checks)}/100**.`,
  '',
  ...checks.map((g) => `- ${g.title}: ${g.refs.length} st${g.refs.length <= 3 ? ` (${g.refs.map((x) => x.label.replace(/ /g, ' ')).join('; ')})` : ''}`),
  '',
  warnings.length ? '## Varningar\n\n' + warnings.map((w) => `- ${w}`).join('\n') : '',
  '',
  '## Att stämma av inför lansering',
  '',
  '- Ta en färsk export från v14 (Idag → Mer → "Ladda ner kopia") och importera den under Mer → Import. Rapporten i appen visar samma tabeller.',
  `- Paket 2 har vikten ${(dataset.items.filter((i) => i.dropId === 'drop-okt2').reduce((a, i) => a + i.weightKg, 0)).toLocaleString('sv-SE')} kg i v14-datan, medan specen säger 16,45 kg. Kontrollera vikterna på plaggen i Paket 2.`,
  `- v14-filen innehåller ${s.drops} drops och ${s.vouchers} verifikat men inga uppgifter, mål eller kalkyler. De följer med från den färska exporten.`,
];
writeFileSync('docs/MIGRERINGSRAPPORT.md', lines.join('\n') + '\n');
console.log('docs/MIGRERINGSRAPPORT.md skriven', r.ok ? '(stämmer)' : '(avvikelser)');
