import { describe, expect, it } from 'vitest';
import { deletedText, deleteWithItemsTitle, positionText, restoredText, takenText, trashedText } from './folder-text';

describe('folder copy', () => {
  it('says where a deleted folder’s items went', () => {
    expect(deletedText('MCP', 0, 0)).toBe('Pasta “MCP” excluída. Estava vazia.');
    expect(deletedText('MCP', 1, 0)).toBe('Pasta “MCP” excluída. 1 item foi para a raiz.');
    expect(deletedText('MCP', 3, 0)).toBe('Pasta “MCP” excluída. 3 itens foram para a raiz.');
    expect(deletedText('MCP', 3, 1)).toBe('Pasta “MCP” excluída. 3 itens foram para a raiz. 1 deixou de ficar fixado.');
    expect(deletedText('MCP', 1200, 2)).toBe(
      'Pasta “MCP” excluída. 1.200 itens foram para a raiz. 2 deixaram de ficar fixados.',
    );
  });

  it('counts the items that went to the trash with the folder', () => {
    expect(trashedText('MCP', 1)).toBe('“MCP” e 1 item foram para a Lixeira.');
    expect(trashedText('MCP', 4)).toBe('“MCP” e 4 itens foram para a Lixeira.');
    expect(deleteWithItemsTitle('MCP', 1)).toBe('Excluir “MCP” e 1 item?');
    expect(deleteWithItemsTitle('MCP', 2)).toBe('Excluir “MCP” e 2 itens?');
  });

  it('says what an undo could not bring back', () => {
    expect(restoredText('MCP', 0)).toBe('Pasta “MCP” restaurada.');
    expect(restoredText('MCP', 1)).toBe('Pasta “MCP” restaurada. 1 item tinha mudado e ficou onde estava.');
    expect(restoredText('MCP', 2)).toBe('Pasta “MCP” restaurada. 2 itens tinham mudado e ficaram onde estavam.');
  });

  it('announces a position and refuses a taken name with the server’s words', () => {
    expect(positionText('MCP', 1, 4)).toBe('Pasta MCP na posição 2 de 4');
    expect(takenText('MCP')).toBe('Já existe uma pasta MCP.');
  });
});
