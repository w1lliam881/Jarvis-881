import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const fixture = path.resolve('fixtures/v14-audit.json');

async function openFab(page: Page, item: string) {
  await page.getByRole('button', { name: /^Snabbval/ }).click();
  await page.getByRole('menuitem', { name: new RegExp(item) }).click();
}

async function importV14(page: Page) {
  await page.goto('/');
  await page.getByLabel('Vad heter du?').fill('Testare');
  await page.getByRole('button', { name: 'Fortsätt' }).click();
  await page.setInputFiles('input[type=file]', fixture);
  await expect(page.getByText('Alla siffror stämmer mot v14')).toBeVisible();
  await page.getByRole('button', { name: 'Godkänn och importera' }).click();
  await expect(page.getByRole('heading', { name: /^Hej/ })).toBeVisible();
  await expect(page.getByText(/Bokföringen avstämd efter import/)).toBeVisible();
}

test('import från v14 visar avstämning och rätt siffror', async ({ page }) => {
  await importV14(page);
  await page.goto('/#/lager/drops');
  await expect(page.getByText('Oktober: Paket 1')).toBeVisible();
  await page.goto('/#/ekonomi/rapporter');
  await expect(page.getByText('Resultaträkning 2026')).toBeVisible();
});

test('registrera en försäljning under 15 sekunder', async ({ page }) => {
  await importV14(page);
  const t0 = Date.now();
  await openFab(page, 'Sålt något');
  await page.getByPlaceholder(/Sök bland/).fill('Grim Tim');
  await page.getByRole('button', { name: /Grim Tim/ }).first().click();
  await page.getByPlaceholder('t.ex. 800').fill('950');
  await page.getByPlaceholder('t.ex. 800').blur();
  await page.getByRole('button', { name: /Spara försäljning/ }).click();
  await expect(page.getByText(/Sparat · Försäljning registrerad/)).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(15000);
  // Syns i bokföringen direkt
  await page.goto('/#/ekonomi/verifikat');
  await expect(page.getByText(/Försäljning: Nudie Jeans Grim Tim/).first()).toBeVisible();
});

test('ny drop genom att klistra in rader', async ({ page }) => {
  await importV14(page);
  await openFab(page, 'Nytt inköp');
  await page.getByLabel(/ett per rad/).fill("3x Levi's 501 150\nBarbour jacka 224,90");
  await expect(page.getByText('4 plagg · 675 kr')).toBeVisible();
  await page.getByRole('button', { name: 'Skapa drop med 4 plagg' }).click();
  await expect(page.getByText(/Sparat · Ny drop/)).toBeVisible();
  await page.goto('/#/lager/drops');
  await expect(page.getByRole('link', { name: /Drop 10/ })).toBeVisible();
  await page.goto('/#/ekonomi/verifikat');
  await expect(page.getByText(/Inköp Drop 10 \(4 plagg\)/)).toBeVisible();
});

test('nytt inköp från en Doorzo-länk fyller i plagget', async ({ page }) => {
  await importV14(page);
  await openFab(page, 'Nytt inköp');
  const link =
    "https://www.doorzo.com/en/mall/mercari/detail/68747470733a2f2f7777772e6d6572636172692e636f6d2f6a702f6974656d732f6d32373836343035383937342f?Price=3000&Asin=m27864058974&Title=Levi%27s+511+USA%E8%A3%BDW29+L32+WHITE+OAK%E8%A3%BD%E8%B5%A4%E8%80%B3&Image=https://static.mercdn.net/item/detail/orig/photos/m27864058974_1.jpg?1794015573&SellerId=&SellerName=";
  await page.getByLabel('Doorzo-länk', { exact: true }).fill(link);
  const card = page.getByLabel("Från Doorzo: Levi's 511 W29 L32");
  await expect(card).toBeVisible();
  await expect(card.getByText(/3.000 yen · Made in USA · White Oak/)).toBeVisible();
  await expect(card.getByLabel('Kategori')).toHaveValue('Jeans');
  await expect(card.getByLabel('Storlek')).toHaveValue('W29 L32');
  await expect(page.getByText('1 plagg · 214 kr')).toBeVisible();
  await page.getByRole('button', { name: 'Skapa drop med 1 plagg' }).click();
  await expect(page.getByText(/Sparat · Ny drop/)).toBeVisible();
  await page.goto('/#/lager');
  await page.getByText("Levi's 511 W29 L32").first().click();
  await expect(page.getByRole('link', { name: /Köpt här/ })).toHaveAttribute('href', /doorzo\.com/);
});

test('Doorzo-länk från startsidan, snabbknappen och klistra in var som helst', async ({ page }) => {
  await importV14(page);
  const link =
    "https://www.doorzo.com/en/mall/mercari/detail/68747470733a2f2f7777772e6d6572636172692e636f6d2f6a702f6974656d732f6d32373836343035383937342f?Price=3000&Asin=m27864058974&Title=Levi%27s+511+USA%E8%A3%BDW29+L32+WHITE+OAK%E8%A3%BD%E8%B5%A4%E8%80%B3";
  // 1. Rutan på Idag: klistra in länken, inköpet öppnas med plagget ifyllt
  await page.getByLabel('Klistra in Doorzo-länk', { exact: true }).fill(link);
  await expect(page.getByRole('heading', { name: 'Inköp från Doorzo' })).toBeVisible();
  await expect(page.getByLabel("Från Doorzo: Levi's 511 W29 L32")).toBeVisible();
  await page.getByRole('button', { name: 'Skapa drop med 1 plagg' }).click();
  await expect(page.getByText(/Sparat · Ny drop/)).toBeVisible();
  // 2. Snabbknappen: Doorzo-länk överst. Nästa plagg hamnar i samma (beställda) drop som standard
  await page.getByRole('button', { name: /^Snabbval/ }).click();
  await page.getByRole('menuitem', { name: /Doorzo-länk/ }).click();
  await expect(page.getByLabel('Doorzo-länk', { exact: true })).toBeFocused();
  await page.getByLabel('Doorzo-länk', { exact: true }).fill(link.replace('m27864058974', 'm11112222333').replace('Price=3000', 'Price=2800'));
  await expect(page.getByRole('radio', { name: /Drop 10/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: /Lägg 1 plagg i Drop 10/ }).click();
  await expect(page.getByText(/1 plagg tillagda i Drop 10/)).toBeVisible();
  // 3. Klistra in var som helst i appen (utanför ett fält)
  await page.goto('/#/lager');
  await page.evaluate((t) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }));
  }, link);
  await expect(page.getByRole('heading', { name: 'Inköp från Doorzo' })).toBeVisible();
  await expect(page.getByText('Något gick fel')).toHaveCount(0);
});

test('Lägg till på droppens sida öppnar samma Doorzo-ruta för den droppen', async ({ page }) => {
  await importV14(page);
  await page.goto('/#/lager/drops');
  await page.locator('a[href^="#/lager/drop/"]').first().click();
  await page.waitForURL(/lager\/drop\//);
  await expect(page.getByRole('button', { name: /^Lägg till plagg i / })).toBeVisible();
  const name = (await page.getByRole('heading', { level: 1 }).textContent())!.trim();
  await page.getByRole('button', { name: `Lägg till plagg i ${name}` }).click();
  await expect(page.getByRole('heading', { name: `Lägg till i ${name}` })).toBeVisible();
  await expect(page.getByLabel('Doorzo-länk', { exact: true })).toBeFocused();
  await page.getByLabel('Doorzo-länk', { exact: true }).fill('https://www.doorzo.com/item?Asin=m27864058974&Price=3000&Title=Nudie+Grim+Tim+W31');
  await page.getByRole('button', { name: `Lägg 1 plagg i ${name}` }).click();
  await expect(page.getByText(`1 plagg tillagda i ${name}`)).toBeVisible();
  await expect(page.getByText('Nudie Jeans Grim Tim W31').first()).toBeVisible();
});

test('delad länk till appen öppnar inköpet', async ({ page }) => {
  await importV14(page);
  await page.goto('/?text=' + encodeURIComponent('https://www.doorzo.com/item?Asin=m27864058974&Price=3000&Title=Nudie+Grim+Tim+W31') + '#/idag');
  await expect(page.getByRole('heading', { name: 'Inköp från Doorzo' })).toBeVisible();
  await expect(page.getByLabel(/Från Doorzo: Nudie Jeans Grim Tim W31/)).toBeVisible();
  expect(page.url()).not.toContain('text=');
});

test('bokför en kostnad och se den i resultatet', async ({ page }) => {
  await importV14(page);
  await page.keyboard.press('k');
  await page.getByRole('button', { name: 'Förpackning/material' }).click();
  const amount = page.locator('input[inputmode=decimal]').first();
  await amount.fill('89');
  await amount.blur();
  await page.getByRole('button', { name: 'Bokför' }).click();
  await expect(page.getByText(/Sparat · Bokfört/)).toBeVisible();
  await page.goto('/#/ekonomi/oversikt');
  await expect(page.getByText('89 kr').first()).toBeVisible();
});

test('kontroll hittar dubbletten och den kan tas bort', async ({ page }) => {
  await importV14(page);
  await page.goto('/#/ekonomi/kontroll');
  await expect(page.getByText('Möjliga dubbletter i bokföringen')).toBeVisible();
  await page.getByRole('button', { name: 'Ta bort dubblett' }).first().click();
  await page.getByRole('button', { name: 'Säker?' }).click();
  // Dubbletten är borta och spelet delar ut XP för det klara uppdraget
  await expect(page.getByText(/XP · Rensa/)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Möjliga dubbletter i bokföringen')).toBeHidden();
});

test('doorzo-sökning ger japanska termer med svensk betydelse', async ({ page }) => {
  await importV14(page);
  await page.goto('/#/planering/doorzo');
  await page.getByLabel('Vad letar du efter?').fill("Levi's 501 vintage W32");
  await page.getByRole('button', { name: 'Ta fram söktermer' }).click();
  await expect(page.getByText('リーバイス 501 ジーンズ').first()).toBeVisible();
  await expect(page.getByText(/Levi's \(katakana\)/).first()).toBeVisible();
});

test('spelet visar uppdrag från riktig data', async ({ page }) => {
  await importV14(page);
  await page.goto('/#/spelet');
  await expect(page.getByText('Dagens uppdrag')).toBeVisible();
  await expect(page.getByText(/dubbletter/).first()).toBeVisible();
});

test('startsidan hälsar, visar streak och snabbknappen har sajterna', async ({ page }) => {
  await importV14(page);
  await expect(page.getByRole('heading', { name: 'Hej Testare!' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Day streak: 1 dag i rad/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ny registrering' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Snabbval/ }).click();
  for (const s of ['Vinted', 'Plick', 'TikTok', 'Doorzo']) await expect(page.getByRole('menuitem', { name: `Öppna ${s}` })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Öppna TikTok' })).toHaveAttribute('href', 'https://www.tiktok.com/@w1lliam881');
  await expect(page.getByRole('menuitem', { name: 'Öppna Plick' })).toHaveAttribute('href', 'https://plick.se/profiler/w1lliam881');
  await expect(page.getByRole('menuitem', { name: 'Öppna Vinted' })).toHaveAttribute('href', 'https://www.vinted.se/member/197017030');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: 'Öppna Vinted' })).toHaveCount(0);
  // Spelet: dagens kista och ett sidouppdrag som läggs i Att göra
  await page.getByRole('link', { name: /Day streak/ }).click();
  await page.getByRole('button', { name: 'Öppna', exact: true }).click();
  await expect(page.getByText(/Öppnad: \+\d+ XP/)).toBeVisible();
  await page.getByRole('button', { name: /^Lägg ".+" i Att göra$/ }).first().click();
  await expect(page.getByText('Lagt i Att göra. Bocka av där när det är gjort.')).toBeVisible();
  await expect(page.getByText('Något gick fel')).toHaveCount(0);
});

test('morgonbriefingen från Advisor fälls upp en gång per dag', async ({ page }) => {
  await importV14(page);
  await page.evaluate(() =>
    localStorage.setItem(
      'jarvis-agent-chat',
      JSON.stringify([{ id: 'brief1', at: new Date().toISOString(), thread: 'dm:advisor', sender: 'advisor', author: null, body: 'Morgonbriefing: 2 sålda igår. Beställ juldroppen idag.', kind: 'plan', status: null, replyTo: null }]),
    ),
  );
  await page.reload();
  const phone = page.getByRole('dialog', { name: 'Telefonen: chatt med Advisor' });
  await expect(phone).toBeVisible();
  await expect(phone.getByText(/Beställ juldroppen idag/)).toBeVisible();
  await phone.getByRole('button', { name: 'Lägg ner telefonen' }).first().click();
  await expect(phone).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: /^Hej/ })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(phone).toHaveCount(0);
});

test('agentbyn utan jul: nio hus och ett hus inifrån', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-10T12:00:00+02:00'));
  await importV14(page);
  await page.evaluate(() =>
    sessionStorage.setItem(
      'jarvis-agent-runs',
      JSON.stringify([{ id: 'r1', agent: 'reminder', at: new Date().toISOString(), trigger: 'schema', status: 'varning', title: 'Att göra idag', summary: 'Beställ ny drop.', body: '## Idag\n\n- **Beställ** ny drop', highlights: ['Lager 2,5 veckor'] }]),
    ),
  );
  await page.goto('/#/byn');
  await expect(page.getByRole('heading', { name: 'Här bor dina agenter' })).toBeVisible();
  for (const n of ['Reminder', 'Advisor', 'Planner', 'Marketer', 'Noter', 'Reviewer', 'Builder', 'Economizer', 'Coach Claude']) await expect(page.getByText(n, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Julmusik/ })).toHaveCount(0);
  await expect(page.getByText('Att göra idag').first()).toBeVisible();
  await page.getByRole('link', { name: /Reminder/ }).first().click();
  await expect(page.getByRole('heading', { name: /Reminder/ })).toBeVisible();
  await expect(page.getByText('Beställ', { exact: true })).toBeVisible();
  await expect(page.getByText('/reminder', { exact: true })).toBeVisible();
  // Tillbaka till byn får inte krascha (useEffect som returnerade ett Promise)
  await page.getByText('Tillbaka till byn').click();
  await expect(page.getByRole('heading', { name: 'Här bor dina agenter' })).toBeVisible();
  await page.getByRole('link', { name: /Advisor/ }).first().click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Här bor dina agenter' })).toBeVisible();
  await expect(page.getByText('Scout', { exact: true })).toHaveCount(0);
  // Anslagstavlan på torget: veckans mål att bocka av
  await page.goto('/#/byn/tavlan');
  await expect(page.getByRole('heading', { name: 'Anslagstavlan' })).toBeVisible();
  await page.getByLabel('Nytt mål för veckan…').fill('Publicera 15 plagg');
  await page.getByRole('button', { name: 'Lägg till' }).first().click();
  await page.getByRole('checkbox', { name: 'Bocka av "Publicera 15 plagg"' }).click();
  await expect(page.getByRole('checkbox', { name: 'Bocka ur "Publicera 15 plagg"' })).toBeVisible();
  // Gymmet hos Coach Claude och Banken hos Economizer
  await page.goto('/#/byn/coach');
  await expect(page.getByRole('heading', { name: /Coach Claude/ })).toBeVisible();
  await page.goto('/#/byn/economizer');
  await expect(page.getByRole('heading', { name: /Economizer/ })).toBeVisible();
  await expect(page.getByText('Något gick fel')).toHaveCount(0);
});

test('jul i byn, byrådet i telefonen, frågor och godkända förslag blir uppgifter', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-10T12:00:00+01:00'));
  await importV14(page);
  await page.evaluate(() =>
    localStorage.setItem(
      'jarvis-agent-chat',
      JSON.stringify([
        { id: 'q1', at: '2026-12-10T10:00:00Z', thread: 'grupp', sender: 'reminder', author: null, body: 'Ska beställningen in som uppgift till lördag?', kind: 'fråga', status: null, replyTo: null, options: ['Ja, lördag', 'Nej'] },
        { id: 'p1', at: '2026-12-10T10:01:00Z', thread: 'grupp', sender: 'planner', author: null, body: 'Förslag: Beställ juldroppen på lördag. Det ger en dags marginal.', kind: 'förslag', status: 'väntar', replyTo: null },
      ]),
    ),
  );
  await page.goto('/#/byn');
  await expect(page.getByRole('heading', { name: 'God jul från agentbyn' })).toBeVisible();
  await expect(page.getByRole('img', { name: /medan snön faller/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Julmusik/ })).toBeVisible();
  // Byrådet ligger högt upp: på telefonen en knapp som fäller upp byrådets telefon
  await page.getByRole('button', { name: /Öppna byrådet, 2 väntar på dig/ }).click();
  const council = page.getByRole('dialog', { name: 'Byrådet, agenternas gruppchatt' });
  await expect(council).toBeVisible();
  await council.getByRole('button', { name: 'Ja, lördag' }).click();
  await expect(council.getByText('Du svarade:')).toBeVisible();
  await council.getByRole('button', { name: 'Godkänn' }).click();
  await expect(page.getByText('Godkänt och tillagt i Att göra')).toBeVisible();
  await council.getByLabel('Skriv till alla agenter…').fill('Hej allihop');
  await council.getByRole('button', { name: 'Skicka' }).click();
  await expect(council.getByText('Hej allihop')).toBeVisible();
  await council.getByRole('button', { name: 'Lägg ner telefonen' }).first().click();
  // Uppgiften finns på Idag
  await page.goto('/#/idag');
  await expect(page.getByText('Beställ juldroppen på lördag. (Planner)').first()).toBeVisible();
  // Telefonen i Planners hus
  await page.goto('/#/byn/planner');
  await page.getByRole('button', { name: /Öppna telefonen/ }).click();
  const phone = page.getByRole('dialog', { name: /chatt med Planner/ });
  await expect(phone).toBeVisible();
  await phone.getByLabel('Skriv till Planner…').fill('Vad är planen för juldroppen?');
  await phone.getByRole('button', { name: 'Skicka' }).click();
  await expect(phone.getByText('Vad är planen för juldroppen?')).toBeVisible();
  await phone.getByRole('button', { name: 'Lägg ner telefonen' }).first().click();
  await expect(phone).toHaveCount(0);
  // Marketer: kryss och siffror
  await page.goto('/#/byn/marketer');
  await page.getByRole('button', { name: 'Logga klipp' }).click();
  await page.getByRole('button', { name: 'På kropp / try-on' }).click();
  await page.getByLabel('Visningar').fill('1200');
  await page.getByRole('button', { name: 'Spara klippet' }).click();
  await expect(page.getByText('1 200 visn.')).toBeVisible();
  await expect(page.getByText('Något gick fel')).toHaveCount(0);
});

test('dropmallen och månadsmålet', async ({ page }) => {
  await importV14(page);
  await page.goto('/#/lager/drops');
  await page.locator('a[href^="#/lager/drop/"]').first().click();
  await page.getByRole('button', { name: 'Gör plan' }).click();
  await page.getByRole('button', { name: 'Spara plan' }).click();
  await expect(page.getByText('Plan mot utfall')).toBeVisible();
  await expect(page.getByText('Antal plagg')).toBeVisible();
  await page.goto('/#/ekonomi/manad');
  await expect(page.getByText(/Försäljning mot målet/)).toBeVisible();
  await expect(page.getByText('Sex månader')).toBeVisible();
});

test('vem är inne visas ovanpå allt på telefonen', async ({ page }) => {
  await importV14(page);
  await page.getByRole('button', { name: /Tryck för mer/ }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Vem är inne' });
  await expect(sheet).toBeVisible();
  // Arket ligger direkt i body och täcker menyn i botten
  expect(await sheet.evaluate((el) => el.parentElement === document.body)).toBe(true);
  const nav = page.getByRole('navigation', { name: 'Huvudmeny' });
  const box = await nav.boundingBox();
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[role=dialog]') != null, [box!.x + box!.width / 2, box!.y + box!.height / 2]);
  expect(hit).toBe(true);
});

test('introduktionen visas första gången och sedan inte igen', async ({ page }) => {
  await importV14(page);
  await page.evaluate(() => sessionStorage.setItem('jarvis-intro-test', 'Axel'));
  await page.reload();
  const dlg = page.getByRole('dialog', { name: 'Introduktion till Jarvis' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText('Hej Axel, välkommen till Jarvis')).toBeVisible();
  for (let i = 0; i < 5; i++) await dlg.getByRole('button', { name: 'Nästa' }).click();
  await expect(dlg.getByRole('heading', { name: 'Välj ett lösenord' })).toBeVisible();
  await dlg.getByRole('button', { name: 'Välj lösenord nu' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Inställningar' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Inställningar' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Introduktion till Jarvis' })).toHaveCount(0);
});
