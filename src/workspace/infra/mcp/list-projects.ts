import { listProjects } from '../../application/reading/list-projects.js';
import type { ReadingContext } from '../../application/reading/ports.js';
import { ListProjectsInput } from '../../application/reading/schemas.js';
import { compactJson, fitItems, textResult } from './format.js';
import { defineTool, readOnlyAnnotations } from './types.js';

export const listProjectsTool = (reading: ReadingContext) =>
  defineTool({
    name: 'list_projects',
    title: 'Listar projetos',
    description:
      'Lista os projetos do Tinyfold com a quantidade de documentos, desenhos e tarefas abertas de cada um. ' +
      'Projetos arquivados ficam de fora, a menos que includeArchived seja true. withoutProject conta os itens sem ' +
      'projeto. Os mais recentes vêm primeiro; passe o nextCursor para ver a próxima página.',
    inputSchema: ListProjectsInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const page = await listProjects(reading, input);
      const text = fitItems(page.projects, (shown) =>
        compactJson({
          projects: shown,
          withoutProject: page.withoutProject,
          nextCursor: page.nextCursor(shown.length),
        }),
      );
      return textResult(text);
    },
  });
