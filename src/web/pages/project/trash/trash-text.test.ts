import { describe, expect, it } from 'vitest';
import { emptiedText, emptyTrashBody } from './trash-text';

describe('trash copy', () => {
  it('counts what emptying deletes', () => {
    expect(emptyTrashBody(7)).toBe('7 itens serão excluídos de vez. Não dá para desfazer.');
    expect(emptyTrashBody(1)).toBe('1 item será excluído de vez. Não dá para desfazer.');
  });

  it('says how many items emptying kept', () => {
    expect(emptiedText(0)).toBe('Lixeira vazia.');
    expect(emptiedText(1)).toBe('Lixeira vazia. 1 item mudou em outro lugar e foi mantido.');
    expect(emptiedText(2)).toBe('Lixeira vazia. 2 itens mudaram em outro lugar e foram mantidos.');
  });
});
