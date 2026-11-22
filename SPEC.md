# Jarvis 2.0 – Specifikation

Status: **Godkänd 2026-11-21**
Datum: 2026-11-21

Jarvis 2.0 är ett eget affärssystem för 881: köp av second hand-/vintagekläder (främst denim) från Japan och vidareförsäljning. Det ersätter Jarvis v14 (Claude-artifact) med en riktig webbapp. All funktionalitet från v14 följer med eller blir bättre, och bokföringen blir mycket enklare att använda.

---

## 1. Företag och skatt

| Fråga | Beslut |
|---|---|
| Företagsform | Inte registrerat än |
| F-skatt | Nej (inte registrerat) |
| Moms | Inte momsregistrerad nu, planerar att bli. Momsstöd byggs in men är **avstängt** tills det slås på i inställningarna. |
| Tull och importmoms | Noteras idag för eget bruk. Förval: tull **och** importmoms bokas som kostnad på 5720 Tull och spedition. När moms slås på kan importmomsen istället bokas på 2640 Ingående moms. |
| Räkenskapsår | Kalenderår (jan–dec) |
| Bokföringsmetod | Fakturametod: händelsen bokförs på order-/fakturadatum |
| Kontoplan | BAS. Förvalda konton (som i v14): 1930 Företagskonto, 2010 Eget kapital, 2013 Egna uttag, 2018 Egen insättning, 2610 Utgående moms, 2640 Ingående moms, 3001 Försäljning varor, 4010 Inköp varor, 5460 Förbrukningsmaterial, 5710 Frakter, 5720 Tull och spedition, 5990 Annonsering, 6570 Bankkostnader. Fler konton kan läggas till. |

> Bokföringen i Jarvis är just nu "hobbybokföring" för eget bruk. Den byggs ändå med riktig struktur så att den är redo den dag företaget registreras. Jarvis är ett stöd. Låt någon redovisningskunnig granska bokföringen innan den används för deklaration. Jarvis ger inga skatteråd.

## 2. Bokföring

- **Riktig struktur, enkelt läge.** Under huven skapas riktiga verifikat med debet/kredit enligt BAS. Användaren ser och registrerar bara enkla **händelser**: inköp (drop), frakt, tull, försäljning, avgift, övrig kostnad, egen insättning/uttag.
- Varje händelse ger **exakt ett** verifikat, märkt som automatiskt, som uppdateras när händelsen ändras. Dubbletter (samma belopp + datum, eller samma plagg) upptäcks och flaggas.
- Debet = kredit tvingas av databasen.
- Det går fortfarande att skapa ett eget verifikat manuellt (avancerat läge).
- **Rapporter:** resultatrapport (månad/år), verifikationslista, huvudbok, momsrapport (visas först när moms slås på).
- **Export:** CSV, PDF, SIE (typ 4) och fullständig JSON-backup.

## 3. Underlag

- Sätt att lägga in: **fota/ladda upp bild** (mobil), **dra och släpp PDF** (dator), **klistra in mejltext** (Jarvis läser ut belopp, datum och avsändare och föreslår en händelse).
- Underlag kopplas till verifikat. Verifikat som saknar underlag flaggas i Kontroll (inte blockerande).

## 4. Användare och behörighet

- Två användare: ägaren och en kompis, **samma rättigheter** (läsa, skapa, redigera).
- Varje ändring loggas med vem, vad och när. Ångra och mjuk radering (papperskorg).
- Inloggning med **e-postlänk** (ingen lösenord). Bara godkända e-postadresser släpps in.

## 5. Enheter

- Mobile-first, optimerad för **iPhone**, fungerar fullt ut på dator.
- Installerbar på hemskärmen (PWA).
- **Läsa offline:** senaste datan syns utan nät. Nya registreringar kräver nät, så att inget kan skrivas över eller försvinna.
- Testas på Safari i iOS 18 (användarens iPhone har iOS 18.3.1).

## 6. Datakällor och automation

- **Gmail:** läser bara mejl från Vinted, Plick och Doorzo (läsbehörighet, kräver ditt samtycke). Mejlen blir **utkast i en godkännandekö** som godkänns med ett tryck. Inget bokförs utan godkännande.
- **Google Sheets:** ett nytt ark med uppdaterade siffror kopplas in senare. Det nuvarande arket "plick och vinted" har inaktuella siffror och används inte.
- Ingen bankfil eller Mercari-import i första versionen (kan läggas till senare).
- Allt automatiskt körs med gratisfunktioner (schemalagda jobb i databasen/hostingen). Inga betalda AI-anrop.

## 7. Struktur och funktioner

Sex huvudområden. På mobilen visas fem flikar i nedre menyn: **Idag, Lager, Sälj, Ekonomi, Mer**. Under Mer ligger **Planering** och **Spelet**. En snabbknapp **"+ Ny"** finns alltid: ny försäljning, ny kostnad, ny uppgift.

| Område | Innehåll (från v14, förenklat) |
|---|---|
| **Idag** | Läget nu (intäkter, resultat, osålda, lagervärde, kontrollpoäng), dagens uppgifter, fri textruta "Vad är aktuellt?" som blir uppgifter, kalender (dag/vecka/månad), mål med förloppsmätare, lagerålder. **Planeringsfrågorna (energi/tid/fokus) tas bort.** |
| **Lager** | Drops (år → månad → drop → plagg), snabbinläggning genom att klistra in rader ("11x Nudie jeans 132,19"), redigering, kontrollstatus (○ ✓ ⚠), avstämning. |
| **Sälj** | Registrera försäljning (under 15 sekunder), sålda plagg, koppla försäljning till plagg, konfetti vid försäljning. |
| **Ekonomi** | Bokföring (händelser, verifikat, huvudbok, rapporter, export), Analys (månad/år/drop, marginaler, kategori, ROI, break-even), Kontroll (hälsopoäng och fellista, CSV-export). |
| **Planering** | Kalkyl (Doorzo-plagg → frakt, tull, vinst, ROI, omdöme Köp/Tveksam/Avstå), Framtid/budget (maxpris per plagg per kategori, orderplan), Doorzo-sökningar (svenska → japanska med svensk betydelse bredvid), **Marknadsföring** (nytt), **Videoidéer** (förbättrat). |
| **Spelet** | Se avsnitt 9. |

### Nytt: Marknadsföring

- Logga varje TikTok-klipp: datum och tid för publicering, videotyp, längd, låt, visningar, likes, kommentarer, delningar, sparade, samt vilka drops/plagg som visades.
- Statistiken kan uppdateras efter några dagar.
- Analys: vilka videotyper, längder, låtar och tider som ger bäst resultat, och om visade plagg såldes efteråt.

### Förbättrat: Videoidéer

- Du anger först vilka typer av videor du brukar göra.
- Idéer genereras från en stor inbyggd idébank, anpassade efter din historik, aktuella drops och lager. Använda idéer upprepas inte.
- Du kan skriva en egen idé och få en **bedömning** (regelbaserad, utifrån vad som har fungerat för dig tidigare, aktuellt lager och drop).

### Inställningar (startvärden)

- Min ROI 50 %, min vinst 100 kr, förpackning 10 kr/plagg (som i v14).
- Frakt cirka 155–160 kr/kg och tull+importmoms cirka 25–26 % av (varuvärde + frakt). Konfigurerbart och lärt från historiken.

### Produktregel

Jarvis föreslår **aldrig** försäljningspris på enskilda plagg. Användaren bestämmer alla priser. Beräkningar på kategorinivå (maxpris vid inköp, snittpris, fördelning) är tillåtna.

## 8. Design

- **Grund: A "Lugn och sober"**, men med mer färg och karaktär. Fortfarande ren och lätt att använda.
- **Färger:**
  - **Skogsgrönt (#173F31)** som bärande färg: toppen på varje huvudvy är ett mörkgrönt fält med rundade nederkanter, där de viktigaste siffrorna står.
  - **Mintgrönt (#9EDBB8)** för grafer och positiva tecken på grön botten.
  - **Solgult (#E9B44C)** som andra accent: snabbknappen "+ Ny", markeringar och kategorifärg.
  - Ljus bakgrund med svag grön ton (#F2F4EF). Mörkt läge med grönsvart bakgrund (#0C1210).
  - Färgade etiketter för prioritet (Hög = tegelröd, Medel = gul, Låg = grön) och färgade ROI-märken (grön/röd).
- **Typsnitt:** Fraunces (serif) för sidrubriker och stora nyckeltal, Inter för text, IBM Plex Mono för siffror i tabeller.
- **Detaljer:** liten stapelgraf över försäljningen per dag i toppen, förloppsmätare för månadsmålet, färgad stapel som visar lagrets fördelning per kategori, "Sparat"-indikator med grön prick, aktiv flik i menyn markerad med en mjuk grön bakgrund.
- Ljust/mörkt läge följer telefonen och kan väljas manuellt. Bara svenska.
- Ingen AI-estetik: inga lila/blå gradienter, inga emojis som ikoner, enhetligt ikonset, bottensheets på mobil, minst 16 px text i fält.
- Designen låses i `DESIGN.md`. Skiss: `docs/design/jarvis-design-v2.png`.

## 9. Spelet

- Ett eget, **vanligt fantasy-äventyr** utan koppling till denim/881, för att ge en rolig och belönande del av jobbet.
- **Pixelart.** Ljud och musik finns men är **av** som standard.
- Verkligt arbete ger XP. Level-formel som i v14 (level = floor(sqrt(xp/50)) + 1) men kalibrerad så att en **värld tar 3–4 veckor** med normal aktivitet.
- Världar: Mosskogen, Sandhavet, Frostriket, Glödbergen, Molnöarna, Stjärnslottet. Varje värld har egen miljö, egna uppdrag, en boss (tre liv, ett slag per dag målet uppfylls) och en kosmetisk titel.
- **Uppdrag genereras av verklig data** och bockas av automatiskt när det går. Prioriterade typer:
  1. **Bokföring i fas** (saknad tull/frakt, inköpspris, underlag, månadsavstämning)
  2. **Marknadsföring/innehåll** (filma och posta, logga TikTok-statistik)
  3. **Smartare inköp** (kalkyl före order, hålla maxpris, budget för nästa drop)
- Dagens 3 viktigaste uppdrag samt veckans och månadens. Inga uppdrag som belönar onödiga köp eller tomma klick.
- Bossar kopplade till verkliga mål. Streaks, badges (brons–diamant) och hall of fame finns kvar. Belöningar är kosmetiska.
- Spelet sätter aldrig priser och kan stängas av helt.

## 10. Teknik och drift

- React + TypeScript + Tailwind, byggt med Vite, PWA. (Ändrat från Next.js: appen behöver ingen egen server, så Vite ger en enklare, snabbare och helt statisk app som kan ligga gratis på Vercel.)
- Supabase (Postgres, inloggning, fillagring, realtid), **lagrat i EU**. Gratisnivå.
- Vercel (gratis hobbynivå).
- Mål: **0 kr/månad** i drift. Exakt kostnad redovisas i `ARCHITECTURE.md`.
- Konton: GitHub finns. Supabase och Vercel skapas med steg-för-steg-guide när de behövs. Först byggs en **lokal version** som kan visas utan konton.
- Tester: Vitest (alla pengaberäkningar med verkliga testfall) och Playwright (kritiska flöden).
- Pengar lagras som heltal i ören, datum i ISO, tidszon Europe/Stockholm.

## 11. Integritet och säkerhet

- **Inga köparuppgifter** sparas (bara plattform och pris).
- Lagras i EU. Personuppgifter = bara de två användarnas e-postadresser.
- Inga nycklar i koden. Dagliga automatiska säkerhetskopior. Ingen data skrivs om eller raderas utan backup.

## 12. Datamigrering

- Utveckling och tester görs med `jarvis-data-audit.json` (9 drops, 204 plagg, 188 sålda, 51 verifikat).
- **Före lansering** tar du en färsk export från v14 (Idag → Mer → "Ladda ner kopia"). Den importeras och stäms av mot v14:s totaler: antal drops, plagg, sålda, summa inköp, summa försäljning och bokföringens totaler. Avvikelser visas innan något tas bort.

## 13. Hemsidan 881

Byggs inte här, och datamodellen förbereds inte för den nu.

## 14. Arbetsordning

1. Steg 0: frågor → denna SPEC → godkänd
2. Plan: `ARCHITECTURE.md`, `DATA_MODEL.md`, `PLAN.md` → godkännande
3. Fas 1 Grund → Fas 2 Kärna → Fas 3 Resten → Fas 3b Spelet → Fas 4 Automation → Fas 5 Skärpning. Godkännande efter varje fas.
