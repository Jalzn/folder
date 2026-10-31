import { describe, expect, it } from 'vitest';
import { emptiedText, emptyTrashBody, shownOfTotal } from './trash-text';

describe('trash copy', () => {
  it('counts what emptying deletes', () => {
    expect(emptyTrashBody(7, false)).toBe('7 itens serão excluídos de vez. Não dá para desfazer.');
    expect(emptyTrashBody(1, false)).toBe('1 item será excluído de vez. Não dá para desfazer.');
  });

  it('says that a filter keeps the other items', () => {
    expect(emptyTrashBody(2, true)).toBe(
      'Os 2 itens mostrados serão excluídos de vez; os outros continuam na lixeira. Não dá para desfazer.',
    );
    expect(emptyTrashBody(1, true)).toBe(
      'O item mostrado será excluído de vez; os outros continuam na lixeira. Não dá para desfazer.',
    );
  });

  it('says how many items emptying kept', () => {
    expect(emptiedText(0)).toBe('Lixeira vazia.');
    expect(emptiedText(1)).toBe('Lixeira vazia. 1 item mudou em outro lugar e foi mantido.');
    expect(emptiedText(2)).toBe('Lixeira vazia. 2 itens mudaram em outro lugar e foram mantidos.');
    expect(emptiedText(0, true)).toBe('Itens mostrados excluídos de vez.');
  });

  it('says when a long trash shows only the most recent items', () => {
    expect(shownOfTotal(1000, 1200)).toBe('Mostrando os 1.000 mais recentes de 1.200.');
  });
});
