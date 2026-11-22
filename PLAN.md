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
- ⬜ Gmail-import (kräver Supabase och Google-samtycke)
- ⬜ Google Sheets-import (när det nya arket finns)
- ⬜ CSV-import av försäljning (parser finns, vy saknas)
- ⬜ Påminnelser (push kräver Supabase; uppgifter och uppdrag fungerar redan i appen)

## Fas 5 – Skärpning 🟡

- ✅ Tillgänglighet: etiketter, fokus, kontrast, reducerad rörelse
- ✅ Användarguide i appen och `docs/ANVANDARGUIDE.md`
- ⬜ Supabase uppsatt och testat på riktigt (kräver konto)
- ⬜ Publicerad på Vercel (kräver konto)
- ⬜ Färsk v14-export importerad och avstämd
- ⬜ Prestanda: dela upp koden (bundle ~600 kB, 180 kB gzip)

## Nästa steg (kräver dig)

1. Skapa Supabase-konto (guide i README). Jag kör databasschemat och kopplar appen.
2. Skapa Vercel-konto och koppla GitHub. Jag publicerar.
3. Ta en färsk export från v14 och importera.
