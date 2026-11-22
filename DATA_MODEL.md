# Jarvis 2.0 – Datamodell

Alla belopp lagras som **heltal i ören**. Datum som ISO (`YYYY-MM-DD`), tidpunkter som ISO med tidszon. "Idag" räknas i Europe/Stockholm. Fullständiga typer: `src/domain/types.ts`.

Alla poster har: `id`, `version` (ökar vid varje ändring), `createdAt`, `updatedAt`, `updatedBy`, `deletedAt` (mjuk radering).

## Drop

| Fält | Typ | Kommentar |
|---|---|---|
| name | text | |
| date | datum | inköpsdatum (verifikatets datum, fakturametoden) |
| shipping, customs | ören | frakt och tull+importmoms för hela dropen |
| shippingDate, customsDate | datum? | om frakt/tull bokförts ett annat datum |
| status | beställd, på väg, hemma | |
| note | text | |
| ok | 0, 1, 2 | ej kontrollerad, stämmer, fel |

## Plagg (Item)

| Fält | Typ | Kommentar |
|---|---|---|
| dropId | id | |
| name, brand, model, size | text | |
| category | Jeans, Jackor, Tröjor, T-shirts, Skjortor, Byxor, Skor, Övrigt | |
| cost | ören | inköpspris |
| weightKg | tal | används för att fördela frakten |
| salePrice | ören | 0 = osåld. Användaren sätter alltid priset själv |
| saleDate | datum? | |
| platform | Vinted, Plick, Egen hemsida, Annat | |
| comment | text | t.ex. annons-ID |
| ok | 0, 1, 2 | |
| saleBooking | individual, aggregate | aggregate = äldre v14-plagg som bokförs samlat per drop och månad |
| location | text | lagerplats |
| listedAt | datum? | senast publicerad/publicerad om |
| returnedAt | datum? | |

**Hemkostnad** = inköp + andel av frakt (efter vikt, lika om vikt saknas) + andel av tull (efter inköpsvärde) + förpackning (inställning, 10 kr).

## Verifikat (Voucher)

| Fält | Typ | Kommentar |
|---|---|---|
| nr | heltal | löpnummer |
| date, text | | |
| lines | [{account, debit, credit}] | debet = kredit tvingas av appen och av databasen |
| source | auto, event, manual, v14 | auto skapas och uppdateras från drops och plagg |
| key | text? | unik nyckel för automatiska verifikat |
| dropId, itemId | id? | koppling |
| eventType | sale, purchase, shipping, customs, material, ads, bankfee, platformfee, deposit, withdrawal | |
| ok | 0, 1, 2 | |

Automatiska nycklar:

- `drop:{id}:purchase`: inköp (4010 mot 1930). Om manuella verifikat redan är kopplade till dropen: bara skillnaden (justering), som i v14.
- `drop:{id}:shipping`: frakt (5710 mot 1930).
- `drop:{id}:customs`: tull och importmoms (5720 mot 1930).
- `drop:{id}:sales:{YYYY-MM}`: samlad försäljning av äldre plagg per månad.
- `item:{id}:sale`: försäljning av ett plagg (1930 mot 3001).

Kontoplan (BAS): 1930, 2010, 2013, 2018, 2610, 2640, 3001, 4010, 5460, 5710, 5720, 5990, 6570, 6590.

## Övrigt

| Samling | Innehåll |
|---|---|
| attachments | underlag: bild, PDF eller text, typ, belopp, datum, koppling till verifikat eller drop |
| tasks | uppgifter med datum, prioritet, klar |
| goals | mål: automatiska (sålt, resultat, antal denna månad) eller egna |
| candidates | kalkyler av Doorzo-plagg |
| videos | loggade klipp: typ, tid, längd, låt, visningar, likes, kommentarer, delningar, sparade, drops och plagg |
| ideas | status för videoidéer (sparad, använd, avfärdad) |
| searches | sparade Doorzo-sökningar |
| inbox | utkast i godkännandekön |
| settings | krav, förpackning, frakt/tull-standard, moms, tema, spel, videoförutsättningar |
| game | klara uppdrag, badge-baslinje, bossar, titel |
| changelog | vem, vad, när, före och efter |
| backups | dagliga och manuella kopior |

## Lagring i Supabase

En tabell `records(collection, id, data jsonb, version, …)` för alla samlingar, plus `changelog`, `backups` och `allowed_users`. Funktionen `commit_mutations` sparar flera ändringar i en transaktion med versionskontroll. En trigger stoppar verifikat där debet ≠ kredit. Se `supabase/migrations/0001_init.sql`.
