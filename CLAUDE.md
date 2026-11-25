# CLAUDE.md – regler för nästa session

Jarvis 2.0: lager, försäljning, bokföring och ett spel för 881 (second hand-denim från Japan). Användaren är ingen utvecklare: förklara på enkel svenska, fråga innan stora beslut, gissa aldrig om pengar, moms eller bokföring.

## Läs först

`SPEC.md` (godkänd), `DESIGN.md` (låst), `ARCHITECTURE.md`, `DATA_MODEL.md`, `PLAN.md` (status), `PROGRESS.md` (senaste läget och öppna frågor). Originalinstruktionen och v14 finns i `docs/`.

## Kommandon

```
npm install
npm run dev            # lokal utveckling, http://localhost:5173
npm test               # enhetstester (Vitest)
npm run e2e            # end-to-end (Playwright, bygger och startar preview på 4174)
npm run typecheck
npm run build          # produktion till dist/
npm run build:preview  # en enda HTML-fil i dist-preview/ (förhandsvisning)
npm run migrate:report -- fil.json   # skriver docs/MIGRERINGSRAPPORT.md
```

## Regler

- Pengar är heltal i ören. Använd `toOre`, `parseOre`, `kr`, `allocate` i `src/domain/money.ts`.
- All affärslogik i `src/domain` och `src/game`, ren och testad. UI i `src/ui` anropar `src/data/actions.ts`.
- Ändra aldrig data direkt: använd `store().save(label, build)` som räknar om automatiska verifikat och sparar atomiskt med versionskontroll.
- Automatiska verifikat: en nyckel per händelse (`DATA_MODEL.md`). Lägg till nya i `desiredForDrop`/`desiredForItem`, aldrig genom att skapa verifikat i UI.
- Appen sätter aldrig pris på enskilda plagg. Kategorinivå (maxpris, snitt) är ok.
- Inga betalda AI-anrop i appen. Driftkostnad ska vara 0 kr.
- Inga nycklar i koden. Supabase via `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY`.
- Fält minst 16 px. Inga emojis som ikoner. Följ tokens i `src/ui/styles.css`.
- Kör `npm test` och `npm run typecheck` innan commit. Lägg till test för varje ny beräkning.
- Bokföringen är ett stöd: påminn om att en redovisningskunnig bör granska den.

## Beslut

- Vite i stället för Next.js (ingen server behövs, statisk app).
- Lokal lagring (IndexedDB) tills Supabase finns. Samma `Backend`-gränssnitt.
- v14-plagg med `bk = 1` bokförs samlat per drop och månad. Nya försäljningar får alltid eget verifikat.
- Spelet: XP bara för det som görs efter att spelet startats. Bossar kräver tre olika dagar.

## Agenter

Fem agenter finns i `.claude/agents/` och startas med `/builder`, `/reviewer`, `/advisor`, `/reminder` och `/noter`, eller genom att be om dem med namn. Advisor, Reminder och Noter läser data från Supabase enligt `docs/agenter/DATA.md`, bara med `select`. Det fungerar bara i molnmiljön Jarvis-881. Alla sparar sitt arbete i tabellen `agent_runs`, som visas i Agentbyn (`#/byn`).
