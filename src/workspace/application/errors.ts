import { AppError } from '@tinyfold/core/application';
import { MAX_PINNED } from '../domain/project.js';
export const workspaceErrors = {
  drawingMissing: () => new AppError('NOT_FOUND', 'O desenho não está disponível.'),
  documentMissing: () => new AppError('NOT_FOUND', 'O documento não está disponível.'),
  folderMissing: () => new AppError('NOT_FOUND', 'A pasta não está disponível.'),
  folderProjectMismatch: () => new AppError('VALIDATION', 'A pasta não é deste projeto.'),
  folderProjectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de mudar as pastas.'),
  folderNotTrashed: () => new AppError('DOMAIN_RULE', 'Esta pasta não foi excluída.'),
  moveVersionRequired: () => new AppError('VALIDATION', 'Informe a versão para mudar de projeto.'),
  moveProjectFirst: () => new AppError('VALIDATION', 'Mova para o projeto antes de escolher a pasta.'),
  projectMissing: () => new AppError('NOT_FOUND', 'O projeto não foi encontrado.'),
  projectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de adicionar conteúdo a ele.'),
  emptySearch: () =>
    new AppError('VALIDATION', 'A busca ficou vazia depois de ignorar acentos e pontuação. Use outras palavras.'),
  documentUnreadable: () => new AppError('NOT_FOUND', 'Documento não encontrado ou na lixeira.'),
  folderUnreadable: () => new AppError('NOT_FOUND', 'Pasta não encontrada.'),
  itemNotTrashed: () => new AppError('DOMAIN_RULE', 'Mova o item para a lixeira antes de excluir de vez.'),
  pinLimit: (scope: string) =>
    new AppError('DOMAIN_RULE', `Máximo de ${MAX_PINNED} fixados ${scope}. Desafixe um item antes.`),
};
