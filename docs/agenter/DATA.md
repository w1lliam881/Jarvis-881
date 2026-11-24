# Så läser agenterna Jarvis-datan

Gäller agenterna Advisor, Reminder och Noter (läser data) och alla fem (sparar sitt arbete). Agenterna **läser bara** affärsdatan. De ändrar aldrig data direkt i databasen, eftersom det skulle gå förbi versionskontrollen och de automatiska verifikaten. Ändringar görs i appen eller av Builder i koden.

## Åtkomst

Molnmiljön **Jarvis-881** har en nyckel till Supabase som läggs på automatiskt (den finns aldrig i koden). Kör frågor så här:

```bash
q(){ python3 -c "import json,sys;print(json.dumps({'query':sys.argv[1]}))" "$1" \
  | curl -s -X POST https://api.supabase.com/v1/projects/vyvzsurwnjuiwdmdccir/database/query \
    -H "Content-Type: application/json" --data @-; echo; }
q "select count(*) from records where deleted_at is null"
```

Kör **bara `select`**. Aldrig `insert`, `update`, `delete`, `drop`, `alter` eller funktioner som ändrar data. Om svaret är `401` eller nätverket nekas körs sessionen inte i miljön Jarvis-881. Säg då det till användaren och gissa inte siffror.

## Tabeller

- `records(collection, id, data jsonb, version, updated_at, updated_by, deleted_at)`: all data. Filtrera alltid på `deleted_at is null`.
- `changelog(id, at, by, collection, record_id, action, summary, before, after)`: varje ändring, vem och när. `by` är e-post eller namn.
- `presence(email, last_seen)`: när var och en senast var inne.
- `backups`: säkerhetskopior. Läs inte `data`-kolumnen, den är stor.

## Samlingar (`records.collection`) och fält i `data`

Belopp är **ören** (heltal). 80000 = 800 kr. Datum är `YYYY-MM-DD`.

- `drops`: name, date, shipping, customs, status (beställd/på väg/hemma), note
- `items`: dropId, name, category, brand, model, size, cost, weightKg, salePrice, saleDate, platform, productId, comment, listedAt, location, returnedAt. Sålt om `salePrice > 0` och `saleDate` finns.
- `vouchers`: nr, date, text, lines[{account, debit, credit}], source (auto/manual/v14/event), itemId, dropId. Intäkt = kredit på konto 3001.
- `tasks`: title, date, done, doneAt, priority (hög/medel/låg)
- `goals`: name, kind, target, current
- `videos`: platform, title, type, postedAt, lengthSec, song, views, likes, comments, shares, saves, itemIds
- `candidates`: kalkyler på Doorzo-plagg (name, price, plannedSalePrice)
- `searches`: sparade sökningar och bevakningar (watch = true)
- `inbox`: godkännandekön (status väntar/godkänd/avvisad)
- `meta`: id `settings` och id `game` (inställningar och spelläge)

## Bra frågor

```sql
-- Sålt per vecka (senaste 8)
select date_trunc('week', (data->>'saleDate')::date) v, count(*), sum((data->>'salePrice')::int)/100 kr
from records where collection='items' and deleted_at is null and (data->>'salePrice')::int > 0 and data->>'saleDate' is not null
group by 1 order by 1 desc limit 8;

-- Osålda plagg och ålder (dagar sedan dropens datum)
select i.data->>'name' namn, i.data->>'productId' id, current_date - (d.data->>'date')::date dagar
from records i join records d on d.collection='drops' and d.id = i.data->>'dropId'
where i.collection='items' and i.deleted_at is null and coalesce((i.data->>'salePrice')::int,0)=0 order by 3 desc;

-- Vad har gjorts senaste veckan
select at, by, collection, action, summary from changelog where at > now() - interval '7 days' order by at;
```

## Regler för alla agenter

- Svara på enkel svenska. Användaren är ingen utvecklare.
- Gissa aldrig om pengar, moms eller bokföring. Saknas data, säg det.
- Föreslå aldrig ett pris på ett enskilt plagg. Kategorinivå (snitt, maxpris) går bra.
- Bokföringen är ett stöd. Påminn om att en redovisningskunnig bör granska den när du ger råd om bokföring.
- Inga betalda API:er och inga nya kostnader.

## Spara ditt arbete (alla agenter)

Varje körning sparas i tabellen `agent_runs` så att den syns i Agentbyn i appen (Mer → Agentbyn). Det är det enda agenterna får skriva till.

```bash
cat > /tmp/rapport.md <<'MD'
(hela rapporten i Markdown: rubriker med ##, listor med -, tabeller går bra)
MD
python3 scripts/agent-save.py --agent advisor --trigger schema \
  --title "Briefing vecka 48" \
  --summary "En till två meningar om det viktigaste, som visas i byn." \
  --body-file /tmp/rapport.md \
  --highlight "16 679 kr sålt i nov" --highlight "Beställ drop senast 26/11"
```

- `--trigger schema` om körningen startades av en schemalagd uppgift, `kommando` om användaren bad om den.
- `--status varning` om något behöver åtgärdas snart, `fel` om körningen inte kunde göras klart (t.ex. ingen datatillgång). Spara även då, med förklaringen.
- `--highlight`: 2–4 korta fakta, max 30 tecken var. De visas som etiketter.
- Titel och sammanfattning på enkel svenska, utan emojis.
