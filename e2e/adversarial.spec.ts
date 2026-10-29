import { type BrowserContext, type Cookie, expect, type Page, test } from '@playwright/test';

const password = 'tinyfold-e2e-passphrase';
let savedCookies: Cookie[] | undefined;

async function enter(page: Page, independent = false) {
  if (savedCookies && !independent) await page.context().addCookies(savedCookies);
  await page.goto('/');
  if (!savedCookies || independent) {
    await page.getByLabel('Sua senha').fill(password);
    await page.getByRole('button', { name: 'Entrar no Tinyfold' }).click();
    await expect(page.getByRole('button', { name: 'Começar a escrever' })).toBeVisible();
    if (!independent) savedCookies = await page.context().cookies();
  } else {
    await expect(page.getByRole('button', { name: 'Começar a escrever' })).toBeVisible();
  }
}

const editor = (page: Page) => page.getByTestId('document-content');

async function writeAndSave(page: Page, text: string) {
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes('/workspace/saveDocument') &&
      response.status() === 200 &&
      Boolean(response.request().postData()?.includes(text)),
  );
  await editor(page).fill(text);
  await saved;
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
}

async function createDocument(page: Page, title: string, text: string) {
  await page.getByRole('button', { name: 'Começar a escrever' }).click();
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  await writeAndSave(page, text);
  return page.url();
}

async function closeContext(context: BrowserContext, release: () => void) {
  release();
  await context.unrouteAll({ behavior: 'ignoreErrors' });
  await context.close();
}

test('two independent sessions keep both versions when a conflicting draft is saved as a copy', async ({
  page,
  browser,
}, info) => {
  await enter(page);
  const title = `Conflito ${info.project.name} ${Date.now()}`;
  const documentUrl = await createDocument(page, title, 'Ideia original compartilhada.');
  const otherContext = await browser.newContext({
    baseURL: 'http://localhost:5171',
    viewport: page.viewportSize() ?? { width: 1440, height: 1000 },
  });
  let release = () => {};
  try {
    const other = await otherContext.newPage();
    await enter(other, true);
    await other.goto(documentUrl);
    await expect(editor(other)).toContainText('Ideia original compartilhada.');
    let announce = () => {};
    const intercepted = new Promise<void>((resolve) => {
      announce = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await other.route('**/rpc/workspace/saveDocument', async (route) => {
      announce();
      await held;
      await route.continue();
    });
    await editor(other).fill('Rascunho do segundo dispositivo preservado.');
    await intercepted;
    await writeAndSave(page, 'Versao principal confirmada no primeiro dispositivo.');
    release();
    await expect(other.getByText('Este documento mudou em outro dispositivo.', { exact: true })).toBeVisible();
    await expect(editor(other)).toContainText('Rascunho do segundo dispositivo preservado.');
    await other.screenshot({ path: info.outputPath('conflito-preservado.png'), fullPage: true });
    await other.getByRole('button', { name: 'Salvar meu rascunho como cópia', exact: true }).click();
    await expect(other).not.toHaveURL(documentUrl);
    await expect(other.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(`${title} — cópia`);
    await expect(editor(other)).toContainText('Rascunho do segundo dispositivo preservado.');
    await other.reload();
    await expect(editor(other)).toContainText('Rascunho do segundo dispositivo preservado.');
    await page.reload();
    await expect(editor(page)).toContainText('Versao principal confirmada no primeiro dispositivo.');
    await expect(page.getByRole('textbox', { name: 'Título do documento' })).toHaveValue(title);
  } finally {
    await closeContext(otherContext, release);
  }
});

test('a task created from selected text survives document trash and restores its source link', async ({
  page,
}, info) => {
  await enter(page);
  const title = `Origem ${info.project.name} ${Date.now()}`;
  const taskTitle = `Proximo passo ${info.project.name} ${Date.now()}`;
  const documentUrl = await createDocument(page, title, 'Organizar as referencias do projeto.');
  await editor(page).click();
  await editor(page).press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Criar tarefa da seleção', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: 'Título da tarefa' })).toHaveValue(
    'Organizar as referencias do projeto.',
  );
  await dialog.getByRole('textbox', { name: 'Título da tarefa' }).fill(taskTitle);
  await dialog.getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: new RegExp(`${taskTitle}.*A fazer`) })).toBeVisible();
  await page.getByRole('button', { name: 'Opções do documento', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Mover para a lixeira', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira', exact: true }).click();
  await expect(page).toHaveURL(/\/documentos$/);
  await page.goto('/kanban');
  await page.getByRole('button', { name: taskTitle, exact: true }).click();
  await expect(
    page.getByRole('dialog').getByText('O documento está na lixeira. A tarefa continua aqui.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog').locator('blockquote')).toHaveText('Organizar as referencias do projeto.');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.goto('/lixeira');
  await page
    .locator('.document-row')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Restaurar', exact: true })
    .click();
  await expect(page.locator('.document-row').filter({ hasText: title })).toHaveCount(0);
  await page.goto('/kanban');
  await page.getByRole('button', { name: taskTitle, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${documentUrl}(?:\\?bloco=.+)?$`));
  await expect(editor(page)).toContainText('Organizar as referencias do projeto.');
  await page.screenshot({ path: info.outputPath('origem-restaurada.png'), fullPage: true });
});

test('retrying after a committed task response is lost creates only one task', async ({ page }, info) => {
  await enter(page);
  await page.goto('/kanban');
  const title = `Reenvio unico ${info.project.name} ${Date.now()}`;
  let loseFirstResponse = true;
  const requests: string[] = [];
  await page.route('**/rpc/workspace/createTask', async (route) => {
    requests.push(route.request().postData() ?? '');
    if (loseFirstResponse) {
      loseFirstResponse = false;
      const committed = await route.fetch();
      expect(committed.status()).toBe(200);
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await page.getByRole('textbox', { name: 'Título da tarefa' }).fill(title);
  await page.getByRole('dialog').getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(requests).toHaveLength(2);
  expect(requests[0]).toBe(requests[1]);
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('reenvio-sem-duplicacao.png'), fullPage: true });
});
