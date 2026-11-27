# TokenEconomizer i Jarvis

TokenEconomizer är ett tillägg (plugin) till Claude Code från UC Berkeley och Microsoft Research (MIT-licens). Det gör sessioner billigare genom att lära sig av tidigare sessioner i samma repo. Det ligger färdigbyggt i `.claude/plugins/tokeneconomizer-marketplace/` och slås på av `.claude/settings.json`.

## Vad det gör

| Del | Vad den gör | På i Jarvis |
|---|---|---|
| **Micro-skills** | Lär sig korta fakta om repot (t.ex. hur testerna körs) från fel som upprepas och från en granskning var 3:e session. En fakta läggs in i början av varje session när tre sessioner bekräftat den. | Ja (`TE_MICROSKILLS=envfacts+distiller` i `.claude/settings.json`) |
| **Verktygsrensning** | Verktyg som aldrig används i repot lämnas utanför nästa sessioner (skrivs i `.claude/settings.local.json`, som inte checkas in). Ett kommando tar tillbaka dem. | Ja (standard) |
| **Loopvakt** | Märker när en tur fastnar i samma fel och ger en kort knuff att prova något annat. Stoppar aldrig något själv. | Ja (standard) |

Granskningen och loopvakten kör korta anrop på Haiku via samma Claude-inloggning (ingen egen nyckel, ingen extra kostnad utöver din plan). Tillägget skickar inget någon annanstans: koden har inga nätverksanrop. Det det lär sig sparas i `~/.tokeneconomizer`.

## Viktigt om molnsessioner

I molnet (Claude-appen) startar varje session i en ny container, och `~/.tokeneconomizer` töms när containern stängs. Då hinner tillägget inte samla tre sessioner. Fullt utbyte får du när du kör Claude Code på din egen dator i den här mappen.

Därför finns de viktigaste fakta också inskrivna för hand i `CLAUDE.md` under **Snabbfakta**. Den filen läses i varje session, även i molnet. Lägg till en rad där när något har tagit tid att lista ut.

## Kommandon (i Claude Code)

- `/tokeneconomizer:status`: läget och vad det sparat
- `/tokeneconomizer:microskills`: vilka fakta det lärt sig
- `/tokeneconomizer:untool`: ta tillbaka verktyg som rensats bort
- `/tokeneconomizer:config microskills off`: stäng av en del

Stänga av helt: ta bort raden `"tokeneconomizer@tokeneconomizer": true` i `.claude/settings.json`, eller sätt den till `false` i `.claude/settings.local.json`.

## Uppdatera

Bygg om från en ny version av källkoden: `python3 scripts/build_plugin.py --out <mapp>` i TokenEconomizer-repot, och ersätt `.claude/plugins/tokeneconomizer-marketplace/` med resultatet.
