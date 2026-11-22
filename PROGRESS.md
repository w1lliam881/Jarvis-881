# PROGRESS

Senast uppdaterad: 2026-11-22.

## Läge

Jarvis 2.0 är byggd och fungerar lokalt (data sparas i webbläsaren). Alla faser utom publicering och automation via Gmail är klara. Se `PLAN.md`.

- 73 enhetstester och 7 end-to-end-tester går igenom.
- Import av v14-data stämmer på öret mot alla totaler (`docs/MIGRERINGSRAPPORT.md`).
- Förhandsvisning (privat): https://claude.ai/artifact/W5CDxLuWWsMAJBs5v4ebgg

## Beslut under bygget

- Vite i stället för Next.js: ingen server behövs.
- Hemkostnad inkluderar förpackning (10 kr) enligt specen, så ROI per drop blir något lägre än i v14.
- Försäljning av äldre v14-plagg bokförs samlat per drop och månad (i v14 på ett datum). Nya försäljningar får alltid eget verifikat.
- Bossar i spelet kräver att målet uppfylls tre olika dagar.
- Bokföringen kan låsas till ett datum (Inställningar) så att avstämda år inte ändras.

## Öppna frågor till dig

1. **Dubbletter i oktober:** V22 och V24 (Nudie average joe 800 kr och 900 kr, 24 oktober) är bokförda manuellt. Kontroll föreslår att V24 är en dubblett. Stämmer det? Ska V22 kopplas till ett plagg?
2. **Paket 2:s vikt:** plaggen i v14 väger tillsammans 16,95 kg, specen säger 16,45 kg. Vilket är rätt?
3. **average joe 19 november (800 kr)** var såld i v14 men saknade verifikat. Jarvis bokför den nu. Var den kanske samma försäljning som V22?

## Supabase (klart 2026-11-22)

- Projekt `vyvzsurwnjuiwdmdccir` i Stockholm (eu-north-1).
- Schemat från `supabase/migrations/0001_init.sql` är kört: tabeller, RLS, behörigheter, debet = kredit-trigger, atomisk sparning (`commit_mutations`, konflikt = PT409), `replace_all`, närvaro, push-prenumerationer, daglig backup kl 03 (pg_cron).
- Inloggning: e-postlänk, nya konton avstängda. Användare: william.wennstam@gmail.com (William). Kompisen läggs till senare (auth-användare + rad i `allowed_users`).
- Testat i riktig webbläsare: inloggning, import av audit-filen, omladdning. Datan i databasen är audit-filen tills en färsk v14-export importeras.
- Åtkomst från Claude: miljön "Jarvis-881" med Supabase access token (network secret för api.supabase.com).

## Nästa steg

1. Vercel: importera repot och sätt miljövariablerna (se README). Koden ligger på grenen `claude/vigilant-shannon-ay2mhz` tills den slås ihop med `main`.
2. Lägg till kompisen.
3. Färsk export från v14 → import och avstämning.
4. Påminnelser (notiser) och Gmail-import.
