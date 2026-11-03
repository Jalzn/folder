import { ListProjectsInput } from '@tinyfold/workspace/contracts';
import { keysetJsonResult } from './paged-result.js';
import type { AgentQueries } from './queries.js';
import { defineTool, readOnlyAnnotations } from './types.js';

export const listProjectsTool = (queries: AgentQueries) =>
  defineTool({
    name: 'list_projects',
    title: 'Listar projetos',
    description:
      'Lista os projetos do Tinyfold com a quantidade de documentos, desenhos e tarefas abertas de cada um. ' +
      'Todo item pertence a um projeto. Projetos arquivados ficam de fora, a menos que includeArchived seja true; ' +
      'sem projeto ativo, a lista vem vazia e includeArchived: true mostra os arquivados. color é a cor da marca, ' +
      'e position, a ordem no seletor do Tinyfold, null nos arquivados. Cada projeto traz até 50 pastas (folders), ' +
      'na ordem da lateral, com a quantidade de itens, e folderCount com o total. Use search com folderId para ' +
      'listar os itens de uma pasta. Os editados mais recentemente vêm primeiro; passe o nextCursor para ver a ' +
      'próxima página.',
    inputSchema: ListProjectsInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const page = await queries.listProjects(input);
      return keysetJsonResult(page.items, (shown) => ({ projects: shown, nextCursor: page.nextCursor(shown.length) }));
    },
  });
