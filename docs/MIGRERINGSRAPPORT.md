# Migreringsrapport: Jarvis v14 → Jarvis 2.0

Källa: `fixtures/v14-audit.json` · skapad 2026-11-22 08:14 UTC

**Resultat: alla siffror stämmer.**

## Antal och summor

| Kontroll | v14 | Jarvis 2.0 | Stämmer |
|---|---:|---:|:---:|
| Antal drops | 9 st | 9 st | Ja |
| Antal plagg | 204 st | 204 st | Ja |
| Antal sålda | 188 st | 188 st | Ja |
| Summa inköp | 76 827,11 kr | 76 827,11 kr | Ja |
| Summa försäljning | 135 747,05 kr | 135 747,05 kr | Ja |
| Summa frakt | 4 766,00 kr | 4 766,00 kr | Ja |
| Summa tull | 3 411,00 kr | 3 411,00 kr | Ja |
| Antal verifikat | 51 st | 51 st | Ja |

## Saldo per konto (bokföringens totaler)

| Konto | v14 | Jarvis 2.0 | Stämmer |
|---|---:|---:|:---:|
| 1930 | 51 432,63 kr | 51 432,63 kr | Ja |
| 3001 | −136 647,05 kr | −136 647,05 kr | Ja |
| 4010 | 85 003,42 kr | 85 003,42 kr | Ja |
| 5460 | 73,00 kr | 73,00 kr | Ja |
| 5990 | 138,00 kr | 138,00 kr | Ja |

## Ändringar när automatiska verifikat räknas om

Efter importen räknar Jarvis fram de automatiska verifikaten från plaggen (exakt ett per händelse). Det här skiljer sig från hur v14 senast sparade dem. Inget raderas förrän du har godkänt importen i appen.

- Nytt automatiskt verifikat: Försäljning Drop Aug/sep (samlad, äldre plagg) (2026-11-19)
- Nytt automatiskt verifikat: Försäljning: average joe (2026-11-19)
- Uppdateras: V36 Försäljning Drop Aug/sep (samlad) → Försäljning Drop Aug/sep (samlad, äldre plagg)

Förklaring:

- **Försäljning av äldre plagg bokförs per månad.** v14 lade all samlad försäljning för en drop på ett datum. Ett plagg i Drop Aug/sep (A.P.C. Denim Jacket, 400 kr) såldes 19 november men låg i septembers verifikat. Nu hamnar det i november. Totalen är densamma.
- **Sålda plagg som saknade verifikat får ett.** Ett plagg (average joe, 800 kr, 19 november) var markerat som sålt i v14 men hade inget verifikat. Intäkten i bokföringen ökar därför med 800 kr jämfört med v14:s sparade bokföring, och stämmer nu med plaggen.

## Saker att titta på efter importen

Hälsopoäng efter import: **79/100**.

- Möjliga dubbletter i bokföringen: 1 st (V24 Nudie jeans average joe. ID TS-GAR-2026-176 · 900 kr (samma datum och belopp som bootcut barry))
- Bokförda försäljningar utan plagg: 2 st (V22 Nudie Jeans average joe. ID -TS-GAR-2026-170  · 2026-10-24; V24 Nudie jeans average joe. ID TS-GAR-2026-176 · 2026-10-24)
- Sålda under kostnaden: 3 st (Momotaro plånka · såld 425 kr · kostnad 648 kr; Nudie plånka · såld 300 kr · kostnad 648 kr; RL DS hoodie grå/svart · såld 450 kr · kostnad 589 kr)
- Osålda i över 60 dagar: 2 st (Nudie Jeans Grim Tim w30 · 357 dagar · 342 kr; A.P.C. Green Military Jacket · 82 dagar · 445 kr)



## Att stämma av inför lansering

- Ta en färsk export från v14 (Idag → Mer → "Ladda ner kopia") och importera den under Mer → Import. Rapporten i appen visar samma tabeller.
- Paket 2 har vikten 16,95 kg i v14-datan, medan specen säger 16,45 kg. Kontrollera vikterna på plaggen i Paket 2.
- v14-filen innehåller 9 drops och 51 verifikat men inga uppgifter, mål eller kalkyler. De följer med från den färska exporten.
