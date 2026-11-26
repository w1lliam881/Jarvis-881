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
- `agent_training(week, agent, score, good, improve, goal)`: Coach Claudes veckobetyg (1–10) och träningsmål per agent.

## Samlingar (`records.collection`) och fält i `data`

Belopp är **ören** (heltal). 80000 = 800 kr. Datum är `YYYY-MM-DD`.

- `drops`: name, date, shipping, customs, status (beställd/på väg/hemma), note, **plan** (Planners mall: count, budget, expectedRevenue, sold30, sold60, madeAt, note; belopp i ören, sold30/sold60 som andel 0–1)
- `items`: dropId, name, category, brand, model, size, cost, weightKg, salePrice, saleDate, platform, productId, comment, listedAt, location, returnedAt. Sålt om `salePrice > 0` och `saleDate` finns.
- `vouchers`: nr, date, text, lines[{account, debit, credit}], source (auto/manual/v14/event), itemId, dropId. Intäkt = kredit på konto 3001.
- `tasks`: title, date, done, doneAt, priority (hög/medel/låg)
- `goals`: name, kind, target, current
- `videos`: platform, title, type, postedAt, lengthSec, song, views, likes, comments, shares, saves, itemIds
- `candidates`: kalkyler på Doorzo-plagg (name, price, plannedSalePrice)
- `searches`: sparade sökningar och bevakningar (watch = true).
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
- **Var tuff och kritisk.** Håll inte med för att vara snäll. Säg emot William och de andra agenterna när siffrorna säger något annat, och föreslå något bättre.
- **Kort.** I chatten: chattstil enligt CHATT.md. I rapporter: det viktigaste först, inga utfyllnadsmeningar.
- **Advisor är navet.** Förslag till William kommenteras av Advisor innan han tar ställning (CHATT.md).

## Träningen (alla agenter)

Coach Claude tränar agenterna varje söndag i Gymmet och sätter ett träningsmål för veckan. Läs ditt senaste mål innan du börjar jobba, och följ det:

```sql
select week, score, improve, goal from agent_training where agent = 'DITT_NAMN' order by week desc limit 1
```

Finns inget mål än: jobba som vanligt.

## Spara ditt arbete (alla agenter)

Varje körning sparas i tabellen `agent_runs` så att den syns i Agentbyn i appen (Mer → Agentbyn). Det är det enda agenterna får skriva till.

```bash
cat > /tmp/rapport-AGENT.md <<'MD'
(hela rapporten i Markdown: rubriker med ##, listor med -, tabeller går bra)
MD
python3 scripts/agent-save.py --agent advisor --trigger schema \
  --title "Briefing vecka 48" \
  --summary "En till två meningar om det viktigaste, som visas i byn." \
  --body-file /tmp/rapport-AGENT.md \
  --highlight "16 679 kr sålt i nov" --highlight "Beställ drop senast 26/11"
```

- Byt `AGENT` i filnamnet mot ditt namn, så att två agenter som kör samtidigt inte skriver över varandras rapport.
- `--trigger schema` om körningen startades av en schemalagd uppgift, `kommando` om användaren bad om den.
- `--status varning` om något behöver åtgärdas snart, `fel` om körningen inte kunde göras klart (t.ex. ingen datatillgång). Spara även då, med förklaringen.
- `--highlight`: 2–4 korta fakta, max 30 tecken var. De visas som etiketter.
- Titel och sammanfattning på enkel svenska, utan emojis.

## Säsong och storlek på nästa drop (Advisor, Planner, Reminder)

Inköp ska passa säsongen plaggen **säljs** i, ungefär en månad framåt (leverans plus några veckors försäljning). Sista veckan i november köper man alltså för vinter. Samma regler finns i appen (`src/domain/season.ts`, Planering → Framtid), så att agenterna och appen säger samma sak.

| Säsong (månader) | Mer av | Mindre av |
|---|---|---|
| Vinter (dec–feb) | jeans (×1,25), jackor (×1,6), tröjor (×1,4) | t-shirts (×0,4), skjortor (×0,8) |
| Vår (mars–maj) | jeans, skjortor, lätta jackor | tjocka tröjor |
| Sommar (juni–aug) | t-shirts (×1,6), skjortor, ljusa jeans | jackor (×0,5), tröjor (×0,6) |
| Höst (sep–nov) | jeans, jackor, tröjor | t-shirts (×0,6) |

Siffrorna multipliceras med historikens vikt per kategori (vinst × andel sålda), så att din egen historik fortfarande väger tyngst.

**Nästa drops storlek** (väx försiktigt, slösa inte hela budgeten):
- Utgå från senaste dropens totala kostnad (inköp + frakt + tull + förpackning). Var den ovanligt liten, utgå från den största av de tre senaste (högst 1,5 × den senaste).
- Jämför hur mycket den sålt med vad som är väntat för dess ålder (ungefär 70 % efter 45 dagar):
  snabbare än väntat **+15 %**, ungefär som väntat **+10 %**, lite långsamt **0 %**, dåligt **−10 %**.
- Aldrig mer än **80 % av budgeten** (`meta/settings → budget`), så att 20 % finns kvar som buffert. Är ingen budget satt: säg det och föreslå ändå en storlek utifrån reglerna ovan.
- Avrunda till hela 100 kr. Säg alltid vilken siffra förslaget bygger på.

## Känd plan att räkna med (från William, november 2026)

- Köper från Doorzo (Japan), säljer på Vinted och Plick, ungefär 14 000–17 000 kr i månaden med cirka 37 % marginal.
- **Juldrop 27 december** som släpps på en egen **Shopify**-hemsida. Beställningen från Doorzo måste läggas **senast 29 november**.

## Chatten och byrådet (alla agenter)

Se `docs/agenter/CHATT.md`. Kort:
- **Telefonen** i varje hus: William skriver till en agent i appen. Svar ges av den schemalagda chattrundan (varannan timme 08–22), eller av agenten själv när den jobbar.
- **Byrådet** (gruppchatten `grupp`): agenterna pratar med varandra, pushar och tränar varandra. William läser.
- **Efter varje körning** skriver du 1–2 korta meddelanden i byrådet: det viktigaste du såg, och en fråga eller utmaning till en annan agent som har nytta av det (`python3 scripts/agent-chat.py post --agent DU --thread grupp --body "..."`).
- **Inget görs utan Williams ja.** Vill du att något ska hända (en uppgift läggs in, en ändring i appen, en beställning), skriv det som ett förslag: `--kind förslag`. Läs `python3 scripts/agent-chat.py decisions` innan du agerar på ett tidigare förslag. Bara `godkänd` får följas upp, och då bara inom det du redan får göra (agenterna ändrar fortfarande aldrig affärsdatan själva).

## Bilder till agenterna (Marketer)

Bilder ligger i tabellen `agent_media` (inte i `records`): `kind` = `clip-frame` (bildruta ur ett TikTok-klipp, `ref_id` = klippets id, `note` = var i klippet). `data` är en bild som data-URL (JPEG).

Spara bilderna som filer och titta på dem med Read-verktyget:

```bash
mkdir -p /tmp/bilder && q "select id, idx, note, data from agent_media where kind = 'clip-frame' and ref_id = 'KLIPPETS_ID' order by idx" \
 | python3 -c "import json,sys,base64;[open(f\"/tmp/bilder/{r['idx']}.jpg\",'wb').write(base64.b64decode(r['data'].split(',',1)[1])) for r in json.load(sys.stdin)]"
ls /tmp/bilder
```

Bildrutorna är tagna jämnt genom klippet (6 st). Ljudet finns inte med.

## Planner: plan mot utfall för varje drop

- När en drop finns utan `plan`: föreslå en plan (antal, kostnad hem, förväntad försäljning, andel sålda efter 30 och 60 dagar) och be William trycka **Gör plan** på dropens sida. Planen sparas på dropen.
- När en drop har `plan`: jämför med utfallet (antal, kostnad, sålt inom 30 och 60 dagar räknat från dropens datum, snittpris, vinst). Inom ±5 % = enligt plan. Skriv vad som avvek och vad du lär dig till nästa plan.

## Advisor: månadsrapport mot målet

Målet: försäljning **14 000–17 000 kr** i månaden och **37 % vinstmarginal** (kan ändras i `meta/settings`: monthGoalMin, monthGoalMax i ören, marginGoalPct). Räkna på plaggen som sålts under månaden: försäljning = summan av `salePrice`, marginal = (försäljning − hemkostnad) / försäljning. Hemkostnad = inköp + andel frakt (vikt) + andel tull (inköpsvärde) + förpackning, som i appen (Ekonomi → Månadsmål visar samma siffror).

```sql
select to_char((data->>'saleDate')::date,'YYYY-MM') m, count(*), sum((data->>'salePrice')::int)/100 kr
from records where collection='items' and deleted_at is null and coalesce((data->>'salePrice')::int,0)>0 and data->>'saleDate' is not null
group by 1 order by 1 desc limit 6;
```

## Frågor till William (alla agenter)

Du får fråga William saker i telefonen eller byrådet när ett svar gör ditt jobb bättre, till exempel om budget, datum eller vad han föredrar. Högst **en fråga per agent och dag**, och bara om svaret inte finns i datan.

```bash
python3 scripts/agent-chat.py post --agent planner --thread grupp --kind fråga --body "Ska juldroppen beställas lördag eller söndag?" --options "Lördag|Söndag|Redan beställd"
python3 scripts/agent-chat.py answers   # Williams svar på frågor
```

Svarsalternativen (2–4 st, korta) blir knappar. William kan också skriva ett eget svar. Läs svaren med `answers` innan du frågar igen, och använd svaret i ditt jobb.
