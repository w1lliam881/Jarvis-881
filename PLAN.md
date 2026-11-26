# Jarvis 2.0 – Plan

Status per fas. ✅ klart · 🟡 delvis · ⬜ inte påbörjat. Acceptanskriterier under varje fas.

## Fas 1 – Grund ✅

- ✅ Projekt (Vite, React, TypeScript, Tailwind), PWA-filer
- ✅ Datamodell i ören, ISO-datum, Stockholmstid
- ✅ Lagring med versionskontroll, ångra, ändringslogg, mjuk radering (lokalt; Supabase-schema klart)
- ✅ Import från v14 med avstämningsrapport
- ✅ Enhetstester för alla pengaberäkningar med Paket 1 och 2

Acceptans: `npm test` grönt. Import av audit-filen ger samma antal drops, plagg, sålda, summor och kontosaldon som v14 (se `docs/MIGRERINGSRAPPORT.md`). ✅

## Fas 2 – Kärna ✅

- ✅ Drops (år → månad → drop), redigerbar tabell, inklistring av rader
- ✅ Plagg med alla fält, kontrollstatus, lagerplats, publicerad om, retur
- ✅ Snabbregistrering: försäljning, kostnad/händelse, drop, uppgift, mejl
- ✅ Automatiska verifikat, exakt ett per händelse
- ✅ Underlag: fota, fil, inklistrad text
- ✅ Översikt (Idag), Kontroll med hälsopoäng

Acceptans: försäljning under 15 sekunder (e2e-test), prisändring uppdaterar verifikat och alla vyer direkt, debet = kredit stoppas, gammal flik kan inte skriva över. ✅

## Fas 3 – Resten ✅

- ✅ Analys (månad, år, drop), kalender (dag, vecka, månad), kalkyl, framtid/budget med maxpris, Idag med uppgifter och "Vad är aktuellt?"
- ✅ Doorzo-sökningar utan AI
- ✅ Video: idébank anpassad efter lager och statistik, bedömning av egna idéer
- ✅ Marknadsföring: logga klipp, analys per typ, längd, tid och låt, plagg som sålts efter klipp
- ✅ Rapporter: resultat, huvudbok, verifikationslista, moms (dold tills moms slås på)
- ✅ Export: CSV, SIE 4, PDF (utskrift), JSON

## Fas 3b – Spelet ✅

- ✅ Sex världar i pixelart, låses upp med nivå (en värld ≈ 3–4 veckor)
- ✅ Uppdragsmotor som läser verklig data, bockar av automatiskt, testad
- ✅ Bossar med tre liv (målet uppfyllt tre olika dagar)
- ✅ Badges, streak, hall of fame, titlar (kosmetiska)
- ✅ Animationer, ljud (av som standard), kan stängas av

## Fas 4 – Automation utan kostnad 🟡

- ✅ Godkännandekö för utkast
- ✅ Tolkning av inklistrade mejl från Vinted, Plick, Doorzo
- ✅ Dagliga säkerhetskopior (lokalt vid start; Supabase pg_cron i schemat)
- ✅ Gmail-import via Google Apps Script i ditt eget konto → funktionen `ingest-mail` → godkännandekön (adresser och telefonnummer tas bort)
- ⬜ Google Sheets-import (när det nya arket finns)
- ⬜ CSV-import av försäljning (parser finns, vy saknas)
- ✅ Påminnelser som notiser (funktionen `daily-reminder`, varje timme)

## Fas 5 – Skärpning 🟡

- ✅ Tillgänglighet: etiketter, fokus, kontrast, reducerad rörelse
- ✅ Användarguide i appen och `docs/ANVANDARGUIDE.md`
- ⬜ Supabase uppsatt och testat på riktigt (kräver konto)
- ⬜ Publicerad på Vercel (kräver konto)
- ⬜ Färsk v14-export importerad och avstämd
- ⬜ Prestanda: dela upp koden (bundle ~600 kB, 180 kB gzip)

## Tillägg 2026-11-22 ✅

- ✅ Produkt-ID per plagg (hämtas från v14-kommentarerna), syns i listor, sök och försäljning. Kommentar per plagg.
- ✅ Spelet: världskarta där gubben går mellan världarna, världsscener med boss och miljö
- ✅ Idag: senast sålt visar hela plaggnamnet
- ✅ Analys per märke: omsättning, vinst i kr och vinstmarginal (märke gissas från namnet om det saknas)
- ✅ Närvaro: initial för den som är aktiv, och när den andra senast var inne (aktiveras med Supabase)
- ✅ Ändringslogg: per dag, vem (du eller kompisen), vad som ändrades från → till
- 🟡 Påminnelser som notiser: klart i appen, servern (Supabase-funktion) slås på vid publicering

## Nästa steg (kräver dig)

1. Skapa Supabase-konto (guide i README). Jag kör databasschemat och kopplar appen.
2. Skapa Vercel-konto och koppla GitHub. Jag publicerar.
3. Ta en färsk export från v14 och importera.

## Agenter och Agentbyn (2026-11-24) ✅

- ✅ Fem agenter i `.claude/agents/`: Builder, Reviewer, Advisor, Reminder, Noter. Startas med `/namn` i Claude.
- ✅ Schemalagda uppgifter med notis i telefonen: Reminder varje dag 10:30, Advisor och Reviewer måndagar och fredagar 08:40, Noter söndagar 20:00. Builder bara på kommando.
- ✅ Varje körning sparas i tabellen `agent_runs` (migrering `0002_agent_runs.sql`).
- ✅ Agentbyn (`#/byn`): pixelby där agenterna går runt, med dag, kväll och natt. Varje hus visar jobb, schema och alla rapporter.
- ✅ Alla fem testkörda mot riktig data. Reviewer hittade två fel som Builder rättade (koppling i låst period, tydligare kopplingsruta).

## Agenternas egna förslag, Scout och ny by (2026-11-26) ✅

- ✅ Planners mall: plan per drop (antal, kostnad, försäljning, sålt efter 30/60 dagar) jämförs med utfallet på dropsidan
- ✅ Advisors månadsrapport: Ekonomi → Månadsmål, mot 14 000–17 000 kr och 37 % marginal, sex månaders trend, målet går att ändra
- ✅ Godkända förslag i byrådet blir uppgifter i Att göra
- ✅ Påminnelse 48 timmar efter ett klipp utan siffror (kort på Idag och notis från servern)
- ✅ Tester körs på GitHub vid varje push till main och varje PR
- ✅ Scout (ny agent i Hamnen): sökningar med maxpris, referensbilder, söklänkar och bedömning av fynd du lämnar. Söker inte automatiskt (Doorzo tillåter inte det).
- ✅ Marketer ser klippen: 6 bildrutor tas ur videon i webbläsaren och sparas i agent_media
- ✅ Agenterna kan ställa frågor med svarsknappar
- ✅ Agentbyn: större med fler gator, bageri, kyrka, torghandel och hamn; snö som faller och lägger sig i drivor 20 nov–julafton, jultema och tyst julmusik (går att stänga av); byrådet som telefon högt upp
