# Briefing: förslag på nästa steg för Jarvis

Skriven 25 november 2026, natten efter att Planner, Marketer, telefonerna, byrådet och vintertemat byggdes (PR #14).
**Inget av det här är byggt.** Det är en lista att välja från. Säg vilka du vill ha, så bygger jag dem.

Läget som förslagen bygger på (Reminders körning 25 nov): 14 osålda plagg, lagret räcker cirka 2,5 veckor, ingen drop på väg, försäljningen har gått från 8–9 plagg i veckan i början av november till 2–3 de senaste veckorna, 0 TikTok-klipp loggade, inga uppgifter eller mål inlagda, och 160 av 190 sålda plagg saknar ett verifikat kopplat till plagget (en del kan ligga i samlingsverifikat från v14). Juldroppen ska beställas senast 29 november och släppas 27 december på Shopify.

---

## Nya agenter

### 1. Lister: skriver annonserna åt dig
Tar plaggen som saknar `listedAt` och skriver färdiga annonstexter för Vinted, Plick och Shopify: rubrik, beskrivning, passform, mått, skick och sökord. Texterna hamnar i telefonen i hans hus, redo att kopiera.
- **För:** alla 14 osålda plagg saknar publiceringsdatum, och att skriva annonser är det som tar tid. Samma text kan återanvändas på Shopify till juldroppen. Ingen kostnad.
- **Nackdelar:** den ser inte bilderna, så skick och färg måste stå i Jarvis. Mått måste vara inlagda, annars blir texten tunn. Du måste fortfarande klistra in texten själv (Vinted har ingen öppen väg för att lägga upp annonser automatiskt).

### 2. Scout: letar fynd på Doorzo varje dag
Går igenom dina sparade sökningar och bevakningar varje morgon och föreslår plagg som ligger under maxpriset för kategorin, viktat efter säsongen. Förslagen kommer i byrådet med Godkänn/Avvisa, och godkända hamnar i Kalkyl.
- **För:** inköpen är där vinsten görs, och nu när budgeten ska växa för varje drop behövs fler bra kandidater. Följer reglerna för maxpris och säsong som redan finns.
- **Nackdelar:** Doorzo/Mercari kan blockera automatiska sökningar, och det kan strida mot deras villkor. Nätverksåtkomst måste läggas till i molnmiljön. Risk för många förslag som du ändå måste titta på.

### 3. Revisorn: håller bokföringen ren
Går igenom kopplingar mellan försäljning och verifikat, påminner om momsdeklaration och gör en månadsavstämning (stämmer bank, lager och resultat?).
- **För:** 160 sålda plagg utan kopplat verifikat är den största risken i datan just nu. En agent som tar det varje månad gör deklarationen enklare.
- **Nackdelar:** den får aldrig ändra bokföringen själv, så den kan bara peka. Ersätter inte en redovisningskunnig. Överlappar delvis med Kontroll-sidan som redan finns.

### 4. Kundtjänst: sammanfattar köparnas frågor
Läser mejlen från Vinted och Plick (som Gmail-importen redan hämtar) och sammanfattar frågor som väntar på svar, med förslag på svar.
- **För:** snabba svar säljer mer. Bygger på import som redan finns.
- **Nackdelar:** köpares meddelanden är persondata, och reglerna säger att de inte ska sparas. Måste byggas så att inget sparas, bara visas. Vinted-meddelanden kommer inte alltid som mejl.

## Nya sidor och funktioner

### 5. Juldroppen: en egen sida med nedräkning och checklista
En sida (eller ett kort på Idag) med dagar kvar till 29 november (beställ) och 27 december (släpp), och Planners tidsplan som checklista: välj plagg, kalkyl, beställ, leverans, fota, texter, Shopify, TikTok, släpp.
- **För:** det viktigaste datumet just nu syns hela tiden. Planner kan bocka av och flytta saker. Litet att bygga.
- **Nackdelar:** kortlivat, men kan återanvändas för varje drop ("Nästa drop"-sida).

### 6. TikTok-siffror automatiskt
Koppla TikTok med deras officiella API (Display API) så att visningar och likes hämtas själva i stället för att skrivas in.
- **För:** Marketer får bättre data utan att du skriver något. Inmatningen blir bara kryssen.
- **Nackdelar:** kräver att TikTok godkänner en utvecklarapp, vilket kan ta veckor och kräver en integritetspolicy. Behöver en liten serverfunktion för inloggningen. Undersökt i natt: en vanlig länk ger bara rubrik och bild, inga siffror.

### 7. Shopify i Jarvis
Plagg markerade för Shopify skickas dit med text, pris och bilder, och beställningar därifrån blir försäljningar i Jarvis med verifikat.
- **För:** en plats för allt när hemsidan finns. Ingen dubbel inmatning, bokföringen blir rätt automatiskt.
- **Nackdelar:** störst av förslagen. Shopify kostar en månadsavgift (det gör den ändå om du kör Shopify). Behöver en serverfunktion och en API-nyckel. Bör vänta tills hemsidan är uppe och du vet hur du vill jobba.

### 8. Snabblogg med en mening
Skriv "sålde 501:an för 600 på Vinted" och Jarvis föreslår rätt plagg, pris och plattform att godkänna.
- **För:** snabbare än formulär, särskilt på telefonen. Regler, ingen AI-kostnad.
- **Nackdelar:** en regeltolkare kan missförstå, därför måste det alltid godkännas. Behöver bra produkt-id eller namn för att hitta rätt plagg.

### 9. Lagerprognos på Idag
Ett litet diagram: hur många veckor lagret räcker, när nästa drop måste beställas, och vad juldroppen ändrar.
- **För:** du ser direkt när det är dags att köpa (just nu: cirka 2,5 veckor). Siffrorna finns redan i Planering.
- **Nackdelar:** säljtakten svänger mycket, så prognosen kan se säkrare ut än den är. Måste visa osäkerheten.

## Utseende

### 10. Säsong i hela appen, inte bara byn
Lätt vintertoning i det gröna bandet på Idag, snöflingor i bakgrunden på Spelet, och en annan färg på våren och sommaren. Samma av/på-knapp.
- **För:** appen känns levande och personlig. Byggt på samma tema som byn, så det är litet.
- **Nackdelar:** risk att det blir plottrigt i de sidor där siffrorna är viktiga. Bör vara diskret och gå att stänga av.

### 11. Riktigt väder i byn
Byn snöar när det snöar i Stockholm och regnar när det regnar, med SMHI:s öppna väderdata (gratis).
- **För:** roligt och levande. Ingen kostnad.
- **Nackdelar:** ett extra anrop till en tjänst utanför Jarvis. Om SMHI inte svarar faller den tillbaka på dagens "snö ibland".

### 12. Agenterna går upp i nivå
Agenterna får XP när ett förslag du godkänt visar sig fungera (till exempel att en drop sålde som Planner räknade med). Nivån syns på huset och figuren.
- **För:** du ser vilken agent som faktiskt ger bra råd, och det knyter ihop byn med Spelet.
- **Nackdelar:** svårt att mäta "fungerade" rättvist. Kan bli en gimmick om det inte bygger på riktiga utfall.

---

## Agenternas bedömning

Agenterna läste listan utifrån sina roller och regler (`.claude/agents/`). Varje agent fick säga vilka förslag de tror mest på, vad som oroar dem och om de har ett eget förslag. Riktiga siffror kommer från Reminders körning 25 november. De kommer att diskutera listan vidare i byrådet.

**Planner:** "Juldroppen-sidan (5) först. 29 november är om fyra dagar och utan en checklista med datum blir något sent. Sedan Lister (1), eftersom 14 plagg utan annons är 14 plagg som inte kan säljas. Shopify i Jarvis (7) vill jag vänta med till januari. *Eget förslag:* en 'drop-mall' som sparar hur varje drop planerades och hur den sålde, så att jag och Advisor kan jämföra plan mot utfall och bli bättre för varje drop."

**Advisor:** "Håller med Planner om 5 och 1. Revisorn (3) är viktigare än den låter: 160 försäljningar utan kopplat verifikat gör att jag inte kan lita helt på resultatet per månad, och då blir mina råd om budget osäkra. Scout (2) är lockande, men jag vill att vi först ser att säsongsviktningen fungerar på en riktig drop. *Eget förslag:* en månadsrapport som jämför 881 mot målet 14–17 000 kr och 37 % marginal, så att vi ser trenden och inte bara veckan."

**Reminder:** "Lagerprognosen (9) skulle göra mitt jobb tydligare: just nu säger jag '2,5 veckor' i text, men ett diagram syns bättre. Snabbloggen (8) gillar jag, för det jag oftast påminner om är saker som inte har registrerats. *Eget förslag:* en veckovy där uppgifter som agenterna föreslagit och du godkänt hamnar direkt i Att göra, så att de inte bara stannar i byrådet."

**Marketer:** "TikTok automatiskt (6) är det enda som verkligen löser mitt problem på sikt, men det tar tid att få godkänt, så kryssen räcker länge. Jag har 0 klipp att jobba med just nu. *Eget förslag:* en påminnelse 48 timmar efter att ett klipp loggats ('fyll i siffrorna'), så att datan blir komplett utan att du behöver komma ihåg det."

**Noter:** "Agenterna går upp i nivå (12) passar mig, eftersom jag redan skriver ner vad som händer varje vecka och kan räkna vad som stämde. Men jag håller med om att det måste bygga på riktiga utfall. *Eget förslag:* en månadsjournal som samlar fyra veckojournaler till en sida med de viktigaste siffrorna, bra att visa kompisen."

**Reviewer:** "Shopify (7) och TikTok-API (6) är de två som kräver nycklar och serverfunktioner. De måste byggas med samma regler som resten: inga nycklar i koden och allt bakom inloggning. Kundtjänst (4) oroar mig mest på grund av persondata. Utseende (10, 11) är låg risk. *Eget förslag:* ett automatiskt test som kör varje gång något slås ihop, så att jag inte bara granskar tre gånger i veckan."

**Builder:** "Billigast att bygga: 5, 9, 10 och 11 (någon timme var). Mellan: 1, 3, 8 och 12. Störst: 2, 6 och 7, eftersom de beror på tjänster utanför Jarvis. *Eget förslag:* en 'testa själv'-länk i varje PR (förhandsvisning på Vercel) så att du kan prova ändringar på telefonen innan du slår ihop."

## Min rekommendation på ordning

1. **Juldroppen-sidan (5)** före 29 november.
2. **Lister (1)** så att de 14 plaggen kommer ut.
3. **Revisorn (3)** innan årsskiftet, för deklarationens skull.
4. **Lagerprognos (9)** och **Marketers påminnelse om siffror** (Marketers eget förslag), små och nyttiga.
5. Utseende (10, 11) om du gillar vintertemat i byn.
6. Shopify (7), Scout (2) och TikTok-API (6) efter jul, när hemsidan är igång.
