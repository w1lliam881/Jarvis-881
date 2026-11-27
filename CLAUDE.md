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

## Snabbfakta (micro-skills: läs innan du letar)

- `npm test` tar ca 1 s. `npm run e2e -- --trace off` tar ca 25 s (iPhone 13-vy, preview på 4174 utan Supabase = lokalt läge).
- e2e återanvänder en server som redan kör på 4174. Kör `pkill -f "vite preview"` först, annars testas en gammal build.
- `npm run build` bygger med Supabase-nycklar (inloggningsskärm). För skärmbilder: `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite preview --port 4174 --outDir dist-e2e` efter `npm run e2e`.
- e2e-hjälpare: `importV14(page)` (namn → importera fixtures/v14-audit.json → rubrik /^Hej/), `openFab(page, 'Sålt något' | 'Nytt inköp')`.
- Supabase-SQL: curl mot Management API (`docs/agenter/DATA.md`), nyckeln läggs på av proxyn. Skriv aldrig ut nycklar.
- Doorzo, Mercari och andra externa sajter nås inte från containern (proxyn stoppar). Doorzo-länkar tolkas ur själva länken (`src/domain/doorzolink.ts`).
- Pixeltypsnittet (`font-pixel`) saknar Å. Använd det inte på text med å.
- `AgentSchedule.days`: 0 = söndag. Tider i svensk tid. Schemalagda rundor = scheduled tasks i Claude (se `src/domain/agents.ts`).
- Arbetsgren `claude/vigilant-shannon-ay2mhz`. William slår ihop PR:er; efter en ihopslagning görs en ny PR från samma gren.

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

Nio agenter finns i `.claude/agents/` och startas med `/builder`, `/reviewer`, `/advisor`, `/planner`, `/marketer`, `/reminder`, `/noter`, `/economizer` och `/coach`, eller genom att be om dem med namn. Advisor är navet: förslag kommenteras av Advisor först. Agenterna svarar i chattstil och ska vara kritiska. Coach Claude ger betyg varje söndag (tabellen `agent_training`, Gymmet i byn). Veckomöte fredagar 15:00, och Noter skriver "Rådets tips" till anslagstavlan. De som läser data gör det från Supabase enligt `docs/agenter/DATA.md`, bara med `select`. Det fungerar bara i molnmiljön Jarvis-881. Alla sparar sitt arbete i tabellen `agent_runs`, som visas i Agentbyn (`#/byn`). Chatten (telefonen i husen och byrådet) ligger i `agent_messages` och beskrivs i `docs/agenter/CHATT.md`. Agenterna skriver där med `scripts/agent-chat.py` och gör inget utan Williams ja (förslag med Godkänn/Avvisa; ett godkänt förslag blir en uppgift i Att göra). De kan ställa frågor med svarsknappar (`--kind fråga`). Bilder till agenterna (bildrutor ur klipp) ligger i `agent_media`. Scheman: se `src/domain/agents.ts` (samma tider som de schemalagda uppgifterna i Claude).
