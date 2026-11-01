# Etapa 11 — Documento e desenho

**Estado:** detalhada em 2026-11-01, a partir do escopo inicial de 2026-10-31. As seções "Resultado" e "Desvios do plano" entram ao concluir, como nas etapas [09](09-pastas.md) e [10](10-quadro-tarefa.md).

## Objetivo

Levar ao documento as ligações do produto:

- tarefas e desenhos incorporados, vivos e somente leitura;
- o estado de item indisponível, com Restaurar e Remover;
- o marcador de origem no fim do trecho que originou uma tarefa.

As páginas de documento e de desenho passam ao Sumário, conforme [visual.md](../interface/visual.md) e o protótipo. O Markdown exportado e o MCP passam a mostrar os incorporados como links. O seed deixa de salvar os desenhos do exemplo na primeira abertura.

## Referências e precedência

| Assunto | Fonte |
| --- | --- |
| Incorporados e marcador: medidas, estados e tokens | [visual.md](../interface/visual.md), "Documento: itens incorporados" |
| Documento sem coluna de margem: estrutura e textos | [refino.md](../interface/refino.md) §7 e §8 |
| Dados de exemplo (a tarefa e o desenho incorporados, a tarefa excluída) | [brief.md](../interface/brief.md) |
| Comportamento de referência | `docs/interface/prototipo/sumario.html`: `docHTML`, `blockHTML`, `embedInner`, `missingHTML`, `omarkHTML`, `figNum`, `slashBase`, `embedPicker`, `insertEmbed`, o `embed-remove`, `createFromDraft` (com "Incorporar no documento"), `drawingHeaderHTML`, `saveSeg` e o CSS de `.doc`, `.ecard`, `.edraw`, `.emiss` e `.omark` |
| Padrões existentes | [Etapa 09](09-pastas.md) (Desfazer por toast, foco por referência) e [etapa 10](10-quadro-tarefa.md) (gaveta, editor compartilhado, `undoKeyAction`, `session-pool`), e [etapa 07](07-mcp.md) (páginas do `read_document` e teto de 45.000 caracteres) |

A ordem é a de [interface/README.md](../interface/README.md): visual.md é mais recente que refino.md. Onde as duas diferem, vale a visual.md, que é também o que o protótipo desenha:

| Peça | visual.md e protótipo (valem) | refino.md (substituído) |
| --- | --- | --- |
| Coluna e título | 680 px; título 30/36 600 | 660 px; título 34/40 300, com 72 px de respiro |
| Tarefa incorporada | card `nível-1`, borda `fio`, raio 8, padding 10/12; título 14/20 500 | bloco entre fios, sem caixa; título 15/22 500 |
| Desenho incorporado | moldura de raio 8, borda `fio` e fundo `fundo`; "Abrir ↗" no hover | sem moldura; "Abrir ↗" sempre visível |
| Indisponível | borda tracejada `fio-forte`, ações em botões fantasma de 24 px | fios tracejados `borda-campo`, ações como links |
| Marcador de origem | botão de 18 px, raio 4, anel de 12 px em `acento` | botão de 16 px |

## Casos de uso

1. Incorporar ao documento uma tarefa (existente ou nova) ou um desenho (existente ou novo) pelo menu `/`.
2. Ver no card o estado atual da tarefa (coluna, prazo, etiquetas, checklist) e abri-la na gaveta.
3. Ver o desenho na versão atual, com "Figura n — título", e abri-lo no editor.
4. Restaurar da lixeira, ali mesmo, um item incorporado; ou removê-lo do documento, com Desfazer.
5. Criar uma tarefa a partir de um trecho e ver o card entrar logo abaixo do parágrafo.
6. Encontrar, no fim do trecho, o marcador da tarefa que nasceu dele, e abri-la.
7. Exportar o documento em Markdown, com os incorporados como links, e importá-lo de volta.
8. Pelo Claude Code, ler o documento com os incorporados como referências e seguir para `read_task` e `read_drawing`.
9. Trabalhar no documento e no desenho com o cabeçalho Sumário: pasta, salvamento, Exportar e ⋯.

## Escopo

**Entra:**

- **Blocos novos** `taskEmbed` e `drawingEmbed`, só no esquema do documento, com validação no domínio. A descrição da tarefa continua sem eles.
- **Leitura dos incorporados:** `resolveEmbeds`, em lote, para o editor e o MCP. A prévia PNG do desenho sai por uma rota autenticada.
- **Interface do documento:**
  - o card da tarefa, a figura do desenho, os estados indisponíveis, a inserção pelo `/` com o seletor e "Incorporar no documento" ao criar tarefa de um trecho;
  - o marcador de origem como decoração do editor;
  - a página no Sumário: cabeçalho, faixas fixas e ⋯ com "Criar tarefa" e ⌘⌥T.
- **Página do desenho** no Sumário, com "Exportar ▾".
- **Markdown:** a exportação passa ao serializador do domínio, com os incorporados como links. A importação lê os links como links comuns. Entra o endereço permanente `/tarefas/$id`.
- **MCP:** `read_document` com os incorporados como referências.
- **Exemplo:** `seed:sample` com as cenas já normalizadas e os incorporados do brief.

**Fica de fora:**

- **Outros incorporados:** documentos dentro de documentos, incorporados na descrição da tarefa e outros tipos de bloco.
- **Índice reverso:** "onde este item está incorporado", e incorporados na busca.
- **Edição dentro do incorporado:** o card e a figura são somente leitura.
- **Diálogo "Comparar"** do conflito, que o protótipo desenha. O conflito continua com as faixas da etapa 02.
- **Converter de volta em incorporados**, na importação, os links que a exportação gerou: eles continuam links comuns, como pede o escopo inicial.
- **Celular desenhado:** o fallback continua funcional.

## Decisões técnicas

A pergunta 2 do escopo inicial (a imagem do desenho) foi resolvida aqui, na linha 4. A pergunta 1 (incorporar itens de outro projeto) foi para [Perguntas para o usuário](#perguntas-para-o-usuário).

| # | Decisão | Motivo |
| --- | --- | --- |
| 1 | Sem migração. O incorporado é um bloco do JSON do documento com o ID do item (`taskEmbed { taskId }`, `drawingEmbed { canvasId }`), resolvido a cada leitura. Sem chave estrangeira nem índice reverso | O documento já guarda ligações (links) assim. A integridade vem da resolução: lixeira, exclusão definitiva, mudança de projeto ou pasta aparecem no próximo resolver, sem nada a manter em sincronia. Nenhuma especificação pede "onde está incorporado"; a busca ignora os incorporados; e o aviso de exclusão definitiva do protótipo é uma frase fixa |
| 2 | `readDocumentContent` aceita os dois blocos só com a opção `embeds: true`, que o documento passa e a descrição não. Cada um tem só a sua propriedade UUID, sem conteúdo nem filhos. Um documento tem no máximo 200 incorporados | A descrição usa o mesmo validador (etapa 10, decisão 8), e o escopo inicial mantém os incorporados exclusivos do documento. O limite deixa o resolver numa consulta só e o Markdown do MCP em poucas páginas |
| 3 | `format_version` continua 1 | Os blocos novos só somam ao formato: todo documento antigo continua válido. O preço é uma aba aberta com o código da etapa 10 que encontra um documento com incorporados: o BlockNote dela não conhece o bloco e a página falha até recarregar. O caso fica nos riscos e em [operação](../implantacao.md) |
| 4 | A figura usa a prévia PNG guardada (etapa 07), por `GET /arquivos/desenhos/:id/previa.png`. Com `previewCurrent` falso, ou sem prévia, o documento gera uma nova pelo `CanvasPreviewUploader`, carregando o módulo de exportação do Excalidraw só nessa hora. No tema escuro, a imagem recebe o filtro do modo escuro do Excalidraw (`invert(93%) hue-rotate(180deg)`) | A prévia é leve, da mesma origem, e já está no SQLite e no backup. Carregar o editor Excalidraw em todo documento custaria mais de 1 MB de script e um canvas por figura. "Versão atual" fica garantida pela regeneração ao abrir, que só acontece quando a prévia está defasada. Resolve a pergunta 2 do escopo inicial |
| 5 | A rota da prévia exige a sessão (o cookie, como `/rpc`), responde `image/png` com `ETag` da impressão digital da cena, `Cache-Control: private, no-cache`, `X-Content-Type-Options: nosniff` e 304 com `If-None-Match`. Desenho na lixeira, excluído ou sem prévia dá 404 | É uma leitura de mesma origem, sem efeito colateral, então não precisa da conferência de origem do `/rpc`. A revalidação por `ETag` não serve uma imagem velha e não baixa de novo a mesma |
| 6 | A exportação `.md` da web passa a usar `documentToMarkdown` do domínio, o mesmo do MCP, com um resolvedor de incorporados. Só o destino dos links muda: no arquivo, `<origem>/tarefas/<id>` e `<origem>/desenhos/<id>`; no MCP, `tinyfold:task/<id>` e `tinyfold:drawing/<id>` | Um serializador só, sem divergência entre arquivo e MCP, como pede o escopo inicial. O teste de ida e volta da etapa 07 já prova que esse Markdown volta pelo parser do BlockNote. No arquivo, um link http(s) abre o Tinyfold e passa pelo validador de links do documento na importação; o esquema `tinyfold:` só serve ao agente |
| 7 | Entra o endereço permanente `/tarefas/$taskId`, que redireciona ao Quadro do projeto com a gaveta (`?tarefa=`), como `/documentos/$id` e `/desenhos/$id` da etapa 08 | O link exportado de uma tarefa precisa sobreviver à mudança de projeto |
| 8 | O marcador de origem é uma decoração do ProseMirror (`origin-markers.ts`), feita a partir das origens que o painel do documento já lê (`listTasks({ documentId })`), sem tocar no JSON. Ele fica no fim do trecho achado no bloco (`excerptEnd`, puro, com a normalização de `excerptPresent`). Se o trecho mudou, fica no fim do bloco. Some sem o bloco, com a tarefa na lixeira e numa origem sem bloco (seleção de vários blocos) | É o que o escopo inicial pede ("sem mudar o JSON"). A decoração é refeita quando o texto ou as tarefas mudam, e o trecho editado não esconde a ligação |
| 9 | O card e a figura são nós do BlockNote sem conteúdo (`content: 'none'`), num nó não editável. O teclado chega neles pela seleção de nó das setas: ↵ abre, ⌫ e Delete removem, como qualquer bloco. O marcador é um alvo de ponteiro e de toque, e o teclado chega às mesmas tarefas pelo painel "Tarefas", pelo ⌘K e pela gaveta | Botões dentro de um `contenteditable` não entram na ordem do Tab sem brigar com o Tab do editor, que recua listas. A seleção de nó é o caminho do próprio ProseMirror |
| 10 | "Remover" de um incorporado é uma edição do documento, com o toast "Bloco removido do documento. O texto ao redor ficou como estava." e Desfazer. O Desfazer devolve o bloco, com o mesmo ID, logo depois do bloco que vinha antes dele, ou no começo, se esse bloco não existe mais. Se o ⌘Z do editor já o devolveu, o Desfazer não faz nada | O ⌘Z dentro do editor é do BlockNote (`undoKeyAction`, `native`) e também devolve o bloco. Os dois caminhos precisam ser seguros juntos, e o ID do bloco é a conferência. É o protótipo (`embed-remove`) |
| 11 | O resolver é uma consulta por documento, com os IDs do editor ordenados (inclusive os ainda não salvos). Ela é invalidada pelas escritas de tarefa, coluna, etiqueta, desenho, prévia, lixeira e movimento (`['workspace', 'embeds']`), e lida de novo ao voltar à aba | O card precisa refletir a gaveta na mesma tela e outro aparelho em pouco tempo, sem uma consulta por bloco |
| 12 | No MCP, uma tarefa ou um desenho na lixeira, excluído de vez ou inexistente vira `[Item indisponível]`, sem título | É a regra do MCP desde a etapa 07: o que está na lixeira não aparece |
| 13 | O cursor do `read_document` continua preso ao texto Markdown, agora com os incorporados resolvidos. Uma tarefa incorporada que muda de título ou de coluna entre duas páginas faz o cursor ser recusado ("O documento mudou desde a primeira página…") | O deslocamento conta caracteres do texto resolvido; prender só ao JSON deixaria a página seguinte cortar uma linha ao meio. A mensagem já diz como seguir |
| 14 | "Criar tarefa a partir da seleção" ganha ⌘⌥T (Ctrl+Alt+T fora do Mac), como no protótipo, e o item "Criar tarefa" no topo do ⋯. A dica e o botão no rodapé do documento saem | O rodapé repetia o botão da barra de formatação. O atalho é do protótipo; no Linux, Ctrl+Alt+T pode abrir o terminal, um caso aceito |
| 15 | Incorporar ao criar de um trecho (o "Incorporar no documento" do protótipo, marcado por padrão) é feito pelo editor aberto do documento, que se registra no `save-registry` com `insertEmbedAfter(blockId, taskId)`. Se o documento não está aberto nesta aba quando a tarefa é criada, ela é criada sem o card, e o toast diz isso | Inserir pelo servidor mudaria a versão do documento sob um editor aberto e criaria conflito com o autosave. A gaveta continua aberta durante a navegação (etapa 10), então o documento pode não estar mais na tela |
| 16 | O seed passa a gravar as cenas como o Excalidraw 0.18.1 as restaura. A lista do que muda (`index` fracionário, `version`, `versionNonce`, ligações de seta e de texto nos dois lados, medidas de texto) sai de uma comparação no Chrome feita uma vez e fica fixada no seed. Um E2E garante que abrir cada documento e desenho do exemplo não salva nada | É a pendência das etapas 09 e 10 ([validação](../validacao.md#pendências)). Pela regra de `sceneRevision`, qualquer campo que o Excalidraw acrescente vira uma edição |

## Dados

### Sem migração

A etapa não cria migração (decisão 1). A última do workspace continua a 007, e o executor da etapa 10 não muda.

- **Escritas:** as que já existem (`saveDocument`, `createDocument`, `restoreTask`, `restoreCanvas` e `saveCanvasPreview`) cobrem tudo o que a interface faz.
- **Respostas guardadas:** as do `core_mutations` não mudam. As escritas de documento continuam compactas, sem conteúdo, e nenhuma resposta nova leva título ou texto.
- **Leituras novas:** o resolver e a rota da prévia são leituras, sem registro de pedido.
- **Backup:** os incorporados estão no JSON do documento, que o backup já leva, e a prévia está em `workspace_canvas_previews`. Nenhum teste de backup novo é preciso; `projects-backup.db.test.ts` ganha um documento com incorporados.

### Blocos

```json
{ "id": "…", "type": "taskEmbed", "props": { "taskId": "…" }, "children": [] }
{ "id": "…", "type": "drawingEmbed", "props": { "canvasId": "…" }, "children": [] }
```

- **Validação** (`readDocumentContent(conteúdo, limites, { embeds: true })`):
  - o tipo só vale com a opção;
  - `props` tem exatamente a chave do tipo, com um UUID;
  - nada de `content` e `children` vazio;
  - até 200 por documento (`EMBED_LIMITS.perDocument`).
- **Mensagens:** sem a opção, a descrição recusa com "A descrição não aceita itens incorporados.". Acima do limite: "Um documento aceita até 200 itens incorporados.".
- **Texto derivado:** `documentPlainText`, `documentLead` e `excerptPresent` ignoram os incorporados. O texto de busca e o trecho não mudam.
- **Rascunhos:** a leitura do rascunho do documento (`parseDraft`) usa a opção, e a da descrição, não.
- **Cópias:** "Salvar como cópia" e uma cópia por colar levam os blocos como estão. Colar um incorporado na descrição o descarta, porque o esquema da descrição não o tem.

### Estados de um incorporado

Vêm de `resolveEmbeds` (`application/embeds/resolve-embeds.ts`) e do mesmo SQL no MCP (`infra/reader/embeds.ts`).

| Estado | Tarefa | Desenho |
| --- | --- | --- |
| `live` | O resumo da etapa 10 (título, coluna, prazo, etiquetas, checklist, conclusão, versão), com o projeto (nome, cor, arquivado) | Título, versão, projeto e pasta, e a prévia: impressão digital, largura, altura e `current`. Cena vazia: `empty: true` |
| `trashed` | Título e versão, para o Restaurar | Título e versão |
| `missing` | Excluída de vez ou nunca existiu: só o ID | Igual |

**Casos:**

- **Projeto ou pasta mudou:** o item continua `live`, e o card ou a legenda dizem o projeto quando ele não é o do documento.
- **Projeto arquivado:** o item continua `live`, com o projeto marcado como arquivado.
- **Item excluído de vez:** fica `missing`. O documento mantém o bloco até alguém removê-lo, e nunca quebra.

## Contratos

| Procedimento ou rota | Entrada | Saída | Erros |
| --- | --- | --- | --- |
| `resolveEmbeds` (novo) | `{ taskIds: uuid[] (até 200), canvasIds: uuid[] (até 200) }` | `{ tasks: EmbeddedTask[], drawings: EmbeddedDrawing[] }`, um por ID pedido, nos estados acima | `VALIDATION` (mais de 200 ou ID inválido) |
| `GET /arquivos/desenhos/:id/previa.png` (novo, no servidor) | Cookie de sessão; `If-None-Match` opcional | 200 `image/png`, com `ETag`, `Cache-Control: private, no-cache` e `nosniff`; ou 304 | 401 sem sessão; 404 sem desenho vivo ou sem prévia; 400 para ID que não é UUID |
| `saveDocument`, `createDocument` | Conteúdo com os blocos novos | Como hoje | `VALIDATION` com as mensagens da seção Blocos |
| `saveTaskText`, `createTask` (descrição) | Como hoje | Como hoje | `VALIDATION` "A descrição não aceita itens incorporados." |
| `search` | Como hoje | Como hoje: os incorporados não entram no texto | — |

- **Restaurar pelo incorporado:** usa `restoreTask` e `restoreCanvas`, com a versão do estado `trashed`, um `requestId` por intenção e `onceMoreIfLost`.
- **Criar pelo seletor:** "Nova tarefa…" usa `createTask` pela gaveta, e "Novo desenho", `createCanvas` no projeto e na pasta do documento. A pasta excluída cai na raiz, como na etapa 09.
- **Testes de servidor:** o teste que chama todos os procedimentos sem sessão cobre `resolveEmbeds`. A rota da prévia tem o seu teste.
- **Desenvolvimento:** o `vite.config.ts` acrescenta `/arquivos` ao proxy do servidor, ao lado de `/rpc` e `/mcp`.

## MCP

| Peça | Mudança |
| --- | --- |
| `read_document` | Os incorporados saem como linhas próprias:<br>• tarefa: `[Tarefa: <título> (<coluna>)](tinyfold:task/<id>)`;<br>• desenho: `[Desenho: <título>](tinyfold:drawing/<id>)`;<br>• na lixeira, excluído ou inexistente: `[Item indisponível]`.<br>Títulos e nomes passam por `visibleText` e `singleLine`, e os colchetes e a barra invertida são escapados como no texto do link. A resolução vai na mesma leitura do documento, numa consulta só |
| `read_document`: descrição | Acrescenta: "Tarefas e desenhos incorporados aparecem como links tinyfold:task/<id> e tinyfold:drawing/<id>; leia-os com read_task e read_drawing, que recebem esses IDs. [Item indisponível] é um item na lixeira ou excluído." |
| `read_task`, `read_drawing` | As descrições dizem que aceitam os IDs desses links. Sem outra mudança |
| Limites | As páginas de 36.000 caracteres, o cabeçalho de 9.000 e o teto de 45.000 (`READING_LIMITS`) continuam. O cursor fica preso ao texto resolvido (decisão 13) |
| Domínio | `documentToMarkdown(blocos, { embeds })`, com `embeds.resolve(tipo, id)` (título e coluna ou `null`) e `embeds.href(tipo, id)`. Sem a opção, um incorporado vira `[Item indisponível]` |

**Teto:** o teste "keeps every text result within the output ceiling, by its own budget" (`infra/mcp/tools.db.test.ts`) ganha:

- um documento com 200 incorporados de títulos pesados (300 caracteres de `"\\\u0001`) e colunas de nomes pesados;
- metade deles na lixeira;
- o documento lido até a última página.

Cada resultado fica com no máximo 45.000 caracteres sem disparar `withTextCeiling`.

## Interface

### Página do documento

**Moldura** (`PageFrame`):

- **Barra:** à esquerda, o rótulo da pasta (`FolderLabel`, etapa 09). À direita:
  - **Salvamento:**
    - "Salvo · editado hoje", "· editado ontem" ou "· editado em 28 out", em 12 `--text-3`, com a dica "Salvo às 14:32" (`saveSeg` do protótipo);
    - "Salvando…";
    - na falha, ícone, "Não salvou" e o botão "Tentar de novo" (dica com ⌘S);
    - "Conflito", em `--conflict`.
  - **"Tarefas · 2"**, conforme a [pergunta 2](#perguntas-para-o-usuário).
  - **O ⋯**, nesta ordem:
    1. Criar tarefa (⌘⌥T), com a nota "A partir do trecho selecionado" ou "Selecione um trecho para criar a partir dele";
    2. Exportar Markdown e Importar Markdown;
    3. separador;
    4. Fixar ou Desafixar (P), Mover para pasta… (M) e Mover para projeto…;
    5. separador;
    6. Mover para a lixeira.
- **Faixas fixas sob a barra:** `PageFrame` ganha o espaço `bands`, entre a barra e a área que rola. As faixas de falha, conflito, rascunho, trecho de origem e arquivado ficam ali, com até 744 px, centradas, e não rolam com o texto. O desenho usa o mesmo espaço, na largura toda.

**Coluna:**

- **Medidas:** 680 px, centrada, com padding 28 em cima e 160 embaixo.
- **Título:** 30/36 600, editável. ↵ leva o cursor ao começo do texto.
- **Fio:** `--line`, com 20 px em cima e 24 embaixo, até o texto em 15/24.
- **Sem sobretítulo nem coluna de margem.** O rodapé "Digite / para inserir um bloco" e o botão "Criar tarefa da seleção" saem (decisão 14). O placeholder do editor continua a dica.

**Menu `/`** (`insert-menu.ts`, só no documento): os itens do BlockNote e das equações, mais um grupo "Incorporar":

- "Tarefa", com a dica "incorporar" e os apelidos tarefa, task, card;
- "Desenho", com a dica "incorporar" e os apelidos desenho, figura, drawing.

Escolher um deles abre o seletor (`EmbedPicker.tsx`), um popover ancorado no bloco, com `Autocomplete` e `SearchField`:

| Tipo | Itens |
| --- | --- |
| Tarefa | "Nova tarefa…" (abre a gaveta no modo novo, no projeto do documento, e o card entra no lugar quando a tarefa é criada); separador; "Incorporar tarefa existente": as tarefas vivas pela busca (`search` com `types: ['task']`), as recentes antes de digitar, com o projeto à direita conforme a pergunta 1 |
| Desenho | "Novo desenho" (cria no projeto e na pasta do documento, incorpora e mostra o toast "Desenho criado e incorporado." com "Abrir"); separador; "Incorporar desenho existente", pela busca com `types: ['drawing']` |

- **Lugar do bloco:** o bloco entra no lugar do parágrafo vazio do `/`, ou logo depois do bloco atual.
- **Foco:** o foco vai ao incorporado novo, pela seleção de nó do editor. O Esc no seletor fecha e devolve o cursor ao bloco.
- **Projeto arquivado:** o documento é só leitura e não tem o menu.

**Tarefa incorporada** (`blocks/TaskEmbed.tsx`, visual.md):

- **Card:** `--raised-1` (branco no claro), borda `--line`, raio 8, padding 10/12, 10 px acima e abaixo do bloco. É um botão que abre a gaveta.
  - **Linha 1:** o anel da coluna de 14 px (`ColumnRing`) e o título em 14/20 500. À direita, em 12 `--text-3`:
    - "aberta abaixo", quando a gaveta mostra a tarefa (`useTaskDrawer`);
    - a marca e o nome do projeto, quando ele não é o do documento, com "(arquivado)" quando é o caso.
  - **Linha 2**, recuada 22 px: a meta do card do quadro (prazo ou atraso, checklist, até 3 etiquetas e "+n") e, à direita, a coluna em 12 `--text-3`, ou "Concluída".
- **Estados:**

  | Estado | Tratamento |
  | --- | --- |
  | Hover | borda `--line-strong` |
  | Nó selecionado (setas) | anel de 2 px `--accent` com afastamento de 2 |
  | Aberta | `--selected`, borda `--accent-35` e "aberta abaixo" |
  | Concluída | título `--text-2` e anel `--ok` |

- **`aria-label`:** "Tarefa: Gerar token pessoal no Perfil, Em andamento, aberta abaixo".
- **Ao vivo:** mudar coluna, prazo, etiquetas, título ou checklist pela gaveta muda o card na hora (invalidação do resolver, decisão 11).

**Desenho incorporado** (`blocks/DrawingEmbed.tsx`):

- **Figura:** um link (`<a>`) para a página do desenho, de modo que o clique do meio e ⌘-clique abrem outra aba.
  - **Moldura:** raio 8, borda `--line`, fundo `--bg`, padding 12, até 380 px de altura.
  - **Imagem:** a prévia com `object-fit: contain`, e o filtro de inversão no tema escuro (decisão 4).
- **Legenda:** 12/16 `--text-3`, 8 px abaixo: "Figura 2 — Navegação com projeto no centro", com "· <projeto>" quando o desenho é de outro projeto. "Abrir ↗" em `--accent` aparece no hover e no foco.
  - A numeração vem da ordem dos `drawingEmbed` no documento (`figureNumbers`, puro) e muda ao reordenar.
- **`aria-label`:** "Figura 2: Navegação com projeto no centro. Versão atual, somente leitura. Abrir no editor".
- **Estados:**

  | Estado | Tratamento |
  | --- | --- |
  | Prévia atual | a imagem |
  | Defasada ou ausente | a imagem antiga, se houver, com "Atualizando a imagem…" em 12 `--text-3`, enquanto o documento gera a nova (`use-embed-preview.ts`, uma de cada vez). Ao terminar, o resolver é lido de novo e a imagem troca |
  | Cena vazia | moldura de 120 px com "Desenho vazio" em `--text-3` |
  | Cena grande demais para a prévia | "Imagem indisponível. Abra o desenho para ver." |

**Indisponível** (`blocks/UnavailableEmbed.tsx`):

- **Caixa:** borda tracejada `--line-strong`, raio 8, sem fundo, altura mínima de 44 px, padding 6 6 6 12.
- **Conteúdo:** o ícone `Ban` de 16 px em `--icon`, o texto em 13/20 `--text-2` e as ações em botões fantasma de 24 px.

| Situação | Texto | Ações |
| --- | --- | --- |
| Tarefa na lixeira | "Na lixeira: Esboçar tela de boas-vindas" | [Restaurar] [Remover] |
| Desenho na lixeira | "Na lixeira: Fluxo do autosave" | [Restaurar] [Remover] |
| Tarefa excluída ou inexistente | "Esta tarefa foi excluída." | [Remover] |
| Desenho excluído ou inexistente | "Este desenho foi excluído." | [Remover] |

- **Restaurar:** devolve o item ao projeto dele, e o bloco volta a ser o card ou a figura, com o toast "“X” restaurado." e "Abrir".
- **Remover:** segue a decisão 10.
- **Projeto arquivado:** nenhuma das duas ações aparece.

**Marcador de origem** (`origin-markers.ts`, visual.md e refino §7):

- **Botão** inline de 18 px, raio 4, `vertical-align: -3px`, 4 px depois do trecho, com o anel da coluna da tarefa em 12 px no `--accent` (o check, quando concluída).
  - **Dica:** "Originou: Gerar token pessoal no Perfil · Em andamento".
  - **`aria-label`:** "Tarefa originada aqui: Gerar token pessoal no Perfil, Em andamento. Abrir".
- **Hover e foco:** fundo `--selected`, e o trecho do bloco ganha um sublinhado pontilhado de 1 px em `--accent`, com afastamento de 3 px. O trecho nunca ganha fundo.
- **Clique:** abre a gaveta.
- **Vários marcadores:** várias tarefas do mesmo trecho mostram marcadores lado a lado.
- **Onde fica:** segue a decisão 8.

**Criar tarefa de um trecho:**

- **Gaveta:** o modo novo ganha a caixa "Incorporar no documento", marcada por padrão, só quando o documento de origem está aberto nesta aba (decisão 15).
- **Ao criar:** o card entra logo depois do bloco de origem, e o toast diz "Tarefa criada. O card entrou abaixo do parágrafo.".
- **Documento fechado:** "Tarefa criada em A fazer · Tinyfold.", sem o card.

**Painel "Tarefas":** conforme a [pergunta 2](#perguntas-para-o-usuário).

### Página do desenho

- **Barra:**
  - à esquerda, o rótulo da pasta;
  - à direita, o salvamento como no documento;
  - **"Exportar ▾"**, botão secundário com `Download` e um menu: "PNG" ("Imagem com o conteúdo atual") e ".excalidraw editável" ("Mesmo com salvamento pendente");
  - o ⋯: Importar .excalidraw ("Cria outro desenho"), Fixar ou Desafixar, Mover para pasta…, Mover para projeto… e Mover para a lixeira.
- **Faixas fixas** no espaço `bands`.
- **Título** 30/36 600 editável sobre a moldura, com padding 28 32 16. A moldura tem raio 8, borda `--line`, fundo `--bg` e margem 0 32 16, como hoje.
- **O Excalidraw** continua no tema do aplicativo (etapa 08), e o menu principal dele continua com importar e exportar.
- **Prévia:** sem mudança, inclusive a geração depois de cada salvamento que muda a cena.

### Celular

O fallback continua funcional:

- **Incorporados:** ocupam a largura toda. Tocar no card abre a gaveta, que cobre a página (etapa 10); tocar na figura abre o desenho.
- **Ações:** Restaurar e Remover ficam sempre visíveis.
- **Marcador:** tem 18 px, abaixo do alvo de toque ideal, e fica como diferença aceita; o painel "Tarefas" ou o ⌘K levam às mesmas tarefas.
- **Barra:** abaixo de 720 px, as ações da barra entram no topo, como na etapa 08, e o rótulo da pasta não aparece (etapa 09, decisão 16).

## Teclado e Esc

| Atalho | Ação | Etapa 11 |
| --- | --- | --- |
| ⌘⌥T (Ctrl+Alt+T) | Criar tarefa a partir da seleção, no editor do documento | Novo. Vale dentro do editor, que é editável; fora dele, numa página de documento, avisa "Selecione um trecho do documento primeiro."; no Excalidraw e em outras páginas, nada |
| `/` no editor | Menu de blocos, com "Incorporar" | Muda |
| ↑ ↓ no editor | Chegam a um incorporado como seleção de nó | Novo |
| ↵ num incorporado selecionado | Card: abre a gaveta. Figura: abre o desenho. Indisponível: nada | Novo |
| ⌫, Delete num incorporado selecionado | Remove o bloco, como edição. O ⌘Z do editor o devolve | Novo |
| ⌘Z | No editor, o desfazer do BlockNote; fora de campos, o toast na tela (`undoKeyAction`) | Sem mudança na regra |
| Esc | Seletor de incorporado: fecha e devolve o cursor ao bloco. Editor: sai do campo (etapa 08). Gaveta: a camada da etapa 10 | Muda |
| Os demais | Como nas etapas 08 a 10 | — |

**Guardas:**

- **Teclas do card e da figura:** o ↵ e o ⌫ são tratados por uma extensão do editor (`embed-keys.ts`) só com a seleção de nó num incorporado. Nunca num campo e nunca com um menu do BlockNote aberto.
- **Campos do seletor:** o campo de busca toma as próprias teclas (setas, Home, End, espaço), como os campos das etapas 09 e 10.
- **⌘⌥T:** entra como comando da página (`PageCommands.createTask`), chamado pelo ouvinte global, sem ouvinte de módulo.
- **Foco por referência:** depois de inserir, remover, restaurar ou desfazer, o foco vai pela API do editor (seleção do bloco ou do texto seguinte) ou pela referência guardada, nunca por seletor CSS.
- **Os E2E de teclado** digitam com teclas reais, inclusive o `/tarefa`, o filtro do seletor e o título, nunca com `fill()`.

## Organização do código

### Backend

```text
src/workspace/domain/
  embeds.ts                  EMBED_TYPES, EMBED_LIMITS, embedIds(conteúdo), figureNumbers(conteúdo)
  document.ts                opção embeds em readDocumentContent; texto, lead e excerptPresent sem eles
  markdown.ts, markdown-embeds.ts   os incorporados no serializador (EmbedResolver), com o escape do texto do link
  task-source.ts             excerptEnd(textoDoBloco, trecho)
src/workspace/application/
  embeds/                    resolve-embeds.ts, ports.ts (EmbedReader), index.ts
  schemas/embeds.ts          ResolveEmbedsInput
  reading/read-document.ts   resolve os incorporados na mesma leitura
  canvas-previews.ts         readCanvasPreviewImage(id), para a rota
src/workspace/infra/
  reader/embeds.ts           o SQL dos estados, para o RPC e o MCP
  mcp/read-document.ts       a descrição; format.ts sem mudança no cabeçalho
  operations/embeds.ts
src/server/
  files/canvas-preview-route.ts   GET /arquivos/desenhos/:id/previa.png, antes do fallback da SPA
scripts/
  seed-sample.ts, sample-scenes.ts   cenas normalizadas e os incorporados do brief
```

**Entradas públicas** (`domain/index.ts`): `embedIds`, `figureNumbers`, `excerptEnd`, `EMBED_LIMITS` e o tipo `EmbedResolver`.

### Web

```text
src/web/editor/
  schema.ts                  blocos base, descriptionSchema (sem incorporados) e documentSchema (com eles)
  use-block-editor.ts        recebe o esquema
  BlockEditor.tsx            recebe os itens extras do menu / (insert-menu.ts)
  blocks/
    embed-specs.ts           createReactBlockSpec de taskEmbed e drawingEmbed (content: 'none')
    TaskEmbed.tsx, DrawingEmbed.tsx, UnavailableEmbed.tsx, embeds.css
    embeds-context.tsx       provedor com os estados, as ações e a gaveta, por documento (sem estado de módulo)
    embed-view.ts            estado do resolver → o que o bloco mostra (puro)
    embed-keys.ts            ↵ e ⌫ na seleção de nó
  insert-menu.ts             o grupo "Incorporar" do menu /
  EmbedPicker.tsx            o seletor
  origin-markers.ts          o plugin de decoração e o widget do marcador
src/web/pages/document/
  DocumentPage.tsx, DocumentEditor.tsx (composição), DocumentHeader.tsx, DocumentMenu.tsx,
  DocumentBody.tsx (título, fio e editor), DocumentTasks.tsx (o painel, conforme a pergunta 2),
  use-document-embeds.ts (IDs do editor → resolver), use-embed-preview.ts, use-embed-actions.ts
  (restaurar, remover e desfazer), document-markdown.ts (exportação pelo domínio), document.css
src/web/pages/drawing/        DrawingHeader.tsx, ExportMenu.tsx
src/web/components/item-page/ SaveState.tsx com "Salvo · editado hoje"; edited-phrase.ts (puro)
src/web/shell/                PageFrame com bands; keyboard com o ⌘⌥T; command-palette com "Incorporar tarefa…",
                              "Incorporar desenho…" e "Criar tarefa da seleção" em "Neste item"
src/web/router/               /tarefas/$taskId
src/web/lib/markdown.ts       fica só a importação (importMarkdownWithMath); a exportação vai ao domínio
src/web/vite.config.ts        /arquivos no proxy
```

**Arquivos que crescem e são divididos:**

| Arquivo (linhas em `main`) | Divisão |
| --- | --- |
| `pages/document/DocumentEditor.tsx` (206) | A barra vai a `DocumentHeader.tsx` e `DocumentMenu.tsx`; o título, o fio e o editor, a `DocumentBody.tsx`; os incorporados, aos hooks `use-document-*` e `use-embed-*`. Fica a composição |
| `editor/schema.ts` (64) | Os blocos base e os dois esquemas; as especificações dos incorporados vão para `editor/blocks/embed-specs.ts` |
| `editor/BlockEditor.tsx` (88) | O grupo "Incorporar" vai para `insert-menu.ts` |
| `lib/markdown.ts` (377) | A exportação sai para o domínio, e o arquivo fica com a importação |
| `pages/document/document.css` (180) | Os incorporados e o marcador vão para `editor/blocks/embeds.css` |
| `pages/drawing/CanvasEditor.tsx` (191) | A barra vai a `DrawingHeader.tsx` e `ExportMenu.tsx` |
| `shell/keyboard/use-shortcuts.ts` (129) | O ⌘⌥T entra como comando da página. Se passar de 140 linhas, as teclas com modificador vão para `modifier-keys.ts` |

## Testes

### Unidade (`check`)

- **Domínio:**
  - `embeds.test.ts`: IDs, limite e numeração das figuras;
  - `document.test.ts`: os blocos com a opção, recusados sem ela, `props` estritas, sem conteúdo nem filhos, 201 incorporados, e o texto, o lead e `excerptPresent` sem eles;
  - `markdown.test.ts`: as formas do MCP e do arquivo, títulos com colchetes e barras, e o indisponível;
  - `task-source.test.ts`: `excerptEnd` com formatação, espaços colapsados, trecho repetido e trecho ausente.
- **Web:**
  - `markdown-roundtrip.test.ts`: exportar um documento com incorporados e importar de volta dá parágrafos com os links, e o resto como na etapa 07;
  - `editor/schema.test.ts`, com o BlockNote real (`testing/blocknote-editor.ts`): o esquema do documento aceita os incorporados, o da descrição os descarta ao colar;
  - `origin-markers.test.ts`, com o editor real: o marcador no fim do trecho, no fim do bloco com o trecho mudado, ausente sem o bloco, vários no mesmo trecho;
  - `insert-menu.test.ts`: o grupo só no documento;
  - `embed-view.test.ts`: os estados, o projeto de outro, "aberta abaixo", o arquivado;
  - `edited-phrase.test.ts`: hoje, ontem, outra data;
  - `keyboard.test.ts`: ⌘⌥T no editor, no campo e no Excalidraw;
  - `use-embed-actions.test.ts`: o Desfazer de Remover depois do ⌘Z do editor não duplica o bloco.
- **Exemplo:** `scripts/seed-sample.test.ts` passa os documentos do exemplo, com os incorporados, pelo BlockNote real com o esquema do documento, e eles saem iguais.

### Banco (`test:db`)

- **`application/embeds.db.test.ts`:** os três estados para tarefas e desenhos; tarefa movida de projeto e de coluna; projeto arquivado; desenho numa pasta excluída; prévia atual, defasada e ausente; cena vazia; 201 IDs recusados; IDs repetidos; nenhum registro de pedido.
- **`workspace.db.test.ts`:** salvar e criar com incorporados; IDs inválidos e 201 recusados.
- **`tasks.db.test.ts`:** `saveTaskText` e `createTask` recusam incorporados na descrição.
- **MCP:**
  - `documents.db.test.ts`: as formas de link, o indisponível para lixeira, excluído e inexistente, a descrição, e o cursor recusado quando uma tarefa incorporada muda de título entre as páginas;
  - `tools.db.test.ts`: o teto da seção MCP.
- **Servidor:**
  - `src/server/files.db.test.ts` (novo):
    - 401 sem sessão, inclusive com um bearer do MCP;
    - 404 para desenho na lixeira, excluído, inexistente e sem prévia;
    - 400 para ID inválido;
    - 200 com `image/png`, `ETag`, `nosniff` e `private, no-cache`;
    - 304 com `If-None-Match`;
    - a rota antes do fallback da SPA.
  - `mcp.db.test.ts`: `read_document` com incorporados.
- **Backup:** `projects-backup.db.test.ts` com um documento com incorporados, restaurado igual.

### Chrome (`build` e `e2e`, desktop e Pixel 7)

**Ajudantes:** `e2e/support/document.ts` (novo), com `typeInEditor`, `slash(page, 'tarefa')`, `embedCard`, `embedFigure` e `selectEmbed`, todos com teclas reais.

| Spec | Cenários |
| --- | --- |
| `embeds.spec.ts` (novo) | **Inserir:** `/tarefa` digitado; incorporar uma existente pelo filtro; "Nova tarefa…" pela gaveta com o card no lugar; `/desenho` com um existente e "Novo desenho".<br>**Card ao vivo:** coluna, prazo, etiquetas e checklist mudados na gaveta; "aberta abaixo"; outro projeto (conforme a pergunta 1).<br>**Teclado:** ↵ na seleção de nó abre; ⌫ remove e o ⌘Z do editor devolve.<br>**Indisponíveis:** na lixeira com Restaurar; excluído com Remover e Desfazer do toast; projeto arquivado sem ações.<br>**Figuras:** a numeração muda ao reordenar.<br>Os resultados são conferidos no servidor (`getDocument`, `getTask`) |
| `drawing-embed.spec.ts` (novo) | A imagem pela rota (resposta 200, depois 304); o filtro no escuro; prévia defasada (o desenho editado em outra página) regenerada ao abrir o documento; desenho vazio; clique do meio abre outra aba |
| `origin-marker.spec.ts` (novo) | O marcador depois do trecho, com a dica e o nome; o sublinhado no hover; o clique abre a gaveta; a tarefa na lixeira tira o marcador; o trecho editado leva o marcador ao fim do bloco; criar de uma seleção com ⌘⌥T e "Incorporar no documento" põe o card abaixo; com o documento fechado, sem o card |
| `document-page.spec.ts` (novo) | A barra ("Salvo · editado hoje", ⋯ na ordem); as faixas fixas ao rolar; o painel conforme a pergunta 2; exportar `.md` com os links (conteúdo do arquivo baixado) e importar de volta; `/tarefas/<id>` redireciona |
| `drawing-page.spec.ts` (novo) | "Exportar ▾" baixa PNG e `.excalidraw`; a barra e o título |
| `seed-sample.spec.ts` (novo, do backend) | Abrir cada documento e desenho do exemplo não envia `saveDocument` nem `saveCanvas`, e a versão continua 1 |
| `mcp.spec.ts` | `read_document` com os links do que a interface incorporou e `read_task` com o ID de um deles |
| `narrow.spec.ts` | Incorporados no Pixel 7: tocar no card abre a gaveta, tocar na figura abre o desenho, Restaurar visível |

**Capturas** nos dois temas, em 1440 e 1280, e no celular, em `docs/screens/`, com o exemplo:

- documento com o card, a figura e o indisponível;
- o marcador com o sublinhado;
- o menu `/` com "Incorporar";
- o seletor;
- a página do desenho com "Exportar ▾".

Elas substituem `documento-*` e `desenho-*`.

## Validação no Chrome real contra o protótipo

Usa bancos temporários e as portas 3521 e 5321. As etapas 07 a 10 usaram de 3471/5271 a 3501/5301, e o E2E usa 5171. O banco `data/tinyfold.sqlite` não é aberto, e as portas 3370 e 5170 não são usadas.

```sh
TF_TMP="$(mktemp -d -t tinyfold-11)"
export OWNER_PASSWORD='validacao-documento-11' PORT=3521 WEB_PORT=5321 \
  APP_ORIGIN=http://localhost:5321 COOKIE_SECURE=false BACKUP_DIR="$TF_TMP/backups"
# 1. Atualização: um banco criado pelo código da etapa 10, numa worktree na pasta de rascunho
git worktree add "$SCRATCH/tf-10" 7624a8f
(cd "$SCRATCH/tf-10" && mise exec -- pnpm install --frozen-lockfile \
  && DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm seed:sample)
DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm dev   # sem migração; conferir e parar
# 2. Exemplo da etapa 11
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm seed:sample
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm dev
# conferir no log: "Banco: <TF_TMP>/…sqlite" e "Tinyfold em http://127.0.0.1:3521"
```

`$SCRATCH` é a pasta de rascunho da sessão, nunca `.claude/worktrees/`. A worktree sai ao fim.

**Exemplo** (brief.md): "Visão do produto" ganha:

- a tarefa incorporada "Gerar token pessoal no Perfil";
- o desenho incorporado "Navegação com projeto no centro";
- a tarefa "Revisar textos do onboarding", que está na lixeira, incorporada;
- "MCP somente leitura", com a origem de "Gerar token pessoal no Perfil" no trecho do token.

Tudo isso é gravado no formato normalizado (decisão 16).

**Roteiro:**

1. **Atualização:** no banco da etapa 10, sem migração, os documentos abrem no esquema novo e o MCP lê como antes. Incorporar uma tarefa e um desenho num documento antigo funciona.
   - Os desenhos do exemplo antigo, gravados sem normalizar, ainda se salvam uma vez na primeira abertura: é o comportamento esperado de dados antigos.
   - Os do exemplo novo não se salvam: conferir que a versão continua 1 depois de abrir.
2. **Lado a lado no Google Chrome,** com o protótipo servido como UTF-8 de `127.0.0.1:5299`. Em 1440×900 e 1280×800, nos dois temas, comparar:
   - **Coluna:** largura, título, fio e corpo 15/24.
   - **Incorporados:** card (padding, raio, linhas, "aberta abaixo"), figura (moldura, legenda, "Abrir ↗" no hover), indisponível (tracejado, botões de 24 px) e marcador (18 px, sublinhado).
   - **Barras:** salvamento e ⋯ do documento; "Exportar ▾" do desenho.

   As medidas usam `getBoundingClientRect` e `getComputedStyle`.
3. **Teclado:** a tabela de [Teclado e Esc](#teclado-e-esc), inclusive o `/` com o seletor, a seleção de nó e o ⌘⌥T.
4. **MCP:** `read_document` da "Visão do produto" pelo `/mcp`, com um token criado no Perfil, traz os dois links e `[Item indisponível]`. `read_task` e `read_drawing` aceitam os IDs.
5. **Larguras:** 1024 px e Pixel 7.
6. **Registro:** as diferenças aceitas vão para `validacao.md` (por exemplo o conflito sem "Comparar" e o marcador sem Tab), e as capturas, para `docs/screens/`.
7. **Limpeza:** parar o `dev` e o servidor do protótipo, remover a worktree e rodar `rm -rf "$TF_TMP"`.

## Critérios de pronto

- [ ] `check`, `test:db`, `build` e `e2e` (desktop e Pixel 7) verdes depois de cada entrega.
- [ ] Os dois blocos validados no domínio, só no documento, com limite e sem migração.
- [ ] O card e a figura vivos, somente leitura, com os estados indisponíveis, Restaurar, Remover e Desfazer, sem o documento quebrar em caso nenhum.
- [ ] A figura na versão atual, com a prévia regenerada quando defasada, e a rota da prévia com sessão, `ETag` e 404 nos casos certos.
- [ ] O marcador de origem no fim do trecho, que abre a gaveta e some com a tarefa na lixeira.
- [ ] Inserir pelo `/` e ao criar de um trecho, com o teclado da tabela e o foco por referência.
- [ ] Markdown exportado pelo serializador do domínio, com os links, e importado de volta. `/tarefas/$id` redireciona.
- [ ] MCP com os incorporados como referências, dentro de 45.000 caracteres.
- [ ] Documento e desenho no Sumário, com as faixas fixas e "Exportar ▾".
- [ ] O exemplo sem salvamento na primeira abertura, documentos e desenhos.
- [ ] Os arquivos divididos conforme a tabela.
- [ ] Validação no Chrome real contra o protótipo e ensaio de atualização registrados, com bancos temporários e as portas 3521 e 5321.
- [ ] Documentação atualizada conforme a seção final.

## Divisão do trabalho

Dois subagentes em worktrees próprias na pasta de rascunho da sessão (nunca em `.claude/worktrees/`), nos ramos `feat/documento-backend` e `feat/documento-web`, a partir de `feat/documento`, com a integração feita em `feat/documento` em cada ponto marcado, como na etapa 10. Cada entrega é um commit e deixa os quatro comandos verdes no próprio ramo.

**Backend.** Dono de:

- `src/workspace/**` e `src/server/**`;
- `scripts/seed-sample.ts`, `scripts/sample-scenes.ts` e `scripts/seed-sample.test.ts`;
- em B4, só `e2e/seed-sample.spec.ts`.

| Ordem | Entrega (commit) |
| --- | --- |
| B1 | `feat(workspace): accept task and drawing embeds in documents`. Os blocos e a opção no validador, o limite, o texto sem eles, `excerptEnd`, `figureNumbers`, o serializador com o resolvedor e os testes do domínio |
| B2 | `feat(workspace): resolve embeds for the editor and the MCP`. `resolveEmbeds`, o SQL dos estados, `read_document` com as referências e a descrição, e o teste do teto. **Ponto de integração 1.** **Revisão de dados cedo:** um revisor somente leitura examina B1 e B2 (validador, estados, serializador, páginas do MCP) antes de a web construir em cima |
| B3 | `feat(server): serve drawing previews to documents`. A rota, `readCanvasPreviewImage` e `files.db.test.ts`. **Ponto de integração 2** |
| B4 | `fix(scripts): seed scenes and embeds as the editors save them`. As cenas normalizadas (a comparação no Chrome feita uma vez), os incorporados e a origem do exemplo, `seed-sample.test.ts` e `e2e/seed-sample.spec.ts` |

**Web.** Dono de:

- `src/web/**`, `e2e/**` (exceto `seed-sample.spec.ts`) e `docs/screens/*`;
- a documentação final.

| Ordem | Entrega (commit) | Pode começar |
| --- | --- | --- |
| W1 | `refactor(web): restyle the document and drawing pages`. `PageFrame` com `bands`, `DocumentHeader`, `DocumentMenu` com "Criar tarefa" e ⌘⌥T, `DocumentBody`, "Salvo · editado hoje", o rodapé removido, `DrawingHeader` com "Exportar ▾", `/tarefas/$taskId`, e o painel "Tarefas" conforme a pergunta 2 | Junto com B1 |
| W2 | `feat(web): embed tasks and drawings in documents`. Os dois esquemas, as especificações dos blocos, o card, o indisponível, Restaurar, Remover e Desfazer, o menu `/` e o seletor, `embed-keys.ts`, o contexto dos incorporados e o resolver, e a figura com a imagem antiga ou o estado de carregamento | Depois do ponto 1 |
| W3 | `feat(web): show current drawing previews in documents`. A imagem pela rota, o filtro do escuro, a regeneração da prévia defasada, os estados vazio e grande demais, e o proxy do Vite | Depois do ponto 2 |
| W4 | `feat(web): mark task origins and embed new tasks from a selection`. `origin-markers.ts`, "Incorporar no documento" com `insertEmbedAfter`, e o ⌘K com "Incorporar tarefa…", "Incorporar desenho…" e "Criar tarefa da seleção" | Depois de W2 |
| W5 | `feat(web): export embeds to Markdown with the domain serializer`. `document-markdown.ts`, a importação de volta, e `lib/markdown.ts` só com a importação | Depois do ponto 1 (pode correr com W3) |
| W6 | `test(e2e): cover embeds, origin markers and the new pages`, com as capturas | Depois de W5 e B4 |
| W7 | A validação no Chrome real, com o ensaio de atualização, e `docs: record stage 11` | Por último |

**Revisão adversarial cruzada** (três revisores somente leitura, em paralelo, com reteste do que for corrigido):

| Revisor | Foco |
| --- | --- |
| Dados e MCP | O validador (opção só no documento, `props` estritas, limite, rascunhos); os estados do resolver em cada caso de lixeira, exclusão, projeto e pasta; o serializador (escape do texto do link, indisponível, ida e volta); as páginas e o cursor do `read_document` com os incorporados; o teto; o exemplo normalizado |
| Editor: teclado, acessibilidade e foco | A seleção de nó, o ↵ e o ⌫; o Desfazer de Remover junto do ⌘Z do editor; o menu `/` e o seletor com teclas reais; o marcador (nome, dica, sublinhado, toque); "aberta abaixo" com a gaveta; o Esc em camadas; o foco depois de inserir, remover e restaurar; dois editores BlockNote na tela (documento e descrição); as faixas fixas; o celular |
| Segurança e qualidade | A rota da prévia (sessão, bearer ignorado, 404, cabeçalhos, cache, ID inválido); IDs forjados em blocos; títulos de outros projetos e da lixeira no resolver; o Excalidraw carregado no documento só quando preciso; ouvintes de módulo; tamanho dos arquivos e divisões; duplicação entre o card do quadro e o incorporado; regras do dependency-cruiser; qualidade dos testes |

## Riscos

- **Blocos personalizados do BlockNote 0.56:** os nós React sem conteúdo podem ter peculiaridades de seleção, de arrastar bloco, de colar e de desfazer.
  - Mitigação: os testes com o editor real, a seleção de nó coberta no E2E e a revisão do editor.
  - Com 200 incorporados, o resolver é uma consulta só, e cada bloco lê do contexto.
- **Aba antiga durante a implantação:** o BlockNote da etapa 10 não conhece os blocos novos, e a página do documento falha até recarregar (decisão 3). Mitigação: a recomendação em [operação](../implantacao.md) de recarregar as abas depois de atualizar, e a página de erro em português que oferece recarregar.
- **Excalidraw no documento:** regenerar uma prévia carrega o módulo de exportação, que é pesado. Mitigação: só com prévia defasada, uma de cada vez, com o navegador ocioso, pelo `CanvasPreviewUploader` que já existe.
- **Cursor do MCP mais frágil:** uma mudança numa tarefa incorporada recusa o cursor (decisão 13), com a mensagem que manda ler de novo.
- **Marcador em texto formatado:** o trecho atravessa marcas (negrito, links), e achar o fim dele no ProseMirror depende do texto do bloco. Mitigação: `excerptEnd` puro e testado, e o fim do bloco como plano B.
- **Normalização das cenas:** depende das medidas de fonte do Excalidraw, que podem mudar com uma versão nova dele. Mitigação: o E2E `seed-sample.spec.ts` acusa a regressão.
- **Mudança na exportação Markdown:** passar ao serializador do domínio pode mudar detalhes do `.md` exportado, como escapes e listas. Mitigação: o teste de ida e volta da etapa 07, que já declara as perdas, e a conferência do arquivo baixado no E2E.

## Documentação ao concluir

| Documento | Atualização |
| --- | --- |
| `arquitetura.md` | Incorporados no JSON resolvidos na leitura, sem índice reverso; a rota da prévia; o marcador como decoração; a exportação pelo serializador do domínio; a seção MCP |
| `produto.md` | Incorporar tarefas e desenhos, indisponíveis e o Markdown deixam de ser planejados |
| `decisoes.md` | As decisões técnicas desta página e as respostas do usuário |
| `interface/README.md` e `identidade-visual.md` | O Sumário completo: documento e desenho implementados |
| `implantacao.md` | "Atualizar para a etapa 11": sem migração, recarregar as abas abertas e a rota `/arquivos` no proxy |
| `validacao.md` | Comandos executados, cenários, o ensaio de atualização, a comparação com o protótipo e as diferenças aceitas. Fecha a pendência dos desenhos do exemplo |
| `README.md` | "O que funciona" e as capturas |
| `src/workspace/README.md` | Regras dos incorporados, do resolver e do Markdown |
| `etapas/README.md` e esta página | Estado, critérios marcados, Resultado e Desvios |

## Perguntas para o usuário

1. **Incorporar itens de outro projeto.** O protótipo aprovado oferece, no seletor, as tarefas e os desenhos de todos os projetos ativos, com os do documento primeiro e o projeto indicado no card. O escopo inicial propunha só os do projeto do documento. Em qualquer opção, um item incorporado que depois muda de projeto continua aparecendo, com o projeto no card.
   - **A — Todos os projetos ativos, com os do documento primeiro, como no protótipo (recomendado).** Um documento do Geral pode mostrar uma tarefa do Tinyfold; o card diz de onde ela é.
   - **B — Só os do projeto do documento.** Cada documento fala só do próprio projeto; para ligar outro, é preciso mover o item antes.
2. **O painel "Tarefas" do documento.** Hoje o botão "Tarefas · n" abre uma coluna lateral com as tarefas que nasceram ali, e as concluídas recolhidas. O protótipo não tem esse painel: os marcadores de origem e os cards fazem esse papel. O marcador, porém, não é alcançável pelo Tab (decisão 9).
   - **A — Manter o botão "Tarefas · n" na barra, abrindo um popover com a mesma lista, em vez da coluna lateral (recomendado).** A página fica com uma coluna só, e o teclado continua chegando a todas as tarefas nascidas ali.
   - **B — Tirar o painel, como no protótipo.** As tarefas nascidas ali ficam nos marcadores e nos cards; pelo teclado, só pela busca do ⌘K e pelo Quadro.
   - **C — Manter a coluna lateral como hoje.** O documento ganha uma segunda coluna quando ela está aberta.
