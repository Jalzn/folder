import { AppError } from '@tinyfold/core/application';
export const workspaceErrors = {
  folderMissing: () => new AppError('NOT_FOUND', 'A pasta não está disponível.'),
  folderProjectMismatch: () => new AppError('VALIDATION', 'A pasta não é deste projeto.'),
  folderProjectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de mudar as pastas.'),
  sameFolderReference: () => new AppError('VALIDATION', 'Escolha outra pasta como referência.'),
  staleFolderReference: () =>
    new AppError('VERSION_CONFLICT', 'A pasta de referência não está mais entre as do projeto.'),
  projectOrderArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de mudar a ordem.'),
  sameProjectReference: () => new AppError('VALIDATION', 'Escolha outro projeto como referência.'),
  staleProjectReference: () =>
    new AppError('VERSION_CONFLICT', 'O projeto de referência não está mais entre os ativos. Atualize a lista.'),
  projectMissing: () => new AppError('NOT_FOUND', 'O projeto não foi encontrado.'),
  projectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de adicionar conteúdo a ele.'),
};
