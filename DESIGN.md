# Jarvis 2.0 – Design

Låst efter godkännande 2026-11-21. Skiss: `docs/design/jarvis-design-v2.png`.

## Riktning

Grund A "Lugn och sober" med mer färg och karaktär: skogsgrönt som bärande färg, mint och solgult som accenter. Inslag från B (mörkt läge, täta tabeller, monospace-siffror, prioritet) och C (serif i rubriker och stora nyckeltal). Ren och lätt att använda, aldrig "AI-design": inga lila/blå gradienter, inga emojis som ikoner, inga glödande skuggor.

## Informationsarkitektur

| Område | Flik | Innehåll |
|---|---|---|
| Idag | Idag | Läget (sålt i månaden, graf per dag, mål), lager, kontroll, resultat, dagens uppdrag, att göra, senast sålt, lagerålder, sammanfattning. Kalender (dag/vecka/månad). |
| Lager | Lager | Plagglista med filter (osålda, över 60 dagar, sålda, ej kontrollerade, fel) och kategorier. Drops år → månad → drop. Drop med redigerbar tabell. Plagg med alla fält. |
| Försäljning | Sälj | Sålda per månad, plattform, sök. Bokförda försäljningar utan plagg kan kopplas. |
| Ekonomi | Ekonomi | Översikt, verifikat, rapporter (resultat, huvudbok, moms), analys (månad, år, drop), kontroll, godkännandekö, export. |
| Planering | Mer → Planering | Kalkyl, framtid och budget, Doorzo-sökningar, marknadsföring, videoidéer. |
| Spelet | Mer → Spelet | Eget pixeluttryck. Uppdrag, världar, bossar, badges. |

Snabbknappen **+ Ny** (solgul, nere till höger) finns överallt: försäljning, kostnad eller händelse, drop, klistra in mejl, uppgift. Bottensheets istället för modaler.

Flöden (vanligaste, under 15 sekunder):

1. **Ny försäljning:** + Ny → Försäljning → sök plagg → pris → Spara. Konfetti, vinsten visas, verifikat skapas.
2. **Ny drop:** + Ny → Drop → klistra in rader → (frakt, tull) → Skapa.
3. **Ny kostnad:** + Ny → Kostnad → typ → belopp → Bokför.
4. **Dagens läge:** öppna appen, Idag visar allt överst.

## Designsystem (tokens i `src/ui/styles.css`)

| Token | Ljust | Mörkt | Användning |
|---|---|---|---|
| `--bg` | #F2F4EF | #0C1210 | Bakgrund, svag grön ton |
| `--surface` | #FFFFFF | #141C18 | Kort |
| `--line` | #E2E6DE | #22302A | Ramar |
| `--text` | #17201B | #E9EEEA | Text |
| `--muted` | #5E6A62 | #93A39A | Sekundär text |
| `--forest` | #173F31 | #183A2E | Toppfält, primärknappar |
| `--mint` | #9EDBB8 | #9EDBB8 | Grafer och positivt på grön botten |
| `--sun` | #E9B44C | #EBB955 | Snabbknapp, mål, markeringar |
| `--accent` | #1F5A44 | #9EDBB8 | Länkar, aktiv flik |
| `--pos` / `--neg` | #2C7A52 / #B5473A | #86D5A9 / #F28B82 | ROI, vinst och förlust |
| `--hi`, `--me`, `--lo` | tegel, gul, grön | | Prioritet Hög, Medel, Låg |

Typsnitt: **Fraunces** (serif) för sidrubriker och stora nyckeltal, **Inter** för text, **IBM Plex Mono** för siffror i tabeller (tabulära siffror). Spelet: **Press Start 2P**.

Mått: kort med radie 14 px, knappar 12 px, minsta tryckyta 44 px, fält minst 16 px text (ingen zoom på iPhone). Toppfältet har rundade nederkanter 24 px och ett diskret cirkelmönster.

Ikoner: Lucide, linje 1,8.

## Tillgänglighet

Kontrast enligt WCAG AA i båda lägena. Alla knappar är riktiga knappar med etiketter, ikonknappar har `aria-label`. Sheets fångar fokus och stängs med Escape. Sparstatus och meddelanden läses upp (`aria-live`). Reducerad rörelse respekteras. Tangentbord på dator: n, k, u, 1–5.

## Copy

Kort, saklig, naturlig svenska. Inga utropstecken i vanliga vyer (utom vid försäljning). Tomma tillstånd säger vad nästa steg är.

## Dator (bred skärm, från 1024 px)

Gäller bara datorn. Telefonen är oförändrad.

- Mörkgrön sidomeny till vänster med månadens försäljning, knappen Ny registrering, alla sidor och genvägar (N, K, U, 1–5). Menyn i botten och den flytande Ny-knappen döljs.
- Innehållet är upp till 1216 px brett. Sidorna delas i två kolumner: Idag, Ekonomi, plagg, drop, kalkyl, planering, inställningar och spelet.
- Försäljning visas som tabell med hemkostnad, vinst och ROI. Mindre viktiga kolumner döljs under 1280 px.
- Fönster (sheets) öppnas som en panel från höger i stället för underifrån.
- Bakgrunden har en svag mint- och solton, och sidomenyn ett diskret twillmönster.
