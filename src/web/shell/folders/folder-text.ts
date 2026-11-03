import { MAX_PINNED } from '#workspace/domain';
import { countOf, formatCount } from '../../lib/text/count';

/** "Pasta “MCP” excluída. 1 item foi para a raiz.", with the pins that did not fit, or "Estava vazia." */
export function deletedText(name: string, moved: number, unpinned: number) {
  const done = `Pasta “${name}” excluída.`;
  if (!moved) return `${done} Estava vazia.`;
  const went = `${formatCount(moved)} ${moved === 1 ? 'item foi' : 'itens foram'} para a raiz.`;
  const lost = unpinned
    ? ` ${formatCount(unpinned)} ${unpinned === 1 ? 'deixou' : 'deixaram'} de ficar fixado${unpinned === 1 ? '' : 's'}.`
    : '';
  return `${done} ${went}${lost}`;
}

/** "“MCP” e 1 item foram para a Lixeira." */
export const trashedText = (name: string, trashed: number) =>
  `“${name}” e ${countOf(trashed, 'item', 'itens')} foram para a Lixeira.`;

/** "Pasta “MCP” restaurada.", and "2 itens tinham mudado e ficaram onde estavam." */
export function restoredText(name: string, skipped: number) {
  const done = `Pasta “${name}” restaurada.`;
  if (!skipped) return done;
  return `${done} ${formatCount(skipped)} ${skipped === 1 ? 'item tinha mudado e ficou onde estava' : 'itens tinham mudado e ficaram onde estavam'}.`;
}

/** The title of "Excluir pasta e itens…": "Excluir “MCP” e 1 item?" */
export const deleteWithItemsTitle = (name: string, items: number) =>
  `Excluir “${name}” e ${countOf(items, 'item', 'itens')}?`;

/** "Pasta MCP na posição 2 de 4", for the live region after a reorder. */
export const positionText = (name: string, position: number, of: number) =>
  `Pasta ${name} na posição ${formatCount(position + 1)} de ${formatCount(of)}`;

/** "Já existe uma pasta MCP.", the same words as the server's. */
export const takenText = (name: string) => `Já existe uma pasta ${name}.`;

/** "Movido para MCP.", "Movido para a raiz do projeto.", or "…, sem fixar: a pasta já tem 8 fixados." */
export function movedText(folderName: string | null, lostPin: boolean) {
  const place = folderName === null ? 'a raiz do projeto' : folderName;
  if (!lostPin) return `Movido para ${place}.`;
  const full = `${folderName === null ? 'a raiz' : 'a pasta'} já tem ${MAX_PINNED} fixados`;
  return `Movido para ${place}, sem fixar: ${full}.`;
}

/** ⌥↑ on the first folder or ⌥↓ on the last: "“MCP” já é a primeira pasta." */
export const edgeText = (name: string, direction: 'up' | 'down') =>
  `“${name}” já é a ${direction === 'up' ? 'primeira' : 'última'} pasta.`;

/** The undo of a move to another project, when the folder the item came from was deleted meanwhile. */
export const backToRootText = (title: string, projectName: string) =>
  `“${title}” voltou para ${projectName}, na raiz: a pasta de onde saiu foi excluída.`;
