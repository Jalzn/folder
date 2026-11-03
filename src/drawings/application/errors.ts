import { AppError } from '#core/application';
import { MAX_PREVIEW_BYTES, MAX_PREVIEW_SIDE } from '../domain/canvas/preview.js';

export const drawingErrors = {
  invalidDrawingId: () => new AppError('VALIDATION', 'Identificador de desenho inválido.'),
  previewMustBePng: () => new AppError('VALIDATION', 'A prévia precisa ser uma imagem PNG.'),
  drawingMissing: () => new AppError('NOT_FOUND', 'O desenho não está disponível.'),
  futurePreview: () => new AppError('VALIDATION', 'A prévia é de uma versão que o desenho ainda não tem.'),
  folderMissing: () => new AppError('NOT_FOUND', 'A pasta não está disponível.'),
  folderProjectMismatch: () => new AppError('VALIDATION', 'A pasta não é deste projeto.'),
  projectMissing: () => new AppError('NOT_FOUND', 'O projeto não foi encontrado.'),
  projectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de adicionar conteúdo a ele.'),
  drawingUnreadable: () => new AppError('NOT_FOUND', 'Desenho não encontrado ou na lixeira.'),
  drawingPurgeMissing: () => new AppError('NOT_FOUND', 'O desenho não foi encontrado.'),
  itemNotTrashed: () => new AppError('DOMAIN_RULE', 'Mova o item para a lixeira antes de excluir de vez.'),
  previewTooLarge: () =>
    new AppError(
      'VALIDATION',
      `A prévia passa de ${MAX_PREVIEW_SIDE.toLocaleString('pt-BR')} px no lado maior ou de ${MAX_PREVIEW_BYTES / 1024} KiB.`,
    ),
};
