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
