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

`createWorkspaceTools(db, { logError })` devolve as ferramentas somente leitura que o servidor expõe por MCP: `list_projects`, `search`, `read_document`, `read_drawing`, `list_tasks` e `read_task`. Elas não dependem do SDK MCP; cada uma tem esquema Zod em `application/reading/schemas.ts`, um caso de uso sobre a porta `WorkspaceReader` (SQL em `infra/reader/`) e a formatação em `infra/mcp/`. Os limites de saída ficam em `domain/reading-limits.ts`.

- Nenhuma resposta passa de 45.000 caracteres de texto, rodapés e erros incluídos: o Claude Code 2.1.310 grava num arquivo o resultado com mais de 50.000 e mostra ao modelo só uma prévia. Cada ferramenta cabe nisso pelo próprio orçamento; `withTextCeiling` corta, com aviso, o que ainda passasse, como um bloco de código com milhares de crases.
- Itens na lixeira não aparecem: ler um deles responde como um ID inexistente, e um documento de origem na lixeira vem sem título e com `available: false`.
- A busca divide a consulta em palavras normalizadas por `searchText`, a mesma forma das colunas `search_text`, e exige todas, em qualquer ordem. Hífens também separam palavras, e a pontuação em volta delas é ignorada. Itens com mais palavras no título vêm primeiro, comparando com o título normalizado no começo de `search_text`, depois os editados mais recentemente. Títulos de tarefas não têm coluna de busca: o leitor compara a forma normalizada em JavaScript, depois da consulta. Uma consulta que fica vazia sem acentos e pontuação é recusada.
- O trecho da busca vem de uma janela do texto: o SQL acha a primeira ocorrência em `search_text` e devolve 2.000 caracteres de cada lado do lugar estimado no texto guardado (em proporção, quando a normalização mudou o comprimento). `excerptAround` corta o trecho nessa janela, sem partir pares substitutos, e sem consulta não normaliza nada.
- Listas são paginadas por chave: o cursor guarda a ordenação do último item mostrado (`s~…` na busca, `t~…` no quadro, `p~…` nos projetos), e edições em outros itens não repetem nem pulam resultados. A ordem das colunas vem de `TASK_STATUSES` e a dos tipos da busca, de `SEARCH_ITEM_TYPES`. Mover uma tarefa renumera a coluna, então o cursor do quadro também fixa a revisão do quadro (`t~<revisão>~…`) e é recusado depois de qualquer mudança nas tarefas. Respostas em JSON perdem itens do fim, com o cursor ajustado, quando passariam do teto de saída.
- Documentos são paginados em 36.000 caracteres com cursor `<versão>:<deslocamento>`. O cabeçalho da primeira página tem orçamento próprio de 9.000 caracteres, com separadores e rodapé, e conta as tarefas originadas que não couberam. Um bloco de código ou uma fórmula `$$` cortados pela página são fechados no fim e reabertos na página seguinte; um bloco aninhado numa lista reabre na coluna 0, com as linhas dessa página desindentadas.
- `documentToMarkdown` escreve CommonMark que o parser do BlockNote lê de volta:
  - ênfase segue as regras de flanqueamento: itálico usa `_`, ou `*` dentro de palavras, e um trecho que nenhum delimitador abre e fecha vira `<strong>`, `<em>` ou `<del>`; o `*` do itálico nunca encosta no `**` do negrito, porque formariam uma só sequência de delimitadores, e o `_` do itálico não abre logo depois de um `\_`, que o BlockNote leria como texto;
  - `$` no texto sai como `\$`; `<` e `&` ficam literais, porque o BlockNote não tem escape para eles; um `!` logo antes de um link sai como `\!`, senão o link viraria imagem;
  - espaços no fim do rótulo de um link saem depois do link;
  - quebras dentro de itens de lista saem como `<br>`; depois de uma quebra, uma linha só de `=` e uma linha delimitadora de tabela GFM (como `:--|:--`) são escapadas; a indentação no início de um bloco é descartada; números de lista ficam entre 0 e 999.999.999;
  - filhos de parágrafos, títulos, citações e código vêm logo depois do bloco, porque Markdown não os aninha.
- Perdas conhecidas no parser do BlockNote, fixadas em `src/web/lib/markdown-roundtrip.test.ts`:
  - um espaço é acrescentado depois de cada quebra num parágrafo ou citação, e uma quebra na borda de um trecho com estilo entra no estilo;
  - filhos de parágrafo de um item de checklist e uma lista aninhada depois de outro filho de um item voltam como irmãos;
  - um parágrafo ou código depois de uma lista aninhada num item volta como item da lista de fora, e o código vira o texto desse item, sem a linguagem;
  - `\=` depois de uma quebra e `\$` dentro de `<strong>`, `<em>` ou `<del>` mantêm a barra, assim como os escapes de endereços de link com parênteses desbalanceados, `<`, `>` ou `\`. Nesses pares nenhuma forma de `$` serve: o BlockNote não decodifica `&#36;`, e um `$` solto formaria fórmula com outro adiante para leitores com matemática;
  - texto com forma de tag HTML é lido como HTML, e um endereço solto no texto vira link.
- Como `&` fica literal, um leitor CommonMark lê texto como `&amp;` ou `&copy;` como a entidade (`&`, `©`). Sublinhado, cores e alinhamento não têm forma em Markdown.
- `outlineCanvasScene` descreve a cena atual com apelidos curtos, coordenadas relativas e ligações das setas, até 800 elementos e o que o cabeçalho deixa dos 45.000 caracteres. Num desenho grande, formas entram em ordem de leitura, cada uma com as conexões que completa, e os omitidos são contados por tipo. Nomes de quadros entram no texto de busca do desenho.
- `read_drawing` envia a prévia PNG guardada como bloco de imagem e diz se ela mostra uma cena anterior.
- Erros conhecidos voltam com a própria mensagem e `isError`; falhas inesperadas vão para o log e o agente recebe uma mensagem genérica.

## Prévias de desenho

O navegador gera uma prévia PNG depois de salvar e a envia por `workspace.saveCanvasPreview({ id, version, png })`, com `png` como arquivo. A gravação não usa o registro de pedidos (`writeWithoutRequestRecord`) e não muda a versão, as datas nem a revisão do quadro: repetir o envio da mesma versão é seguro.

- `readPngInfo` só aceita um PNG bem formado e só com os blocos que o codificador do navegador escreve: CRC de cada bloco, IHDR válido, `PLTE` e blocos auxiliares (`tRNS`, `sRGB`, `gAMA`, `cHRM`, `pHYs`) antes dos dados, blocos `IDAT` seguidos e IEND no fim, sem bytes depois. A paleta tem entradas inteiras, de 1 até as que a profundidade de bits indexa (no máximo 256). Os dados de imagem precisam descomprimir exatamente no tamanho que o IHDR pede (`infra/png-image-data.ts`, com limite de saída), e cada linha de cada passada começa com um dos cinco tipos de filtro. A prévia tem até 1.568 px no lado maior e 256 KiB.
- Versão futura, PNG inválido ou acima dos limites: `VALIDATION`. Desenho inexistente ou na lixeira: `NOT_FOUND`.
- Versão anterior à do desenho, ou mais antiga que a prévia guardada, devolve `{ stored: false, previewVersion }` sem erro.
- A prévia guarda a impressão digital da cena (`sceneFingerprint`). Renomear, mover ou passar pela lixeira muda a versão, mas não a cena, então a prévia continua atual. Prévias anteriores à migração 004 comparam a versão.
- `getCanvas` devolve `previewVersion`, `null` sem prévia, e `previewCurrent`. A tabela `workspace_canvas_previews` apaga a prévia junto com o desenho.

## Verificação

`domain/document.test.ts` verifica o formato suportado, limites, propriedades e links inválidos. `application/workspace.db.test.ts` usa SQLite real em arquivos temporários para testar reabertura após reinício, dois clientes, conflitos, idempotência, busca, arquivamento, lixeira, ordenação e referências que sobrevivem à remoção do conteúdo de origem.

`domain/markdown.test.ts`, `markdown-emphasis.test.ts`, `markdown-pages.test.ts`, `excerpt.test.ts`, `search-text.test.ts`, `canvas-outline.test.ts`, `canvas-preview.test.ts`, `png.test.ts` e `paging.test.ts` verificam a leitura pura, e `application/reading/keyset-page.test.ts` o cursor das listas; `application/canvas-previews.db.test.ts` cobre as regras das prévias e as migrações 003 e 004. Em `infra/mcp/`, um arquivo por ferramenta (`search`, `documents`, `drawings` e `tasks`) a percorre em SQLite temporário com `useAgentTools` de `testing/agent-tools.ts`; `tools.db.test.ts` cobre o que vale para todas: lixeira, arquivamento, orçamentos de saída e falhas inesperadas.

`domain/canvas.test.ts` verifica cenas e compactação sem mutação; `application/canvases.db.test.ts` cobre os contratos de desenhos, concorrência, reinício e migração de uma base anterior. `scripts/canvas-backup.db.test.ts` verifica backup e restauração independente com cena e projeto.
