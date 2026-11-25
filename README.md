# Jarvis 2.0

Lager, försäljning och bokföring för 881 – med ett eget spel som belönar riktigt arbete.

## Vad är det här?

En webbapp som du kan lägga på hemskärmen på iPhone. Du registrerar händelser (köp, frakt, tull, försäljning, kostnader) så skapar Jarvis bokföringen åt dig, räknar vinst per plagg och håller koll på lagret.

Just nu sparas datan **på enheten** (i webbläsaren). När Supabase är uppsatt sparas den i en databas i EU och delas mellan dig och din kompis.

## Starta på datorn

1. Installera Node.js (version 20 eller senare) från nodejs.org.
2. Öppna mappen i Terminalen och skriv:
   ```
   npm install
   npm run dev
   ```
3. Öppna adressen som visas (http://localhost:5173).

## Publicera (gratis)

### Steg 1: Supabase (databas, inloggning, filer)

1. Gå till supabase.com och tryck **Start your project**. Logga in med GitHub.
2. Tryck **New project**. Namn: `jarvis-881`. Region: **Stockholm (eu-north-1)** eller **Frankfurt**. Välj ett databaslösenord och spara det i din lösenordshanterare.
3. När projektet är klart: **Project Settings → API**. Skicka mig **Project URL** och **anon public key** (den publika nyckeln, inte service_role).
4. Jag kör `supabase/migrations/0001_init.sql` och lägger till era två e-postadresser i `allowed_users`.

### Steg 2: Vercel (hosting)

1. Gå till vercel.com och logga in med GitHub.
2. **Add New → Project** och välj repot `Jarvis-881`.
3. Under **Environment Variables**: lägg till
   - `VITE_SUPABASE_URL` = `https://vyvzsurwnjuiwdmdccir.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = publishable-nyckeln (börjar med `sb_publishable_`)
4. Tryck **Deploy**. Adressen du får öppnar du i Safari på iPhone → Dela → **Lägg till på hemskärmen**.

Driftkostnad: 0 kr i månaden (se `ARCHITECTURE.md`).

### Påminnelser och Gmail-import (uppsatt)

- **Påminnelser och agentnotiser:** funktionen `daily-reminder` körs varje timme (pg_cron-jobbet `jarvis-reminders`) och skickar alltid en notis vid den tid du valt. Den skickar också direkt när en agent har jobbat, svarat i telefonen eller vill ha ditt ja. Uppsättning: `scripts/setup-notiser.sh` i molnmiljön Jarvis-881 (kör migration 0003, lägger nyckeln i Vault och deployar funktionen). Slå på i appen: öppna Jarvis från hemskärmen → Mer → Inställningar → Påminnelser, och tryck Skicka testnotis.
- **Gmail:** skriptet `scripts/gmail-till-jarvis.gs` körs i ditt Google-konto på script.google.com och skickar mejl från Vinted, Plick och Doorzo till funktionen `ingest-mail`. De hamnar i godkännandekön. Nyckeln (`INGEST_TOKEN`) finns bara i Supabase och i ditt skript, aldrig i koden.

### Inloggning

Första gången loggar du in med länken i mejlet. Välj sedan ett lösenord under **Mer → Inställningar → Lösenord**. Därefter loggar du in med e-post och lösenord, både på datorn och i appen på hemskärmen. Länken finns kvar om du glömmer lösenordet.

## Ändra i efterhand

Allt går att ändra efter publiceringen. Säg till vad du vill ha, så ändrar jag koden och publicerar igen. Vercel bygger om automatiskt, och appen på hemskärmen uppdateras nästa gång den öppnas. Din data påverkas inte av att appen uppdateras.

## Säkerhetskopior

- En kopia tas automatiskt varje dag (de senaste 30 sparas).
- **Mer → Säkerhetskopior**: ta en kopia nu, ladda ner som fil eller återställ.
- Innan en import eller återställning tas alltid en kopia av nuvarande läge.
- Spara gärna en nedladdad kopia i iCloud Drive någon gång i månaden.

## Återställa

**Mer → Säkerhetskopior → Återställ** vid den kopia du vill gå tillbaka till, eller **Återställ från fil** med en nedladdad kopia.

## Importera från Jarvis v14

I v14: Idag → Mer → Säkerhetskopior → **Ladda ner kopia**. I Jarvis 2.0: **Mer → Import och migrering** och välj filen. Du ser en avstämning mot v14 innan något sparas.

## Tester

```
npm test       # 68 enhetstester (beräkningar, bokföring, import, spelet)
npm run e2e    # 7 tester av hela flöden i webbläsaren
```

## Mer läsning

- `docs/ANVANDARGUIDE.md` – kort användarguide
- `docs/MIGRERINGSRAPPORT.md` – visar att v14-siffrorna stämmer
- `SPEC.md`, `DESIGN.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `PLAN.md`

Bokföringen i Jarvis är ett stöd för eget bruk. Låt någon redovisningskunnig granska den innan den används för deklaration.
