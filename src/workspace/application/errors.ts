import { AppError } from '@tinyfold/core/application';
import { MAX_PREVIEW_BYTES, MAX_PREVIEW_SIDE } from '../domain/canvas-preview.js';
import { MAX_PINNED } from '../domain/project.js';
import { TASK_LIMITS } from '../domain/tasks.js';

/** The application owns these codes and messages; schemas keep their marked validation messages. */
export const workspaceErrors = {
  invalidDrawingId: () => new AppError('VALIDATION', 'Identificador de desenho inválido.'),
  previewMustBePng: () => new AppError('VALIDATION', 'A prévia precisa ser uma imagem PNG.'),
  drawingMissing: () => new AppError('NOT_FOUND', 'O desenho não está disponível.'),
  futurePreview: () => new AppError('VALIDATION', 'A prévia é de uma versão que o desenho ainda não tem.'),
  columnMissing: () => new AppError('NOT_FOUND', 'A coluna não está disponível.'),
  futureCompletion: () => new AppError('VALIDATION', 'A data de conclusão não pode estar no futuro.'),
  cannotDeleteDoneColumn: () => new AppError('DOMAIN_RULE', 'Marque outra coluna como conclusão antes.'),
  cannotDeleteLastOpenColumn: () =>
    new AppError('DOMAIN_RULE', 'O quadro precisa de pelo menos uma coluna além da de conclusão.'),
  sameColumnDestination: () => new AppError('VALIDATION', 'Escolha outra coluna como destino.'),
  columnDestinationMissing: () => new AppError('VALIDATION', 'A coluna de destino não está disponível.'),
  columnDestinationRequired: () => new AppError('VALIDATION', 'Escolha para qual coluna vão as tarefas.'),
  sameColumnReference: () => new AppError('VALIDATION', 'Escolha outra coluna como referência.'),
  staleColumnReference: () =>
    new AppError('VERSION_CONFLICT', 'A coluna de referência não está mais entre as do quadro.'),
  columnNotTrashed: () => new AppError('DOMAIN_RULE', 'Esta coluna não foi excluída.'),
  columnAlreadyDone: () => new AppError('DOMAIN_RULE', 'Esta coluna já é a de conclusão.'),
  doneColumnMissing: () => new AppError('DOMAIN_RULE', 'O quadro não tem coluna de conclusão.'),
  documentMissing: () => new AppError('NOT_FOUND', 'O documento não está disponível.'),
  folderMissing: () => new AppError('NOT_FOUND', 'A pasta não está disponível.'),
  folderProjectMismatch: () => new AppError('VALIDATION', 'A pasta não é deste projeto.'),
  folderProjectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de mudar as pastas.'),
  sameFolderReference: () => new AppError('VALIDATION', 'Escolha outra pasta como referência.'),
  staleFolderReference: () =>
    new AppError('VERSION_CONFLICT', 'A pasta de referência não está mais entre as do projeto.'),
  folderNotTrashed: () => new AppError('DOMAIN_RULE', 'Esta pasta não foi excluída.'),
  labelMissing: () => new AppError('NOT_FOUND', 'A etiqueta não está disponível.'),
  labelNotTrashed: () => new AppError('DOMAIN_RULE', 'Esta etiqueta não foi excluída.'),
  moveVersionRequired: () => new AppError('VALIDATION', 'Informe a versão para mudar de projeto.'),
  moveProjectFirst: () => new AppError('VALIDATION', 'Mova para o projeto antes de escolher a pasta.'),
  projectOrderArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de mudar a ordem.'),
  sameProjectReference: () => new AppError('VALIDATION', 'Escolha outro projeto como referência.'),
  staleProjectReference: () =>
    new AppError('VERSION_CONFLICT', 'O projeto de referência não está mais entre os ativos. Atualize a lista.'),
  projectMissing: () => new AppError('NOT_FOUND', 'O projeto não foi encontrado.'),
  projectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de adicionar conteúdo a ele.'),
  boardPageChanged: () =>
    new AppError('VERSION_CONFLICT', 'O quadro mudou desde a primeira página. Liste de novo sem cursor.'),
  emptySearch: () =>
    new AppError('VALIDATION', 'A busca ficou vazia depois de ignorar acentos e pontuação. Use outras palavras.'),
  documentUnreadable: () => new AppError('NOT_FOUND', 'Documento não encontrado ou na lixeira.'),
  drawingUnreadable: () => new AppError('NOT_FOUND', 'Desenho não encontrado ou na lixeira.'),
  taskUnreadable: () => new AppError('NOT_FOUND', 'Tarefa não encontrada ou na lixeira.'),
  folderUnreadable: () => new AppError('NOT_FOUND', 'Pasta não encontrada.'),
  taskProjectRequired: () => new AppError('VALIDATION', 'Escolha o projeto da tarefa.'),
  taskMissing: () => new AppError('NOT_FOUND', 'A tarefa não foi encontrada.'),
  boardConflict: () =>
    new AppError('VERSION_CONFLICT', 'O quadro mudou em outro dispositivo. Atualize antes de mover a tarefa.'),
  sameTaskReference: () => new AppError('VALIDATION', 'Escolha outra tarefa como referência.'),
  staleTaskPosition: () =>
    new AppError('VERSION_CONFLICT', 'A posição escolhida não está mais disponível. Atualize o quadro.'),
  taskNotTrashed: () => new AppError('DOMAIN_RULE', 'A tarefa não está na lixeira.'),
  itemNotTrashed: () => new AppError('DOMAIN_RULE', 'Mova o item para a lixeira antes de excluir de vez.'),
  versionConflict: () =>
    new AppError('VERSION_CONFLICT', 'Este item mudou em outro dispositivo. Atualize os dados antes de continuar.'),

  invalidNameCharacters: (thing: string) =>
    new AppError('VALIDATION', `Use só letras, números, espaços e símbolos no nome da ${thing}.`),
  nameRequired: (thing: string) => new AppError('VALIDATION', `Dê um nome à ${thing}.`),
  nameTooLong: (thing: string, maxChars: number) =>
    new AppError('VALIDATION', `Use até ${maxChars} caracteres no nome da ${thing}.`),
  nameTaken: (thing: string, name: string, suffix: string) =>
    new AppError('DOMAIN_RULE', `Já existe uma ${thing} ${name}.${suffix}`),
  sourceChanged: () =>
    new AppError('VERSION_CONFLICT', 'O trecho de origem mudou. Salve o documento e selecione o trecho novamente.'),
  previewTooLarge: () =>
    new AppError(
      'VALIDATION',
      `A prévia passa de ${MAX_PREVIEW_SIDE.toLocaleString('pt-BR')} px no lado maior ou de ${MAX_PREVIEW_BYTES / 1024} KiB.`,
    ),
  pinLimit: (scope: string) =>
    new AppError('DOMAIN_RULE', `Máximo de ${MAX_PINNED} fixados ${scope}. Desafixe um item antes.`),
  taskLabelLimit: () => new AppError('VALIDATION', `Use até ${TASK_LIMITS.labels} etiquetas numa tarefa.`),
  namedReferenceMissing: (missing: string, name: string, listed: string, all: string) =>
    new AppError('NOT_FOUND', `${missing}: ${name}. ${listed}: ${all}.`),
};
