import { expect, type Page, test } from '@playwright/test';
import { moveToTrash, newDocument, newDrawing, newTask } from './support/items.js';
import { createProject, openBoard, openTrash } from './support/navigation.js';
import { login } from './support/session.js';

/** A document whose text became a task, so its permanent deletion warns that the task stays. */
async function documentWithTask(page: Page, title: string, task: string) {
  await newDocument(page);
  await page.getByRole('textbox', { name: 'Título do documento' }).fill(title);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill('Trecho que vira tarefa.');
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await editor.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Criar tarefa da seleção', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Título da tarefa' }).fill(task);
  await page.getByRole('dialog').getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('the project trash groups, filters, restores, deletes for good and empties', async ({ page }, info) => {
  const suffix = `${info.project.name} ${Date.now()}`;
  const project = `Lixeira ${suffix}`;
  const document = `Documento ${suffix}`;
  const drawing = `Desenho ${suffix}`;
  const born = `Nasceu do documento ${suffix}`;
  const loose = `Tarefa solta ${suffix}`;
  await login(page);
  await createProject(page, project);

  await documentWithTask(page, document, born);
  await moveToTrash(page, 'documento');
  await newDrawing(page);
  await page.getByRole('textbox', { name: 'Título do desenho' }).fill(drawing);
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
  await moveToTrash(page, 'desenho');
  await newTask(page, loose);
  await page.getByRole('button', { name: loose, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir tarefa', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir tarefa', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await openTrash(page);
  // A fresh page, so the toasts of the setup, shown one at a time, do not hold the ones checked below.
  await page.reload();
  const today = page.getByRole('region', { name: 'Hoje' });
  await expect(today.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Tipo: Todos' }).click();
  await page.getByRole('menuitemradio', { name: 'Tarefas' }).click();
  await expect(today.getByRole('listitem')).toHaveCount(1);
  await expect(today.getByRole('listitem')).toContainText(loose);
  await page.getByRole('button', { name: 'Tipo: Tarefas' }).click();
  await page.getByRole('menuitemradio', { name: 'Todos' }).click();
  await page.screenshot({ path: info.outputPath('lixeira.png'), fullPage: true });

  // Restaurar puts the drawing back; the toast opens it.
  await page.getByRole('button', { name: `Restaurar ${drawing}`, exact: true }).click();
  await expect(page.getByText(`“${drawing}” restaurado.`)).toBeVisible();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Título do desenho' })).toHaveValue(drawing);

  // Excluir de vez warns that the task born in the document stays.
  await openTrash(page);
  await page.getByRole('button', { name: `Excluir de vez ${document}`, exact: true }).click();
  const purge = page.getByRole('alertdialog', { name: `Excluir de vez “${document}”?` });
  await expect(purge).toContainText('Tarefas que nasceram deste documento continuam, com o trecho guardado.');
  await expect(purge.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await purge.getByRole('button', { name: 'Excluir de vez', exact: true }).click();
  await expect(page.getByText('Excluído de vez.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lixeira', level: 1 })).toBeFocused();

  // Esvaziar lixeira deletes what is left: the loose task.
  await page.getByRole('button', { name: 'Esvaziar lixeira', exact: true }).click();
  const empty = page.getByRole('alertdialog', { name: `Esvaziar a lixeira de ${project}?` });
  await expect(empty).toContainText('1 item será excluído de vez. Não dá para desfazer.');
  await empty.getByRole('button', { name: 'Esvaziar lixeira', exact: true }).click();
  await expect(page.getByText('Lixeira vazia.')).toBeVisible();
  await expect(page.getByText('Nada na lixeira.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Esvaziar lixeira', exact: true })).toHaveCount(0);

  // The task keeps its excerpt after its document is gone.
  await openBoard(page);
  await page.getByRole('button', { name: born, exact: true }).click();
  await expect(page.getByRole('dialog').locator('blockquote')).toHaveText('Trecho que vira tarefa.');
  await expect(page.getByRole('dialog')).toContainText(`“${document}” foi excluído de vez.`);
});
