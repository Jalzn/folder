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

`createWorkspaceTools(db)` devolve as ferramentas somente leitura que o servidor expõe por MCP: `list_projects`, `search`, `read_document`, `read_drawing`, `list_tasks` e `read_task`. Elas não dependem do SDK MCP; cada uma tem esquema Zod em `application/reading/schemas.ts`, um caso de uso sobre a porta `WorkspaceReader` (SQL em `infra/reader/`) e a formatação em `infra/mcp/`. Os limites de saída ficam em `domain/reading-limits.ts`.

- Itens na lixeira não aparecem: ler um deles responde como um ID inexistente, e um documento de origem na lixeira vem sem título e com `available: false`.
- A busca divide a consulta em palavras normalizadas por `searchText`, a mesma forma das colunas `search_text`, e exige todas, em qualquer ordem. Itens com mais palavras no título vêm primeiro, depois os editados mais recentemente. Títulos de tarefas não têm coluna de busca: o leitor compara a forma normalizada em JavaScript, depois da consulta. Uma consulta que fica vazia sem os acentos é recusada.
- O trecho da busca é cortado no domínio (`excerptAround`) a partir do texto do item, em volta da primeira ocorrência, sem partir pares substitutos.
- Listas são paginadas por chave: o cursor guarda a ordenação do último item mostrado (`s~…` na busca, `t~…` no quadro, `p~…` nos projetos), e edições em outros itens não repetem nem pulam resultados. Respostas em JSON perdem itens do fim, com o cursor ajustado, quando passariam de 70.000 caracteres.
- Documentos são paginados em 60.000 caracteres com cursor `<versão>:<deslocamento>`. O cabeçalho da primeira página tem orçamento próprio e conta as tarefas originadas que não couberam. Um bloco de código cortado pela página é fechado no fim e reaberto na página seguinte.
- `documentToMarkdown` escreve CommonMark que o parser do BlockNote lê de volta:
  - ênfase segue as regras de flanqueamento: itálico usa `_`, ou `*` dentro de palavras, e um trecho que nenhum delimitador abre e fecha vira `<strong>`, `<em>` ou `<del>`;
  - `$` no texto sai como `\$`; `<` e `&` ficam literais, porque o BlockNote não tem escape para eles;
  - quebras dentro de itens de lista saem como `<br>`; uma linha só de `=` é escapada; a indentação no início de um bloco é descartada; números de lista ficam entre 0 e 999.999.999;
  - filhos de parágrafos, títulos, citações e código vêm logo depois do bloco, porque Markdown não os aninha.
- Perdas conhecidas no parser do BlockNote: filhos de parágrafo de um item de checklist e uma lista aninhada depois de outro filho de um item voltam como irmãos; `\=` e `\)` mantêm a barra; texto com forma de tag HTML é lido como HTML.
- `outlineCanvasScene` descreve a cena atual com apelidos curtos, coordenadas relativas e ligações das setas, até 800 elementos. Num desenho grande, formas entram em ordem de leitura, cada uma com as conexões que completa, e os omitidos são contados por tipo. Nomes de quadros entram no texto de busca do desenho.
- `read_drawing` envia a prévia PNG guardada como bloco de imagem e diz se ela mostra uma cena anterior.
- Erros conhecidos voltam com a própria mensagem e `isError`; falhas inesperadas vão para o log e o agente recebe uma mensagem genérica.

## Prévias de desenho

O navegador gera uma prévia PNG depois de salvar e a envia por `workspace.saveCanvasPreview({ id, version, png })`, com `png` como arquivo. A gravação não usa o registro de pedidos (`writeWithoutRequestRecord`) e não muda a versão, as datas nem a revisão do quadro: repetir o envio da mesma versão é seguro.

- `readPngInfo` só aceita um PNG bem formado: CRC de cada bloco, IHDR válido, dados de imagem e IEND no fim, sem bytes depois. A prévia tem até 1.568 px no lado maior e 256 KiB.
- Versão futura, PNG inválido ou acima dos limites: `VALIDATION`. Desenho inexistente ou na lixeira: `NOT_FOUND`.
- Versão anterior à do desenho, ou mais antiga que a prévia guardada, devolve `{ stored: false, previewVersion }` sem erro.
- A prévia guarda a impressão digital da cena (`sceneFingerprint`). Renomear, mover ou passar pela lixeira muda a versão, mas não a cena, então a prévia continua atual. Prévias anteriores à migração 004 comparam a versão.
- `getCanvas` devolve `previewVersion`, `null` sem prévia, e `previewCurrent`. A tabela `workspace_canvas_previews` apaga a prévia junto com o desenho.

## Verificação

`domain/document.test.ts` verifica o formato suportado, limites, propriedades e links inválidos. `application/workspace.db.test.ts` usa SQLite real em arquivos temporários para testar reabertura após reinício, dois clientes, conflitos, idempotência, busca, arquivamento, lixeira, ordenação e referências que sobrevivem à remoção do conteúdo de origem.

`domain/markdown.test.ts`, `markdown-emphasis.test.ts`, `markdown-pages.test.ts`, `excerpt.test.ts`, `canvas-outline.test.ts`, `canvas-preview.test.ts` e `paging.test.ts` verificam a leitura pura; `application/canvas-previews.db.test.ts` cobre as regras das prévias e a migração 003; `infra/mcp/tools.db.test.ts` percorre as ferramentas em SQLite temporário, com busca, lixeira, páginas, documentos, desenhos e tarefas.

`domain/canvas.test.ts` verifica cenas e compactação sem mutação; `application/canvases.db.test.ts` cobre os contratos de desenhos, concorrência, reinício e migração de uma base anterior. `scripts/canvas-backup.db.test.ts` verifica backup e restauração independente com cena e projeto.
