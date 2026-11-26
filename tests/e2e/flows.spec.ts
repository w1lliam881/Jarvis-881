import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const fixture = path.resolve('fixtures/v14-audit.json');

async function importV14(page: Page) {
  await page.goto('/');
  await page.getByLabel('Vad heter du?').fill('Testare');
  await page.getByRole('button', { name: 'Fortsätt' }).click();
  await page.setInputFiles('input[type=file]', fixture);
  await expect(page.getByText('Alla siffror stämmer mot v14')).toBeVisible();
  await page.getByRole('button', { name: 'Godkänn och importera' }).click();
  await expect(page.getByRole('heading', { name: 'Idag' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Ny registrering' }).click();
  await page.getByRole('button', { name: /Försäljning Ett plagg/ }).click();
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
  await page.getByRole('button', { name: 'Ny registrering' }).click();
  await page.getByRole('button', { name: /Drop Klistra in/ }).click();
  await page.getByLabel(/Plagg, ett per rad/).fill("3x Levi's 501 150\nBarbour jacka 224,90");
  await expect(page.getByText('4 plagg · 675 kr')).toBeVisible();
  await page.getByRole('button', { name: 'Skapa drop med 4 plagg' }).click();
  await expect(page.getByText(/Sparat · Ny drop/)).toBeVisible();
  await page.goto('/#/lager/drops');
  await expect(page.getByRole('link', { name: /Drop 10/ })).toBeVisible();
  await page.goto('/#/ekonomi/verifikat');
  await expect(page.getByText(/Inköp Drop 10 \(4 plagg\)/)).toBeVisible();
});

test('bokför en kostnad och se den i resultatet', async ({ page }) => {
  await importV14(page);
  await page.getByRole('button', { name: 'Ny registrering' }).click();
  await page.getByRole('button', { name: /Kostnad eller händelse/ }).click();
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

test('agentbyn utan jul: åtta hus och ett hus inifrån', async ({ page }) => {
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
  for (const n of ['Reminder', 'Advisor', 'Planner', 'Marketer', 'Noter', 'Reviewer', 'Builder', 'Scout']) await expect(page.getByText(n, { exact: true }).first()).toBeVisible();
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
  // Scouts hamn: sökning med söklänkar
  await page.goto('/#/byn/scout');
  await page.getByPlaceholder("t.ex. Levi's 501 vintage mörk tvätt").fill('Levis 501 vintage');
  await page.getByRole('button', { name: 'Spara', exact: true }).click();
  await expect(page.getByText('Levis 501 vintage').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mercari' })).toBeVisible();
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
