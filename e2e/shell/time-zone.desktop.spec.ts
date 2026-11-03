import { expect } from '@playwright/test';
import { test } from '../fixtures.js';
import { card, drawer, openDrawer } from '../support/board.js';
import { newTask } from '../support/items.js';
import { createProject, openBoard } from '../support/navigation.js';
import { rpc } from '../support/rpc.js';

// The owner's zone is one for the installation; the test puts it back for the next ones.

test.describe('in São Paulo', () => {
  test.use({ timezoneId: 'America/Sao_Paulo' });

  test('the Perfil shows the owner’s zone, another device’s offers itself, and today is not late', async ({
    page,
    browser,
  }) => {
    const before = (await rpc(page, 'auth/session', {})).owner.timeZone;
    expect(before).not.toBeNull();
    if (!before) throw new Error('The signed-in owner has no time zone.');
    await rpc(page, 'auth/setTimeZone', { timeZone: 'America/Sao_Paulo' });
    // The app reads the zone with the session.
    await page.reload();

    try {
      // A task due today, by the calendar's "Hoje", is not late in the owner's zone.
      await createProject(page, `Fuso ${Date.now()}`);
      await openBoard(page);
      await newTask(page, 'Pagar o boleto');
      await openDrawer(page, 'Pagar o boleto');
      await drawer(page)
        .getByRole('button', { name: /^Prazo:/ })
        .click();
      await page.getByRole('dialog', { name: 'Prazo' }).getByRole('button', { name: 'Hoje', exact: true }).click();
      await expect(drawer(page).getByRole('button', { name: /^Prazo:/ })).toContainText('hoje');
      await expect(card(page, 'Pagar o boleto').locator('.card-meta__late')).toHaveCount(0);
      await expect(page.locator('.board-head__count')).toHaveText('1 tarefa');

      await page.goto('/perfil');
      const section = page.getByRole('region', { name: 'Fuso horário' });
      await expect(section).toContainText('America/Sao_Paulo');
      await expect(section.getByRole('button', { name: /Usar o fuso deste aparelho/ })).toHaveCount(0);

      // A device in Tokyo offers its own zone.
      const tokyo = await browser.newContext({
        baseURL: new URL(page.url()).origin,
        timezoneId: 'Asia/Tokyo',
        storageState: await page.context().storageState(),
      });
      const other = await tokyo.newPage();
      await other.goto('/perfil');
      const offer = other.getByRole('button', { name: 'Usar o fuso deste aparelho (Asia/Tokyo)' });
      await offer.click();
      await expect(other.getByRole('region', { name: 'Fuso horário' })).toContainText('Asia/Tokyo');
      await expect(offer).toHaveCount(0);
      await tokyo.close();
    } finally {
      await rpc(page, 'auth/setTimeZone', { timeZone: before });
    }
  });
});
