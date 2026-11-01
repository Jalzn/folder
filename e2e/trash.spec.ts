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
  const kept = `Desenho que fica ${suffix}`;
  await login(page);
  await createProject(page, project);

  await documentWithTask(page, document, born);
  await moveToTrash(page, 'documento');
  for (const title of [drawing, kept]) {
    await newDrawing(page);
    await page.getByRole('textbox', { name: 'Título do desenho' }).fill(title);
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
    await moveToTrash(page, 'desenho');
  }
  await newTask(page, loose);
  await page.getByRole('button', { name: loose, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir tarefa', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir tarefa', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await openTrash(page);
  const today = page.getByRole('region', { name: 'Hoje' });
  await expect(today.getByRole('listitem')).toHaveCount(4);
  // Origem: the project, at the root and for a task (folders.spec.ts covers an item of a folder).
  await expect(today.getByTitle('Origem')).toHaveText([project, project, project, project]);
  await page.screenshot({ path: info.outputPath('lixeira.png'), fullPage: true });

  // With a filter on, emptying deletes only what the filter shows.
  await page.getByRole('button', { name: 'Tipo: Todos' }).click();
  await page.getByRole('menuitemradio', { name: 'Tarefas' }).click();
  await expect(today.getByRole('listitem')).toHaveCount(1);
  await expect(today.getByRole('listitem')).toContainText(loose);
  await page.getByRole('button', { name: 'Excluir o mostrado', exact: true }).click();
  const shown = page.getByRole('alertdialog', { name: 'Excluir de vez o item mostrado?' });
  await expect(shown).toContainText('O item mostrado será excluído de vez; os outros continuam na lixeira.');
  await shown.getByRole('button', { name: 'Excluir de vez', exact: true }).click();
  // Other items are left, so the trash is not empty.
  await expect(page.getByText('1 excluído de vez.')).toBeVisible();
  await page.getByRole('button', { name: 'Tipo: Tarefas' }).click();
  await page.getByRole('menuitemradio', { name: 'Todos' }).click();
  await expect(today.getByRole('listitem')).toHaveCount(3);

  // Restaurar puts the drawing back; the toast opens it.
  await page.getByRole('button', { name: `Restaurar ${drawing}`, exact: true }).click();
  await expect(page.getByText(`“${drawing}” restaurado.`)).toBeVisible();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Título do desenho' })).toHaveValue(drawing);

  // Excluir de vez warns that the task born in the document stays.
  await openTrash(page);
  await page.getByRole('button', { name: `Excluir de vez ${document}`, exact: true }).click();
  const purge = page.getByRole('alertdialog', { name: `Excluir de vez “${document}”?` });
  await expect(purge).toContainText(
    'Tarefas que nasceram deste documento continuam, com o título do documento e o trecho guardados.',
  );
  await expect(purge.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await purge.getByRole('button', { name: 'Excluir de vez', exact: true }).click();
  await expect(page.getByText('Excluído de vez.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lixeira', level: 1 })).toBeFocused();

  // Esvaziar lixeira deletes what is left: the other drawing.
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
