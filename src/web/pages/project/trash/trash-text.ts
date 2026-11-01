import { countOf, formatCount } from '../../../lib/count';

/*
 * What emptying deletes is what the page shows. All of the trash empties it; only part of it, under a filter
 * or when the listing stops at the most recent 1.000, deletes the items shown, and the others stay.
 */

/** The page's button: "Esvaziar lixeira", or "Excluir os 1.000 mostrados" when items stay. */
export function emptyButtonLabel(shown: number, partial: boolean) {
  if (!partial) return 'Esvaziar lixeira';
  return shown === 1 ? 'Excluir o mostrado' : `Excluir os ${formatCount(shown)} mostrados`;
}

/** The confirmation's title: "Esvaziar a lixeira de <projeto>?", or "Excluir de vez os 3 itens mostrados?". */
export function emptyTrashTitle(shown: number, partial: boolean, projectName: string) {
  if (!partial) return `Esvaziar a lixeira de ${projectName}?`;
  return shown === 1 ? 'Excluir de vez o item mostrado?' : `Excluir de vez os ${formatCount(shown)} itens mostrados?`;
}

/**
 * What emptying deletes: "7 itens serão excluídos de vez." When items stay, only the ones shown go: "Os 2
 * itens mostrados serão excluídos de vez; os outros continuam na lixeira."
 */
export function emptyTrashBody(shown: number, partial: boolean) {
  const end = 'Não dá para desfazer.';
  if (!partial) return `${countOf(shown, 'item será excluído', 'itens serão excluídos')} de vez. ${end}`;
  return shown === 1
    ? `O item mostrado será excluído de vez; os outros continuam na lixeira. ${end}`
    : `Os ${formatCount(shown)} itens mostrados serão excluídos de vez; os outros continuam na lixeira. ${end}`;
}

/**
 * After emptying: "Lixeira vazia." once nothing is left in it, otherwise "1.000 excluídos de vez.". Items that
 * changed or left the trash meanwhile were skipped: "2 não estavam mais na lixeira."
 */
export function emptiedText({ purged, skipped }: { purged: number; skipped: number }, nothingLeft: boolean) {
  const done = nothingLeft ? 'Lixeira vazia.' : `${countOf(purged, 'excluído de vez', 'excluídos de vez')}.`;
  if (!skipped) return done;
  return `${done} ${countOf(skipped, 'não estava mais na lixeira', 'não estavam mais na lixeira')}.`;
}

/** Above a long trash: "Mostrando os 1.000 mais recentes de 1.200." */
export const shownOfTotal = (shown: number, total: number) =>
  `Mostrando os ${formatCount(shown)} mais recentes de ${formatCount(total)}.`;

/** Where an item came from: "Tinyfold › MCP", even for a folder deleted since, or the project alone. */
export const originText = (projectName: string, folder: { name: string } | null) =>
  folder ? `${projectName} › ${folder.name}` : projectName;

/**
 * After a restore: "“X” restaurado em MCP." back in its folder, or "“X” restaurado." at the root. When its
 * folder was deleted meanwhile, it went to the root instead: "A pasta “MCP” foi excluída; o item voltou para
 * a raiz."
 */
export function restoredText(title: string, folder: { name: string } | null, folderGone: boolean) {
  if (folderGone && folder) return `A pasta “${folder.name}” foi excluída; o item voltou para a raiz.`;
  return folder && !folderGone ? `“${title}” restaurado em ${folder.name}.` : `“${title}” restaurado.`;
}
