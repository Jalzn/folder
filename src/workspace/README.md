# Workspace

Projetos, documentos, desenhos, tarefas e seus vínculos no mesmo módulo. A interface usa o router `workspace` de oRPC; scripts e testes podem usar `createWorkspaceService(db)`.

## Regras implementadas

- Documentos e tarefas podem existir sem projeto. Filtro de projeto omitido significa todos; `null` significa sem projeto.
- Arquivar projeto preserva o conteúdo. É possível continuar editando documentos existentes; adicionar novos itens exige restaurar o projeto.
- Documento usa JSON do subconjunto BlockNote suportado, com formato 1, até 1 MiB em UTF-8 e 5.000 blocos. Texto de busca é derivado no servidor; a busca ignora caixa e acentos.
- Parágrafo, título, listas, checklist, citação e código são os blocos iniciais. Propriedades, estilos e links são validados antes de persistir para que um conteúdo inválido não impeça a reabertura do editor.
- Todo pedido de escrita tem `requestId`. Repetição idêntica devolve a resposta original; reutilização para outro conteúdo é recusada. Atualizações também exigem `expectedVersion`.
- Salvar documento devolve somente ID, versão e data, mantendo o registro de idempotência compacto. Criar e ler devolvem o documento completo.
- Excluir documento move para a lixeira e incrementa a versão. Restaurar também é uma escrita versionada.
- Desenhos têm cena JSON própria, até 1 MiB e 5.000 elementos vetoriais. Busca deriva do título e do texto ativo. Formas, setas vinculadas, quadros, texto e traço livre são validados; imagens e conteúdo incorporado são recusados.
- Criar, salvar, excluir e restaurar desenho devolvem somente ID, versão e data. Leitura autenticada inclui cenas na lixeira para recuperação de rascunhos; salvar desenho excluído é recusado.
- A compactação preserva elementos ativos e excluídos referenciados transitivamente; somente os demais são removidos da cena persistida. O histórico de desfazer permanece no editor.
- Tarefas usam `todo`, `doing` e `done`. Toda alteração de tarefa incrementa uma revisão global do quadro. Reordenação exige `expectedRevision` e `expectedVersion`, além de um destino opcional `beforeTaskId`.
- A posição é global por coluna; quadros de projeto filtram essa ordem. Reordenar pode incrementar as versões dos cartões reposicionados, e a interface deve recarregar a lista.
- Tarefa criada a partir de trecho valida o documento salvo, sua versão quando enviada, bloco e trecho. Tarefa e vínculo são gravados na mesma transação.
- Editar título/estado da tarefa não muda o documento. Excluir documento ou remover trecho preserva a tarefa e o texto capturado.
- A origem expõe `available` para o documento e `blockAvailable` para o trecho. Quando o trecho não existe mais, o retorno pode levar ao documento com aviso.

## Leitura por agentes

`createWorkspaceTools(db)` devolve as ferramentas somente leitura que o servidor expõe por MCP: `list_projects`, `search`, `read_document`, `read_drawing`, `list_tasks` e `read_task`. Elas não dependem do SDK MCP; cada uma tem esquema Zod em `application/reading/schemas.ts`, um caso de uso sobre a porta `WorkspaceReader` e a formatação em `infra/mcp/`.

- Itens na lixeira não aparecem: ler um deles responde como um ID inexistente, e um documento de origem na lixeira vem sem título e com `available: false`.
- A busca usa `searchText` do domínio, a mesma normalização das colunas `search_text`. Títulos de tarefas são comparados na aplicação, porque não têm coluna de busca.
- `documentToMarkdown` serializa o conteúdo persistido no servidor, num formato que o parser do BlockNote lê de volta. Itálico usa `_`, ou `*` dentro de palavras; `$` no texto sai como `\$`. Filhos de parágrafos, títulos, citações e código vêm logo depois do bloco, porque Markdown não os aninha.
- Documentos são paginados em 60.000 caracteres com cursor `<versão>:<deslocamento>`; listas usam `o:<deslocamento>`. Respostas em JSON perdem itens do fim, com o cursor ajustado, quando passariam de 70.000 caracteres.
- `outlineCanvasScene` descreve a cena atual com apelidos curtos, coordenadas relativas e ligações das setas, até 800 elementos.
- Erros conhecidos voltam com a própria mensagem e `isError`; falhas inesperadas vão para o log e o agente recebe uma mensagem genérica.

## Verificação

`domain/document.test.ts` verifica o formato suportado, limites, propriedades e links inválidos. `application/workspace.db.test.ts` usa SQLite real em arquivos temporários para testar reabertura após reinício, dois clientes, conflitos, idempotência, busca, arquivamento, lixeira, ordenação e referências que sobrevivem à remoção do conteúdo de origem.

`domain/markdown.test.ts`, `canvas-outline.test.ts` e `paging.test.ts` verificam a leitura pura; `infra/mcp/tools.db.test.ts` percorre as ferramentas em SQLite temporário, com busca, lixeira, páginas, documentos, desenhos e tarefas.

`domain/canvas.test.ts` verifica cenas e compactação sem mutação; `application/canvases.db.test.ts` cobre os contratos de desenhos, concorrência, reinício e migração de uma base anterior. `scripts/canvas-backup.db.test.ts` verifica backup e restauração independente com cena e projeto.
