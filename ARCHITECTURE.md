# Jarvis 2.0 – Arkitektur

## Översikt

```
Webbläsare (iPhone, PWA)
 ├─ UI: React 19 + Tailwind 4 (src/ui)
 ├─ Store: en enda sanning i minnet (src/data/store.ts)
 │    ├─ bygger nya versioner av poster (gamla objekt ändras aldrig)
 │    ├─ räknar om automatiska verifikat (src/domain/ledger.ts)
 │    └─ sparar atomiskt med versionskontroll per rad
 ├─ Domän: ren logik utan UI, fullt testad (src/domain, src/game)
 └─ Lagring (Backend-gränssnitt, src/data/backend.ts)
      ├─ LocalBackend: IndexedDB på enheten (nu)
      ├─ SupabaseBackend: Postgres i EU + inloggning + filer + realtid (när kontot finns)
      └─ MemoryBackend: tester och privat läge
```

## Principer

- **En sanning.** Allt (översikt, analys, bokföring, kalender, spelet) räknas fram från samma dataset. Inga siffror lagras dubbelt.
- **Händelser → verifikat.** Drops och plagg är händelser. `desiredAll()` räknar fram exakt de automatiska verifikat som ska finnas (en nyckel per händelse, t.ex. `item:abc:sale`). `diffLedger()` jämför med det som finns och skapar, uppdaterar eller tar bort. Dubbletter med samma nyckel tas bort.
- **Inga tysta fel.** En ändring visas först när lagringen bekräftat den ("Sparat"). Vid fel visas orsaken och inget ändras.
- **Ingen överskrivning.** Varje post har ett versionsnummer. Sparningen kräver att versionen är den man läste. Annars avbryts allt, datan laddas om och användaren ser varför.
- **Ångra och mjuk radering.** Inget raderas på riktigt. Ändringslogg med vem, vad och när.
- **Säkerhetskopia före allt farligt.** Import och återställning tar alltid en kopia först. Daglig automatisk kopia (lokalt vid start, i Supabase via pg_cron kl 03).
- **Pengar i ören.** Heltal överallt, fördelning av frakt och tull med största-rest-metoden så att summor alltid stämmer på öret.

## Lärdomar från v14 och hur de är lösta

| Problem i v14 | Lösning |
|---|---|
| Frysta objekt, ändringar ignorerades tyst | Ny kopia av varje post, varje sparning bekräftas och visas |
| Gamla flikar skrev över ny data | Versionsnummer per rad, transaktion, omladdning vid konflikt, BroadcastChannel/realtid |
| Automatiska verifikat dubbelräknades | En nyckel per händelse, diff som tar bort dubbletter, kontroll för manuella dubbletter |
| Dubbla kodlager | Små moduler, ren domänlogik med tester, UI separat |
| Zoom på iPhone | 16 px i alla fält |
| Data skrevs om utan backup | Kopia före import och återställning, dagliga kopior |

## Moduler

| Fil | Ansvar |
|---|---|
| `src/domain/types.ts` | Datamodellen |
| `src/domain/money.ts` | Ören, tolkning av svensk inmatning, formatering, exakt fördelning |
| `src/domain/metrics.ts` | Hemkostnad, dropstatistik, resultat, historik, lagerålder |
| `src/domain/ledger.ts` | Kontoplan, händelser → verifikat, automatiska verifikat, huvudbok, dubbletter |
| `src/domain/checks.ts` | Kontroll och hälsopoäng |
| `src/domain/calc.ts` | Kalkyl, maxpris per kategori, orderplan och budget |
| `src/domain/parse.ts` | Inklistring av drops, mejl och CSV |
| `src/domain/import-v14.ts` | Import från v14 och avstämning |
| `src/domain/export.ts` | CSV, SIE 4, JSON |
| `src/domain/doorzo.ts` | Ordlista svenska → japanska |
| `src/domain/video.ts` | Idébank, bedömning av egna idéer, marknadsföringsanalys |
| `src/game/engine.ts` | XP, nivåer, världar, uppdrag från data, bossar, badges |
| `src/data/*` | Store, actions, lagring |
| `supabase/migrations/0001_init.sql` | Tabeller, RLS, debet = kredit-trigger, atomisk sparning, daglig backup |

## Drift och kostnad

| Tjänst | Nivå | Kostnad per månad |
|---|---|---|
| Vercel (hosting) | Hobby (gratis) | 0 kr |
| Supabase (databas, inloggning, filer, realtid, pg_cron) | Free: 500 MB databas, 1 GB filer, 50 000 aktiva användare | 0 kr |
| Gmail-läsning (senare) | Google Cloud, Gmail API inom gratiskvoten | 0 kr |
| AI-tjänster | Inga. Doorzo, videoidéer, uppdrag och analys är regler och listor i koden | 0 kr |
| **Totalt** | | **0 kr** |

Kända gränser på gratisnivåerna: Supabase pausar ett projekt efter 7 dagar utan aktivitet (det räcker att öppna appen en gång i veckan, annars ett klick för att väcka det). 1 GB filer räcker till ungefär 3 000–5 000 kvittofoton. Bilder kan komprimeras innan uppladdning om det behövs.

## Säkerhet och integritet

- Inga nycklar i koden. Supabase-adress och publik nyckel ligger i miljövariabler (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Den publika nyckeln är gjord för att ligga i webbläsaren, skyddet sitter i row level security.
- Row level security: bara e-postadresser i `allowed_users` kan läsa eller skriva.
- Inloggning med e-postlänk, inga lösenord.
- Data i EU (Supabase-region Frankfurt eller Stockholm).
- Personuppgifter: bara era två e-postadresser och namn. Inga köparuppgifter lagras.

## Automation (fas 4)

Allt utan kostnad och med godkännandekö:

- Inklistrad mejltext → utkast (klart).
- Gmail: en schemalagd Supabase Edge Function med läsbehörighet (`gmail.readonly`) som söker efter mejl från Vinted, Plick och Doorzo och lägger utkast i `inbox`. Kräver ditt samtycke i Google och ett Google Cloud-projekt (gratis). Inte byggt än, se `PLAN.md`.
- Google Sheets: läsning av det nya arket när det finns.
