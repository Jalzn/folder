import { describe, expect, it } from 'vitest';
import {
  emptiedText,
  emptyButtonLabel,
  emptyTrashBody,
  emptyTrashTitle,
  restoredText,
  shownOfTotal,
} from './trash-text';

describe('trash copy', () => {
  it('empties the whole trash only when the page shows all of it', () => {
    expect(emptyButtonLabel(7, false)).toBe('Esvaziar lixeira');
    expect(emptyTrashTitle(7, false, 'Site')).toBe('Esvaziar a lixeira de Site?');
    expect(emptyTrashBody(7, false)).toBe('7 itens serão excluídos de vez. Não dá para desfazer.');
    expect(emptyTrashBody(1, false)).toBe('1 item será excluído de vez. Não dá para desfazer.');
  });

  it('deletes the items shown when others stay, by a filter or a cut listing', () => {
    expect(emptyButtonLabel(1000, true)).toBe('Excluir os 1.000 mostrados');
    expect(emptyButtonLabel(1, true)).toBe('Excluir o mostrado');
    expect(emptyTrashTitle(1000, true, 'Site')).toBe('Excluir de vez os 1.000 itens mostrados?');
    expect(emptyTrashTitle(1, true, 'Site')).toBe('Excluir de vez o item mostrado?');
    expect(emptyTrashBody(1000, true)).toBe(
      'Os 1.000 itens mostrados serão excluídos de vez; os outros continuam na lixeira. Não dá para desfazer.',
    );
    expect(emptyTrashBody(1, true)).toBe(
      'O item mostrado será excluído de vez; os outros continuam na lixeira. Não dá para desfazer.',
    );
  });

  it('says the trash is empty only when nothing is left', () => {
    expect(emptiedText({ purged: 7, skipped: 0 }, true)).toBe('Lixeira vazia.');
    expect(emptiedText({ purged: 1000, skipped: 0 }, false)).toBe('1.000 excluídos de vez.');
    expect(emptiedText({ purged: 1, skipped: 0 }, false)).toBe('1 excluído de vez.');
  });

  it('counts the items that were no longer in the trash', () => {
    expect(emptiedText({ purged: 3, skipped: 1 }, false)).toBe('3 excluídos de vez. 1 não estava mais na lixeira.');
    expect(emptiedText({ purged: 0, skipped: 2 }, true)).toBe('Lixeira vazia. 2 não estavam mais na lixeira.');
  });

  it('says when a long trash shows only the most recent items', () => {
    expect(shownOfTotal(1000, 1200)).toBe('Mostrando os 1.000 mais recentes de 1.200.');
  });
});

describe('folders in the trash', () => {
  it('says where a restored item went, and when its folder is gone', () => {
    expect(restoredText('Notas', { name: 'MCP' }, false)).toBe('“Notas” restaurado em MCP.');
    expect(restoredText('Notas', null, false)).toBe('“Notas” restaurado.');
    expect(restoredText('Notas', { name: 'MCP' }, true)).toBe('A pasta “MCP” foi excluída; o item voltou para a raiz.');
    expect(restoredText('Notas', null, true)).toBe('“Notas” restaurado.');
  });
});
