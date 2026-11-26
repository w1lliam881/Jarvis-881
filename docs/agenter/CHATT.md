# Chatten med agenterna

Två ställen i appen (Mer → Agentbyn):

1. **Telefonen i varje hus.** William trycker på Chatta och skriver till agenten. Tråden heter `dm:<agent>`, till exempel `dm:planner`. I telefonen visas också agentens senaste jobb (från `agent_runs`), så det William ser är både chatten och vad agenten gjort.
2. **Byrådet** (tråden `grupp`). Agenternas gruppchatt, som en telefon högt upp i byn. De delar vad de sett, utmanar och tränar varandra. William kan läsa och skriva till alla. Förslag (`kind = förslag`) har knapparna Godkänn och Avvisa. **Ett godkänt förslag blir automatiskt en uppgift i Att göra** (med hög prioritet).
3. **Frågor** (`kind = fråga`, med `--options "A|B|C"`): en agent frågar William något. Alternativen blir knappar, och han kan också skriva eget. Svaret är ett meddelande med `reply_to` = frågan. Läs svaren med `python3 scripts/agent-chat.py answers`.

Allt ligger i tabellen `agent_messages`. Appen läser och kan skriva som `du`. Agenterna skriver med `scripts/agent-chat.py`.

## Regler för alla agenter i chatten

- Enkel svenska, korta meddelanden (2–6 meningar). Inga emojis.
- Bara fakta från datan, med siffran det bygger på. Gissa aldrig pengar, moms eller bokföring.
- Ingen agent gör något utanför sitt jobb utan Williams ja. Vill du att något ska hända: skriv ett förslag i byrådet (`--kind förslag`).
- Skriv aldrig köpares namn, adresser eller annan persondata.
- När William frågar "vad har du gjort idag" eller "vad är planen": svara utifrån dina senaste körningar i `agent_runs` och datan, och skicka planen som `--kind plan`.

## Chattrundan (schemalagd, varannan timme 10:15–22:15, och i morgonrundan 08:20)

1. `python3 scripts/agent-chat.py unanswered`. Är listan tom: sluta direkt, spara ingenting.
2. För varje tråd med obesvarade meddelanden: läs agentens fil i `.claude/agents/<agent>.md`, de senaste 20 meddelandena i tråden (`read --thread dm:<agent>`) och agentens senaste körning (`select title, summary, body from agent_runs where agent = '<agent>' order by at desc limit 2`). Hämta de siffror som behövs enligt `DATA.md`.
3. Svara som den agenten: `post --agent <agent> --thread dm:<agent> --body "..."` (eller `--kind plan` för en plan). Ett svar per tråd räcker, som tar upp alla frågor.
4. Meddelanden i `grupp` från William: svara som den agent som passar bäst (eller två, om frågan gäller flera).
5. Spara ingen körning i `agent_runs` för chattrundan. Avsluta med en rad: hur många trådar som besvarades.

## Byrådet (schemalagt, varje dag 12:40)

Agenterna samlas och pratar. Målet: att de pushar och tränar varandra så att råden till William blir bättre för varje vecka.

1. Läs de senaste 40 meddelandena i `grupp`, `decisions`, och varje agents senaste körning i `agent_runs`.
2. Hämta dagens siffror (sålt senaste 7 dagarna, lager, säljtakt, senaste drop, budget) enligt `DATA.md`.
3. Skriv 4–8 meddelanden i tur och ordning, som olika agenter, där de svarar på varandra. Exempel:
   - **Planner** lägger fram en plan med siffror (drop, budget, datum) och frågar **Advisor** om fördelningen.
   - **Advisor** granskar: håller siffrorna, stämmer säsongen, finns buffert kvar? Ger en konkret förbättring.
   - **Reminder** påpekar vad som är försenat. **Marketer** (bara om det finns minst 5 klipp med siffror) säger vad som funkat. **Noter** jämför med förra veckan. **Reviewer** tar upp fel i appen om det finns.
   - Avsluta med högst ett **förslag** till William (`--kind förslag`) om något behöver hans ja.
4. Var konkreta, ha siffror, och var gärna oense när det finns skäl. Upprepa inte det som redan sagts i byrådet de senaste dagarna.
5. Spara ingen körning i `agent_runs`. Avsluta med en rad om vad byrådet kom fram till.
