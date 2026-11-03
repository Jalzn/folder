import { AppError } from '@tinyfold/core/application';
import { TASK_LIMITS } from '../domain/tasks.js';
export const boardErrors = {
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
  labelMissing: () => new AppError('NOT_FOUND', 'A etiqueta não está disponível.'),
  labelNotTrashed: () => new AppError('DOMAIN_RULE', 'Esta etiqueta não foi excluída.'),
  projectMissing: () => new AppError('NOT_FOUND', 'O projeto não foi encontrado.'),
  projectArchived: () => new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de adicionar conteúdo a ele.'),
  taskProjectRequired: () => new AppError('VALIDATION', 'Escolha o projeto da tarefa.'),
  taskMissing: () => new AppError('NOT_FOUND', 'A tarefa não foi encontrada.'),
  boardConflict: () =>
    new AppError('VERSION_CONFLICT', 'O quadro mudou em outro dispositivo. Atualize antes de mover a tarefa.'),
  sameTaskReference: () => new AppError('VALIDATION', 'Escolha outra tarefa como referência.'),
  staleTaskPosition: () =>
    new AppError('VERSION_CONFLICT', 'A posição escolhida não está mais disponível. Atualize o quadro.'),
  taskNotTrashed: () => new AppError('DOMAIN_RULE', 'A tarefa não está na lixeira.'),
  itemNotTrashed: () => new AppError('DOMAIN_RULE', 'Mova o item para a lixeira antes de excluir de vez.'),
  sourceChanged: () =>
    new AppError('VERSION_CONFLICT', 'O trecho de origem mudou. Salve o documento e selecione o trecho novamente.'),
  taskLabelLimit: () => new AppError('VALIDATION', `Use até ${TASK_LIMITS.labels} etiquetas numa tarefa.`),
  boardPageChanged: () =>
    new AppError('VERSION_CONFLICT', 'O quadro mudou desde a primeira página. Liste de novo sem cursor.'),
  emptySearch: () =>
    new AppError('VALIDATION', 'A busca ficou vazia depois de ignorar acentos e pontuação. Use outras palavras.'),
  taskUnreadable: () => new AppError('NOT_FOUND', 'Tarefa não encontrada ou na lixeira.'),
  namedReferenceMissing: (missing: string, name: string, listed: string, all: string) =>
    new AppError('NOT_FOUND', `${missing}: ${name}. ${listed}: ${all}.`),
};
