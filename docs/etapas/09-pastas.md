# Etapa 09 — Pastas

**Estado:** detalhada em 2026-10-31, a partir do escopo inicial do mesmo dia. As seções "Resultado" e "Desvios do plano" entram ao concluir, como na [etapa 08](08-fundacao.md).

## Objetivo

Agrupar documentos e desenhos do mesmo assunto em pastas mistas de um único nível dentro do projeto, conforme [pastas.md](../interface/pastas.md). Pasta não é página: não tem conteúdo, propriedades nem subpastas, e tarefas não entram em pastas.

A lateral troca as seções Documentos e Desenhos pela árvore "Itens", feita com o `Tree` do React Aria. A pasta passa a aparecer no cabeçalho do item, no ⌘K, no Índice, na Visão geral, na Lixeira e no MCP. Excluir uma pasta tem "Desfazer", e o ⌘Z passa a desfazer a ação do toast na tela.

## Referências e precedência

| Assunto | Fonte |
| --- | --- |
| Pastas na lateral e no aplicativo, ações, teclado e dados de exemplo | [pastas.md](../interface/pastas.md) |
| O resto da lateral: cabeçalho, Buscar, navegação, rodapé e faixa | [sidebar.md](../interface/sidebar.md), variante A |
| Tokens, componentes e movimento | [visual.md](../interface/visual.md) |
| Toasts | [refino.md](../interface/refino.md) §1 (crítica 20) e visual.md, "Toasts e faixas" |
| Comportamento de referência | `docs/interface/prototipo/sumario.html`, versão "Pastas": `treeData`, `folderRow`, `treeKeys`, `treeDragOver`, `moveFolderPicker`, `deleteFolder`, `indexHTML`, `trashHTML` e `cmdResults` |
| Contratos e padrões existentes | [Etapa 08](08-fundacao.md) (`moveItem`, fixados, Lixeira, respostas compactas) e [etapa 07](07-mcp.md) (limites e testes do MCP) |

pastas.md é a especificação mais recente e vale sobre sidebar.md, conforme [interface/README.md](../interface/README.md). Por isso a lateral passa de 248 para 256 px, com a coluna de chevron, e acaba a diferença aceita na etapa 08 (248 px, texto em x=40).

## Casos de uso

1. Criar uma pasta e dar o nome no próprio lugar: pelo "+" de Itens, pelo menu Novo (N), pelo ⌘K ou ao mover um item.
2. Renomear uma pasta (F2 ou duplo clique) e reordenar as pastas (arrastar ou ⌥↑/⌥↓).
3. Mover um documento ou desenho para uma pasta, para a raiz ou para outro projeto: arrastando, com M ou pelo rótulo do cabeçalho.
4. Excluir uma pasta levando os itens para a raiz, e desfazer pelo toast ou com ⌘Z.
5. Excluir uma pasta com os itens, que vão para a Lixeira, depois de confirmar.
6. Criar um documento ou desenho já dentro de uma pasta.
7. Percorrer só pelo teclado a árvore de um projeto de 55 itens, sem a lateral virar paredão.
8. Ver a pasta no cabeçalho do item, no ⌘K, no Índice (filtro e agrupamento), na Visão geral e na Lixeira.
9. Restaurar da Lixeira um item cuja pasta foi excluída e saber que ele voltou para a raiz.
10. Pelo Claude Code, ver as pastas de cada projeto e buscar dentro de uma pasta.

## Escopo

**Entra:**

- Tabela de pastas, `folder_id` em documentos e desenhos, gatilhos de consistência e a migração 006.
- Criar, renomear, reordenar, excluir (com ou sem os itens) e desfazer a exclusão.
- `moveItem` com pasta, fixados por escopo, criar e copiar dentro da pasta, Lixeira com a origem.
- A árvore Itens na lateral e na faixa recolhida, com arrastar e soltar e o teclado de pastas.md §4.
- "Mover para pasta…", o rótulo da pasta no cabeçalho e o menu Novo com a pasta.
- Pastas no ⌘K, no Índice, na Visão geral e na Lixeira.
- Desfazer com ⌘Z para o toast na tela.
- MCP: pastas em `list_projects`, filtro e campo em `search`, linha da pasta em `read_document` e `read_drawing`.
- `seed:sample` com as pastas de pastas.md §5 e a variante do projeto grande.

**Fica de fora:**

- Subpastas, cor e ícone de pasta, página de pasta (pastas.md §2 e §6) e tarefas em pastas.
- Pastas na Lixeira: uma pasta excluída não aparece lá. Só o Desfazer a traz de volta.
- Mover uma pasta para outro projeto.
- Ordem manual dos itens. Dentro de cada nível, vale a ordenação do projeto (Recentes, A–Z ou Criação).
- Desfazer das ações da etapa 08 que ainda não o têm, como mover para a lixeira e restaurar. Só ganham o ⌘Z os dois que já existem: o "Desfazer" de mover de projeto e o "Desarquivar" do toast de arquivar.
- Menu de contexto nas linhas de item. O ⇧F10 abre só o menu das pastas, e os itens têm P, M e o ⋯ da página.
- Arrastar por toque no celular.
- Ferramentas MCP novas e escrita pelo MCP.

## Decisões técnicas

As duas perguntas em aberto do escopo inicial estão resolvidas aqui, nas linhas 1 e 2. As escolhas de produto que o usuário fez estão no fim, em [Decisões do usuário](#decisões-do-usuário).

| # | Decisão | Motivo |
| --- | --- | --- |
| 1 | A ordenação de Itens (Recentes, A–Z, Criação) e as pastas abertas ficam no dispositivo, por projeto, em `tinyfold:<installationId>:sidebar` | É o que a etapa 08 já faz com a ordem e o estado das seções, e pastas.md pede o estado aberto "no dispositivo". Guardar no servidor exigiria escrita a cada clique e não resolveria nada que o uso pessoal peça |
| 2 | Desfazer a exclusão: exclusão lógica da pasta e restauração versionada (`restoreFolder`), com o inverso enviado pelo cliente a partir da resposta da exclusão. O ⌘Z é um desfazer genérico pequeno no cliente (`ToastProvider`), e não no `core` | Ver [Desfazer](#desfazer). O `undo.ts` do Orbis (`../orbis/src/core/infra/undo.ts`, que não está neste repositório) foi inspecionado. Ele exigiria tabela e migração no `core`, mudar a assinatura de `idempotentWrite` para todos os módulos, despachar do `core` para o workspace e criar um código de erro novo, tudo para duas ações. A etapa 10 segue o mesmo padrão em `deleteColumn` |
| 3 | Mudar de pasta não é edição: `version` e `updatedAt` ficam. Vale a última gravação, como em fixar e na ordem do seletor | Se mudar de pasta subisse a versão, arrastar na lateral criaria conflito no autosave de um editor aberto, inclusive em outro aparelho. A pasta não depende do conteúdo |
| 4 | `moveItem` ganha `folderId`, e `expectedVersion` passa a ser exigido só para mudar de projeto | Um procedimento só para dizer onde o item vive. Mudar de projeto continua como na etapa 08, com versão e passando pelo autosave. Mudar de pasta não precisa ler o item antes, o que a etapa 08 aceitou como custo no mover de projeto |
| 5 | Fixados por escopo: até 8 na raiz e até 8 em cada pasta. Um item fixado que muda de pasta continua fixado se o destino tiver vaga; senão, perde o fixado e o toast avisa | Decisão do usuário ([1](#decisões-do-usuário)), conforme o escopo inicial, com o fixado "no topo da raiz ou da própria pasta". O protótipo conta 8 por projeto, e a diferença fica registrada. Manter o fixado quando cabe segue o protótipo, que não desafixa ao mover entre pastas |
| 6 | Uma pasta excluída continua no banco (`deleted_at`) e nunca é listada. A linha nomeia a origem dos itens na Lixeira e permite o Desfazer. Pastas não são apagadas de vez | É o que a Lixeira precisa para mostrar "Tinyfold › MCP" e para avisar ao restaurar. As linhas são poucas e pequenas |
| 7 | Nome único entre as pastas ativas do projeto, sem diferenciar caixa e acentos: coluna `name_key` com `searchText` do nome, sob um índice único parcial | Assim, "mcp" e "MCP" ou "Ações" e "acoes" não convivem. O SQLite não normaliza NFD, então a aplicação calcula a chave e o índice é a última barreira |
| 8 | Limites: nome de 1 a 100 caracteres, com os espaços colapsados, e até 200 pastas ativas por projeto. O MCP lista até 50 por projeto, com `folderCount` | O limite de 200 é técnico e ninguém o alcança no uso real. Ele limita a resposta da lateral e a renumeração das posições. Sem o corte de 50, uma resposta de `list_projects` com nomes pesados poderia passar de 45.000 caracteres num projeto só |
| 9 | Em projeto arquivado, as pastas são só leitura: o servidor recusa criar, renomear, reordenar, excluir, restaurar e mudar item de pasta | O protótipo esconde essas ações (`guardArchived`), e a etapa 08 já recusa criar em projeto arquivado |
| 10 | Gatilhos garantem as regras no banco: um item vivo só fica numa pasta ativa do próprio projeto, uma pasta não muda de projeto e não é excluída com itens vivos dentro | É a mesma proteção da etapa 08 para o projeto obrigatório. Um caso de uso que esqueça uma regra falha alto, em vez de deixar um item numa pasta invisível |
| 11 | O ⌘Z desfaz só fora de campos editáveis, do editor de documento, do Excalidraw e de menus e diálogos abertos. Lá dentro, o desfazer nativo continua | O protótipo também desfaz dentro do texto quando a ação é mais recente que a digitação. Tomar o desfazer do texto arriscaria perder uma edição, e depois de agir na lateral ou no toast o foco não está no texto |
| 12 | A árvore é o `Tree` do React Aria 1.22.1, que expõe `role="treegrid"`, linhas com `aria-level` e `aria-expanded`. O typeahead fica, mas N, P, M, G, `/` e `?` (e qualquer tecla com um acorde G pendente) vão para os atalhos | O React Aria implementa o padrão treegrid do WAI-ARIA, e o protótipo usa `tree`. Os atalhos ganham do typeahead como no protótipo (`treeKeys`) e como no Índice da etapa 08 |
| 13 | Uma pasta fechada abre depois de 800 ms com um item arrastado sobre ela, e não em 600 ms | 800 ms é o tempo fixo do `useDrop` do React Aria (`DROP_ACTIVATE_TIMEOUT`). Reimplementar o arrastar só por 200 ms não compensa. A diferença fica registrada na validação |
| 14 | Soltar entre linhas só escolhe o nível de destino (raiz ou pasta). O item entra no lugar da ordenação | Os itens não têm ordem manual (pastas.md §1). O indicador de inserção mostra o nível, como no protótipo |
| 15 | Cópias ("Salvar como cópia") e importações (`.md`, `.excalidraw`) feitas na página de um item vão para a pasta dele quando ficam no mesmo projeto. Quando vão para outro projeto, vão para a raiz | É o lugar do original. Sem isso, a cópia ficaria solta longe dele |
| 16 | Abaixo de 720 px, o rótulo da pasta não aparece no cabeçalho. O ⋯ tem "Mover para pasta…", que diz a pasta atual | A barra estreita já foi ajustada na etapa 08 para não passar das ações. O fallback de celular é funcional |
| 17 | "Excluir pasta e itens…" também ganha "Desfazer" no toast | O protótipo faz isso (`deleteFolderWithItems`), pastas.md não proíbe, e a restauração já cobre o caso |

## Dados

### Migração `src/workspace/infra/migrations/006_folders.sql`

A última migração do workspace em `main` é a 005 (`005_projects_required.sql`), então esta é a 006. A etapa 10 continua na 007. O `core` não ganha migração.

Roda na transação do executor, como as anteriores. **Não muda dados:**

- todos os itens começam na raiz (`folder_id` nulo);
- versões, datas, fixados e a revisão do quadro ficam como estão.

O roteiro é ensaiado sobre bases reais com 001 a 005 e `foreign_keys=ON`. Ao fim, `integrity_check` e `foreign_key_check` precisam ficar limpos.

1. **Pastas:**

   ```sql
   CREATE TABLE workspace_folders (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL REFERENCES workspace_projects(id),
     name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
     name_key TEXT NOT NULL CHECK (length(name_key) > 0),
     position INTEGER NOT NULL CHECK (position >= 0),
     version INTEGER NOT NULL CHECK (version > 0),
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     deleted_at TEXT
   );
   CREATE UNIQUE INDEX workspace_folders_active_name
     ON workspace_folders(project_id, name_key) WHERE deleted_at IS NULL;
   CREATE INDEX workspace_folders_project ON workspace_folders(project_id, deleted_at, position);
   ```

2. **Itens:** `folder_id TEXT REFERENCES workspace_folders(id)` em `workspace_documents` e `workspace_canvases`.
   - É anulável: nulo é a raiz.
   - O SQLite aceita a chave estrangeira em `ADD COLUMN` com padrão nulo.
   - Sem `ON DELETE`: pastas nunca são apagadas, e a chave recusa quem tentar.
   - Índices parciais `workspace_documents_folder` e `workspace_canvases_folder` em `(folder_id) WHERE folder_id IS NOT NULL`.

3. **Gatilhos:**

   | Gatilho | Recusa (`RAISE(ABORT, …)`) |
   | --- | --- |
   | `workspace_documents_folder_on_insert` e `workspace_canvases_folder_on_insert` (`BEFORE INSERT`, quando `folder_id` não é nulo) | Pasta inexistente, de outro projeto ou excluída |
   | `workspace_documents_folder_on_update` e `workspace_canvases_folder_on_update` (`BEFORE UPDATE OF folder_id, project_id, deleted_at`, quando `folder_id` não é nulo) | Pasta de outro projeto. E pasta excluída para um item vivo: um item na lixeira pode continuar apontando para a pasta excluída, mas restaurá-lo exige limpar `folder_id` no mesmo `UPDATE` |
   | `workspace_folders_project_fixed` (`BEFORE UPDATE OF project_id`) | Qualquer mudança de projeto da pasta |
   | `workspace_folders_empty_on_delete` (`BEFORE UPDATE OF deleted_at`, quando `deleted_at` deixa de ser nulo) | Excluir uma pasta que ainda tem documento ou desenho vivo |

   `saveDocument` e `saveCanvas` gravam todas as colunas (`documentRow`), então os gatilhos de atualização rodam em todo autosave. Cada execução é uma busca pela chave primária de `workspace_folders`, um custo desprezível. O teste de banco mede que o salvamento continua igual em ordem de grandeza.

### Regras

**Pastas:**

- **Nome:** `folderName(raw)` colapsa os espaços, inclusive quebras de linha, e apara as pontas. Depois do ajuste, o nome tem de 1 a 100 caracteres.
  - Vazio responde `VALIDATION`: "Dê um nome à pasta." Na interface, nome vazio cancela a criação sem chegar ao servidor.
  - `name_key` é `folderNameKey(name)`, ou `searchText(folderName(name))`.
  - Um nome repetido responde `DOMAIN_RULE`: "Já existe uma pasta MCP.", com o nome da pasta que já existe.
  - Renomear para a mesma chave, por exemplo de "mcp" para "MCP", é permitido.
- **Ordem:** manual, de 0 a n − 1 entre as ativas do projeto.
  - Uma pasta nova entra em 0 e as outras descem.
  - Reordenar não muda `version` nem `updatedAt`, como `moveProject`.
  - Excluir renumera as que ficam. A pasta excluída guarda a última posição, para que o Desfazer a devolva ao mesmo lugar (limitado ao fim da lista).
- **Versão:** sobe ao renomear, excluir e restaurar.
- **Limite:** a 201ª pasta ativa do projeto responde `DOMAIN_RULE`: "Máximo de 200 pastas neste projeto."
- **Projeto arquivado:** as escritas de pasta respondem `VALIDATION` pela regra de `requireActiveProject`. A mensagem atual é "Desarquive o projeto antes de adicionar conteúdo a ele.", e ganha uma variante para pastas: "Desarquive o projeto antes de mudar as pastas." Arquivar e desarquivar não mexem nas pastas.

**Itens nas pastas:**

- Um item vivo fica na raiz ou numa pasta ativa do próprio projeto. Os gatilhos garantem isso.
- **Mudar de pasta** (`moveItem` com o mesmo projeto):
  - exige o projeto ativo e a pasta ativa desse projeto;
  - não muda `version` nem `updatedAt`, e não confere versão;
  - o item mantém o fixado se o escopo de destino tiver vaga.
- **Mudar de projeto** (`moveItem` com outro projeto): como na etapa 08, mais a pasta. A versão sobe, `updatedAt` fica, e o item perde o fixado e a pasta (`folder_id` nulo).
- **Criar dentro de uma pasta:** `createDocument` e `createCanvas` aceitam `folderId`.
  - A pasta precisa ser ativa e do mesmo projeto. Uma pasta excluída responde `NOT_FOUND`: "A pasta não está disponível."
  - É o caso de "Uma pasta excluída não aceita itens novos", do escopo inicial.
- **Cópias e importações:** seguem a decisão 15.

**Fixados por escopo:**

- **Escopo e limite:** o escopo é a raiz do projeto ou uma pasta, com até 8 fixados em cada um.
  - O 9.º responde `DOMAIN_RULE` com o escopo: "Máximo de 8 fixados na raiz do projeto. Desafixe um item antes." ou "Máximo de 8 fixados em MCP. Desafixe um item antes."
  - O limite vale com pedidos simultâneos, pela transação `BEGIN IMMEDIATE` de `writeWithoutRequestRecord`.
- **Ao mudar de pasta**, o item mantém o fixado se o destino tiver menos de 8. Senão, perde o fixado, e a resposta diz isso (`pinnedAt: null`).
- **Ao excluir uma pasta com os itens indo para a raiz,** cada item fixado mantém o fixado enquanto a raiz tiver vaga, na ordem de `pinned_at`. Os demais perdem o fixado. O Desfazer devolve os fixados que estavam na pasta.
- **Ordem na lateral:** os fixados de cada escopo aparecem pela ordem de `pinned_at`, como na etapa 08. O protótipo os ordena pela ordenação escolhida; a diferença fica registrada.

**Lixeira e exclusão definitiva:**

- **Mover para a lixeira** mantém `folder_id` (a origem) e limpa o fixado, como hoje.
- **Restaurar** (`restoreDocument`, `restoreCanvas`):
  - com a pasta ativa, o item volta para ela;
  - com a pasta excluída, `folder_id` fica nulo no mesmo `UPDATE`, e a resposta traz `folderGone: true`. A interface avisa: "A pasta “MCP” foi excluída; o item voltou para a raiz."
- **Excluir de vez e esvaziar** não tocam nas pastas. A linha da pasta excluída fica (decisão 6).
- **`listTrash`** devolve a pasta de origem de cada documento e desenho, inclusive quando ela foi excluída.
- **"Excluir pasta e itens…"** manda os itens vivos da pasta para a lixeira na mesma transação. Para cada item:
  - `deleted_at` é o mesmo instante da pasta;
  - a versão sobe e o fixado sai;
  - `folder_id` fica, como origem.

  Depois, a pasta é excluída.

### Desfazer

| Aspecto | A — exclusão lógica e restauração versionada, com o desfazer no cliente (escolhida) | B — desfazer genérico no `core`, como o Orbis |
| --- | --- | --- |
| Onde fica o inverso | Na resposta de `deleteFolder` (IDs, versões e fixados anteriores), que o cliente devolve a `restoreFolder` | Numa tabela `core_undo_operations`, com um token que o cliente devolve a `core.undo` |
| Mudanças no `core` | Nenhuma | Migração `core/002`, um token de desfazer em toda resposta de `idempotentWrite` e o registro no `core_mutations`, módulos com `undo.handlers`, um despachante no servidor, o código `UNDO_UNAVAILABLE` e a limpeza na manutenção |
| Segurança | O servidor confere de novo cada item da lista: vivo ou na lixeira, do projeto e na versão esperada. Os itens que mudaram são pulados e contados, como no `emptyTrash` | O conteúdo guardado é confiável, e quem confere é o tratador |
| Validade | Sempre que a pasta estiver excluída. O cliente só oferece o Desfazer enquanto o toast está na tela | 24 h no Orbis, com a tabela crescendo e sendo limpa |
| Reuso | A etapa 10: `deleteColumn` exclui a coluna logicamente e `restoreColumn` recebe as tarefas movidas, conferindo a revisão do quadro | Qualquer escrita futura, sem um procedimento de restauração por ação |
| Custo | Um caso de uso e um esquema | Mudanças transversais em `core`, `server` e em todas as escritas |

**Decisão: A.** A restauração explícita é o mesmo padrão do esvaziar da Lixeira (enviar exatamente o que foi mostrado ou feito e pular o que mudou). Ela não toca o `core` e se testa como qualquer caso de uso.

**No cliente:**

- `ToastOptions` ganha `undo: () => unknown`. O toast mostra "Desfazer", com `aria-keyshortcuts` ("Meta+Z" no macOS, "Control+Z" nos demais) e a dica "Desfazer · ⌘Z".
- O `ToastProvider` expõe `undoLatest()`, que roda o desfazer do toast na tela e o fecha. Um toast novo substitui o anterior, como já acontece, e leva o desfazer dele junto.
- O ⌘Z chama `undoLatest()` com a guarda da decisão 11.
- O "Desfazer" de mover de projeto (`use-move-item.ts`) e o "Desarquivar" do toast de arquivar passam a usar `undo`.

**Limite:** uma pasta com mais de 1.000 itens é excluída sem "Desfazer". A resposta lista no máximo 1.000 e informa `complete: false`, e o toast sai sem a ação. É o mesmo teto do esvaziar da Lixeira.

## Contratos RPC

**Compatibilidade transitória:** `projectNavigation` ganha `tree` sem perder `documents` e `drawings`. Assim cada entrega do backend fica verde com a lateral da etapa 08. A entrega B5, depois do web, remove as seções por tipo e as ordens `documentsSort` e `drawingsSort`.

**Alterados:**

| Procedimento | Mudança |
| --- | --- |
| `getDocument`, `getCanvas`, `listDocuments`, `listCanvases` | Os modelos e resumos ganham `folderId: string \| null` |
| `createDocument`, `createCanvas` | Aceitam `folderId?: uuid`. Pasta de outro projeto responde `VALIDATION` ("A pasta não é deste projeto."); pasta inexistente ou excluída, `NOT_FOUND` ("A pasta não está disponível.") |
| `restoreDocument`, `restoreCanvas` | Respondem `{ id, version, updatedAt, folderGone }`. `folderGone` é verdadeiro quando a pasta tinha sido excluída e o item voltou para a raiz |
| `moveItem` | Entrada `{ requestId, type, id, projectId, folderId?: uuid \| null, expectedVersion?: int }` e saída `{ id, projectId, folderId, version, pinnedAt }`. Regras na tabela abaixo |
| `pinItem` | Conta os fixados do escopo do item (raiz ou pasta). A mensagem do 9.º nomeia o escopo |
| `projectNavigation` | Entrada `{ projectId, sort?: 'recent' \| 'title' \| 'created' (padrão 'recent'), limit?: 1–20 (padrão 8) }`. Ganha `tree` (abaixo). Até B5, aceita e responde também as seções por tipo |
| `projectOverview` | `recent[]` ganha `folder: { id, name } \| null` |
| `listTrash` | `items[]` ganha `folder: { id, name, deleted } \| null`. É nulo nas tarefas e nos itens da raiz |
| `search` (RPC e MCP) | A entrada aceita `folderId?: uuid`. Documentos e desenhos ganham `folder: { id, name } \| null` (seção MCP) |

**`moveItem`:**

| Caso | Regra |
| --- | --- |
| Outro projeto | `expectedVersion` obrigatório; sem ele, `VALIDATION` ("Informe a versão para mudar de projeto."). A versão é conferida (`VERSION_CONFLICT`) e o projeto de destino precisa estar ativo (`VALIDATION`). `folderId` só pode ser nulo ou ausente; senão, `VALIDATION` ("Mova para o projeto antes de escolher a pasta."). A versão sobe, `updatedAt` fica, e o fixado e a pasta saem |
| Mesmo projeto, outra pasta ou a raiz | Projeto ativo (`VALIDATION`) e pasta ativa do mesmo projeto (`NOT_FOUND` ou `VALIDATION`, como em `createDocument`). `expectedVersion` não é usado. Versão e `updatedAt` ficam. O fixado fica se couber no destino |
| Mesmo projeto, `folderId` ausente ou igual ao atual | Nada muda. A resposta traz o estado atual, como a etapa 08 faz no mesmo projeto |

**`tree` de `projectNavigation`** (função pura `navTree` no domínio):

```ts
interface NavTree {
  total: number;                                   // documentos e desenhos vivos do projeto
  pinned: NavItem[];                               // fixados da raiz, por pinned_at
  folders: NavFolder[];                            // pastas ativas, por position
  loose: { total: number; items: NavItem[] };      // itens da raiz sem fixado: total e os `limit` primeiros
}
interface NavFolder { id: string; name: string; position: number; version: number; total: number; items: NavItem[] }
// items: os fixados da pasta (por pinned_at) e depois os outros pela ordenação, até `limit` no total
interface NavItem { type: 'document' | 'drawing'; id: string; title: string; updatedAt: string;
                    createdAt: string; pinnedAt: string | null; folderId: string | null }
```

Desempates por `id`, como em `navSection`. "Ver todos na raiz · n" usa `pinned.length + loose.total`, o mesmo conjunto que o Índice filtrado mostra.

**Novos:**

| Procedimento | Entrada | Saída | Erros |
| --- | --- | --- | --- |
| `listFolders` | `{ projectId?: uuid }` | `{ folders: [{ id, projectId, name, position, items }] }`. Só as ativas, por projeto e posição. `items` conta os documentos e desenhos vivos | `NOT_FOUND` (projeto pedido inexistente) |
| `createFolder` | `{ requestId, projectId, name }` | `{ id, version, position }`, com `position` sempre 0 | `NOT_FOUND`, `VALIDATION` (nome ou projeto arquivado), `DOMAIN_RULE` (nome repetido ou limite de 200) |
| `renameFolder` | `{ requestId, id, expectedVersion, name }` | `{ id, version }` | `NOT_FOUND` (inexistente ou excluída), `VERSION_CONFLICT`, `VALIDATION`, `DOMAIN_RULE` |
| `moveFolder` | `{ requestId, id, beforeFolderId: uuid \| null }`. Nulo põe a pasta no fim | `{ folders: [{ id, position }] }`, as ativas na nova ordem | `NOT_FOUND` (pasta, ou `beforeFolderId` fora das ativas do mesmo projeto), `VALIDATION` (arquivado) |
| `deleteFolder` | `{ requestId, id, expectedVersion, withItems: boolean }` | `{ id, version, moved: [{ type, id, pinnedAt }], trashed: [{ type, id, version, pinnedAt }], unpinned, complete }`. `pinnedAt` é o fixado de antes. `unpinned` conta os que perderam o fixado na raiz. `complete` é falso quando a lista foi cortada em 1.000 | `NOT_FOUND`, `VERSION_CONFLICT`, `VALIDATION` |
| `restoreFolder` | `{ requestId, id, expectedVersion, moved: [{ type, id, pinnedAt }] (até 1.000), trashed: [{ type, id, version, pinnedAt }] (até 1.000) }` | `{ id, version, position, restored, skipped }` | `NOT_FOUND`, `VERSION_CONFLICT`, `VALIDATION` (arquivado), `DOMAIN_RULE` ("Esta pasta não foi excluída.", nome tomado por outra pasta ativa: "Já existe uma pasta MCP. Renomeie-a antes de desfazer.", limite de 200) |

**`restoreFolder`, numa transação:**

1. Reativa a pasta na posição guardada (limitada ao fim) e sobe a versão.
2. **`moved`:** volta para a pasta cada item que continua vivo, no mesmo projeto e na raiz. O fixado volta quando era da pasta e o item ficou sem ele; um item que manteve o fixado na raiz leva o fixado junto.
3. **`trashed`:** restaura cada item que continua na lixeira, com `folder_id` dessa pasta e a mesma versão. A versão sobe, `updatedAt` passa a ser agora (como em `restoreDocument`) e o fixado volta.
4. Os demais são pulados e contados em `skipped`.

**Respostas compactas:** nenhuma resposta de escrita traz nome de pasta, título ou conteúdo, como na etapa 08. As mensagens de erro podem nomear a pasta, porque uma escrita que falha não grava registro de pedido.

**Testes de servidor:** o teste que chama todos os procedimentos sem sessão (`src/server/server.db.test.ts`) cobre os novos automaticamente.

**Invalidação no cliente:**

| Evento | O que muda |
| --- | --- |
| Escritas de pasta, mover, fixar, mandar para a lixeira, restaurar e salvar | Invalidam `['workspace', 'navigation']`, `['workspace', 'overview']`, `['workspace', 'folders']` e as listas do Índice |
| Mover de pasta | A resposta atualiza `folderId` e `pinnedAt` na consulta do item aberto (`setQueryData`), sem baixar o conteúdo de novo |

## MCP

Sem ferramentas novas. As mudanças seguem o modelo de leitura de `main`: porta `WorkspaceReader`, SQL em `infra/reader/`, formatação em `infra/mcp/` e limites em `domain/reading-limits.ts`.

| Ferramenta ou peça | Mudança |
| --- | --- |
| `list_projects` | Cada projeto ganha `folderCount` e `folders: [{ id, name, items }]`, na ordem da lateral, com no máximo `READING_LIMITS.projectFolders` (50). `items` conta os documentos e desenhos vivos. Ordem, páginas de 200 e o cursor `p~…` não mudam; nomes pesados só reduzem os projetos por página (`fitItems`) |
| `list_projects`: descrição | Acrescenta: "Cada projeto traz até 50 pastas (folders), na ordem da lateral, com a quantidade de itens, e folderCount com o total. Use search com folderId para listar os itens de uma pasta." |
| `search` | Aceita `folderId` (descrição: "Limita a uma pasta; só documentos e desenhos.").<br>• Pasta inexistente ou excluída: `NOT_FOUND` ("Pasta não encontrada.").<br>• `projectId` de outro projeto: `VALIDATION` ("A pasta não é deste projeto.").<br>• Com `folderId`, as tarefas ficam de fora.<br>• Documentos e desenhos ganham `folder: { id, name } \| null`; tarefas, não. Ordem e cursor `s~…` não mudam |
| `search`: descrição | Acrescenta que documentos e desenhos trazem `folder`, a pasta em que estão, ou `null` na raiz |
| `read_document` | O cabeçalho ganha a linha `- Pasta: MCP` ou `- Pasta: nenhuma (raiz do projeto)`, depois de `- Projeto:`, com `singleLine`. A linha entra no orçamento de 9.000 caracteres do cabeçalho, que já desconta as linhas fixas antes das tarefas originadas |
| `read_drawing` | A primeira linha ganha `· Pasta "MCP"`, entre aspas JSON como o projeto, ou `· Sem pasta`. A estrutura recebe o que sobrar, como hoje |
| Portas | `ProjectWithCounts` ganha `folderCount` e `folders`. `SearchQuery` ganha `folderId`. `SearchHit` de documento e desenho, `DocumentForReading` e `CanvasForReading` ganham `folder: FolderReference \| null` |
| Instruções do servidor (`src/server/mcp/mcp-server.ts`) | Sem mudança |

**Teto de 45.000 caracteres:** o teste "keeps every text result within the output ceiling, by its own budget", em `infra/mcp/tools.db.test.ts`, ganha:

- um projeto com 200 pastas de nomes pesados (100 caracteres de `"\\\u0001`). `list_projects` mostra 50 e `folderCount: 200`;
- dez projetos com 50 pastas pesadas cada;
- o documento, o desenho e as tarefas do teste numa pasta de nome pesado;
- `search` com `folderId` e sem filtro.

Cada resultado continua com no máximo 45.000 caracteres, sem disparar `withTextCeiling`, e a paginação de `list_projects` ainda percorre todos os projetos.

## Interface

### Lateral: seção Itens

**Grade** (pastas.md §1):

- **Largura:** 256 px.
- **Chevron:** coluna de x=12 a 24, chevron de 12 px centrado em x=18, só nas pastas.
- **Ícone de raiz:** de x=28 a 44, em todas as linhas: navegação, fixados, pastas e itens soltos. A marca do seletor fica centrada em x=36. O texto da raiz começa em x=52.
- **Filhos:** ícone de x=52 a 68 e texto em x=76.
- **Guia da pasta aberta:** 1 px `--line` em x=36, da linha da pasta até o último filho.
- **Direita:** contagens e ações com a borda em x=240.
- **Linhas:** 28 px, raio 6, sem espaço entre elas. O cabeçalho Itens tem 24 px.
- **Fio dos fixados:** de x=52 a 240, com 4 px acima e abaixo.

Cabeçalho, Buscar, navegação e rodapé passam à mesma grade, como no protótipo. `layout.css` troca 248 por 256 px.

**Conteúdo, nesta ordem:**

1. Os fixados da raiz.
2. O fio.
3. As pastas, em ordem manual.
4. Os itens soltos da raiz.

Dentro de uma pasta, os fixados sobem para o topo, então nada aparece duas vezes. O tipo vem no ícone (`FileText` para documento, `Shapes` para desenho). Num projeto sem itens e sem pastas, a lista mostra "Nada aqui ainda."

**Cabeçalho "Itens n":**

- O `n` conta todos os documentos e desenhos e abre o Índice.
- No hover ou no foco aparecem:
  - "+", com Documento, Desenho e Pasta;
  - "⋯", com Ordenar (Recentes, A–Z, Criação, em rádio) e Recolher todas as pastas.
- Num projeto arquivado, o "+" some.
- Soltar um item no cabeçalho o leva para a raiz.

**Linha de pasta:** estados de pastas.md §1, com os tokens:

| Estado | Tratamento |
| --- | --- |
| Fechada | Ícone `Folder` em `--icon`, nome em `--text-2` 13/20 e contagem 12 `tnum` em `--text-3`. Fechada e vazia, não mostra contagem |
| Aberta | Ícone `FolderOpen` |
| Hover | Fundo `--sidebar-hover`. O "+" ("Novo em MCP": Documento e Desenho) e o "⋯" substituem a contagem; são botões de 20 px com ícones de 14 |
| Fechada, com o item ativo dentro | Fundo `--sidebar-hover` e nome em 500 |
| Fechada, com item não salvo dentro | Ponto de 6 px em `--late` antes da contagem, com a dica "1 item não salvo" |
| Foco por teclado | Anel interno de 2 px `--accent` |
| Alvo de arrastar | Fundo `--selected` e anel interno de 1 px `--accent` |
| Renomeando | Campo de 24 px (`--raised-1` no escuro, branco no claro), borda `--accent` e halo `--accent-25`. Erro em 12/16 `--late` logo abaixo |

- **Chevron:** gira 90° em 120 ms; só esmaece com `prefers-reduced-motion`.
- **Clique:** em qualquer ponto da linha, abre ou fecha a pasta, exceto no "+" e no "⋯". A pasta não tem página.
- **Toque:** no hover ausente (`@media (hover: none)`), "+" e "⋯" ficam sempre visíveis. É a correção da etapa 08 para controles que só apareciam no hover.

**Escala:**

- **Filhos:** cada pasta aberta mostra até 8 filhos, contando os fixados, e a linha "Ver todos · n", que abre o Índice com `?pasta=<id>`.
- **Raiz:** mostra até 8 itens soltos e "Ver todos na raiz · n" (`?pasta=raiz`).
- **Item ativo:** aparece sempre. Fora dos 8, entra como 9.ª linha, logo acima de "Ver todos".
- **Pasta vazia e aberta:** uma linha filha "Pasta vazia · + Documento · + Desenho" em 12/16 `--text-3`. Os links viram `--text` no hover. Num projeto arquivado, fica só "Pasta vazia".
- **Rolagem:** só a lista rola. Cabeçalho, Buscar, navegação e rodapé ficam fixos.

**Aberta ou fechada** (`use-expanded-folders.ts`, no dispositivo):

```json
{ "collapsed": false,
  "projects": { "<projectId>": { "sort": "recent", "expanded": ["<folderId>"] } } }
```

- **Leitura tolerante:** IDs desconhecidos são ignorados e descartados na próxima gravação. A chave `sections` da etapa 08 também é descartada, e a ordenação volta a Recentes uma vez.
- **Primeira visita ao projeto** (sem entrada): todas as pastas fechadas, exceto a do item ativo.
- **Chegar a um item de pasta fechada** (busca, link ou ⌘K): a pasta abre e a linha rola para a vista. Se a pessoa recolher a pasta depois, isso vale até a próxima chegada.
- **Abrem sozinhas:** a pasta recém-criada e a pasta que acaba de receber um item.
- "Recolher todas as pastas" esvazia `expanded` do projeto.

**Árvore e acessibilidade:**

- **Estrutura:** `Tree` com `aria-label="Itens de <projeto>"`, `selectionMode="none"`, `escapeKeyBehavior="none"` e `expandedKeys` controlado.
- **Pastas e filhos:** pastas são `TreeItem` com filhos; os itens têm `aria-level` 1 ou 2.
- **Linhas de item:** seguem o padrão do Índice da etapa 08: `onAction` navega, e um `Link` interno com `tabIndex={-1}` mantém o `<a>` real para o clique do meio, o ⌘-clique e o menu do navegador. O E2E confere que um clique cria uma entrada só no histórico.
- **Nomes acessíveis:**

  | Linha | Nome |
  | --- | --- |
  | Pasta | "MCP, pasta, 12 itens", mais ", 1 item não salvo" |
  | Item | "Visão do produto, documento, fixado" |
  | Ver todos | "Ver todos os 18 itens de Arquitetura no Índice" |

  O item ativo tem `aria-current="page"` no link.
- **Região viva:** anuncia "MCP aberta", "MCP recolhida", "Pasta MCP na posição 2 de 4", "Pasta renomeada: MCP" e "Criação da pasta cancelada.", como no protótipo (`say`).
- **Ponte com a navegação:** ↓ na última linha da navegação (Quadro) leva à linha atual da árvore, e ↑ na primeira linha da árvore volta ao Quadro. A navegação continua com `use-roving-focus.ts`.

**Filtro (Buscar, `/`):**

- **Pastas · n:** as pastas cujo nome tem todas as palavras, com o `searchText` local sobre `tree.folders`. ↵ numa delas a expande, limpa o filtro e foca o primeiro filho.
- **Itens · n:** a lista plana do `search` da etapa 08, com o ícone do tipo e o nome da pasta à direita em 12 `--text-3`.
- A última linha continua "Buscar em todos os projetos" (⌘K).

**Faixa recolhida:**

- Os ícones de Documentos e Desenhos dão lugar a um só, Itens (`FolderTree`).
- Ele abre um popover de 280 px com o cabeçalho "Itens n" e a mesma árvore, sem arrastar, sem renomear e sem "+" e "⋯". O estado aberto ou fechado é o mesmo da lateral.
- O ponto "não salvo" também aparece no ícone.

**Pendente:** o ponto da pasta e o do ícone Itens vêm do `save-registry` da etapa 08. A pasta de cada item pendente sai da consulta do item aberto (`folderId`), porque `tree` só traz os 8 primeiros de cada pasta.

**Dados:** `projectNavigation` com `tree`, numa consulta por projeto, como na etapa 08, e `listFolders` para o ⌘K.

### Ações de pasta

**Criar:**

- **Por onde:** o "+" de Itens › Pasta, o menu Novo (N) › Pasta, o ⌘K "Nova pasta" ou "Mover para pasta… › Nova pasta…".
- **Lateral escondida:** se a lateral estiver recolhida ou escondida, ela abre: sobre a página entre 720 e 1.100 px e abaixo de 720 px, ou expandida a partir da faixa (`ensureSidebarOpen` do protótipo).
- **Campo:** uma linha provisória entra no topo das pastas, em edição, com "Nova pasta" selecionado.
  - ↵ ou sair do campo com um nome válido cria a pasta.
  - Nome vazio ou Esc cancela, e o foco volta ao cabeçalho Itens.
- **Nome repetido:**
  - A web confere antes com `folderNameKey` sobre as pastas conhecidas e mostra o erro inline "Já existe uma pasta MCP.". O servidor confere de novo com a mesma mensagem.
  - Ao sair do campo com um nome repetido, a criação é cancelada e a mensagem vira toast de erro. O campo não puxa o foco de volta.
- **Depois de criar:** a pasta abre e recebe o foco. O toast diz "Pasta “MCP” criada.", exceto no fluxo de mover, que mostra o toast do movimento.
- **Teclas no campo:** o campo para a propagação das teclas, para que a árvore (setas, espaço, typeahead) e os atalhos não as tomem.

**Renomear:**

- Duplo clique no nome, F2 ou ⋯ › Renomear. Os dois cliques do duplo clique alternam a pasta duas vezes, e ela fica como estava.
- ↵ salva e Esc restaura o nome. Sair do campo salva quando o nome é válido.
- Erros como na criação.

**Reordenar:**

- Arrastar a linha, ⌥↑ ou ⌥↓ com a pasta em foco, ou ⋯ › Mover para cima e Mover para baixo, desabilitados nas pontas.
- O foco fica na pasta, e a região viva anuncia a posição.

**Menu ⋯ da pasta** (também por ⇧F10 ou pela tecla Menu na linha):

1. Renomear (F2).
2. Mover para cima (⌥↑) e Mover para baixo (⌥↓).
3. Separador.
4. Excluir pasta, com a nota "Os itens vão para a raiz" quando há itens.
5. Excluir pasta e itens…, em perigo e só quando a pasta tem itens.

**Excluir pasta:**

- Sem diálogo.
- **Toast:** "Pasta “MCP” excluída. 1 item foi para a raiz." (ou "3 itens foram"). Com `unpinned`, acrescenta "1 deixou de ficar fixado.". Vazia: "Pasta “MCP” excluída. Estava vazia."
- **Desfazer** (toast ou ⌘Z): `restoreFolder` com a lista da resposta. A pasta volta aberta, no mesmo lugar e com os itens.
- **Itens pulados:** "Pasta “MCP” restaurada. 2 itens tinham mudado e ficaram onde estavam."
- **Item aberto:** se estava na pasta, a página fica e o rótulo passa a "Sem pasta".

**Excluir pasta e itens…:**

- **Diálogo:** `AlertDialog` "Excluir “MCP” e 1 item?" com "Os itens vão para a Lixeira e podem ser restaurados por lá. A pasta deixa de existir." e os botões [Cancelar] e [Excluir pasta e itens], em perigo, com o foco inicial em Cancelar.
- **Depois:** o toast "“MCP” e 1 item foram para a Lixeira." com Desfazer.
- **Item aberto:** se estava na pasta, a página passa à Visão geral com `replace`, como ao mandar um item para a lixeira.

**Criar dentro de uma pasta:**

- O "+" da pasta e os links da pasta vazia criam direto na pasta.
- N com o foco numa pasta ou num filho abre o menu Novo ancorado na linha. A seção "Em MCP" (Documento, Desenho) vem antes de "Novo em Tinyfold" (Documento, Desenho, Pasta, Tarefa).
- Na página de um item que está numa pasta, o menu Novo (N ou o botão) também começa por "Em MCP", com "Novo documento em MCP" e "Novo desenho em MCP".
- `AppProvider.newDocument` e `newCanvas` aceitam `folderId`.

### Mover itens

**"Mover para pasta…"** (`MoveToFolderPopover`):

- **Abre por:** M na linha ou na página, o ⋯ da página (que diz a pasta atual), o rótulo do cabeçalho e o ⌘K "Neste item".
- **Montagem:** `Autocomplete` do React Aria, com `SearchField` ("Mover para pasta…") e `Menu`:
  1. Raiz do projeto, com ✓ quando o item está na raiz;
  2. as pastas na ordem manual, com ✓ na atual e a contagem à direita;
  3. um separador;
  4. "Nova pasta…" e "Outro projeto…".
- **Filtro:** com `searchText` sobre as palavras, inclusive em "Raiz do projeto". As duas últimas linhas ficam sempre.
- **Escolhas:**
  - A pasta atual não faz nada e anuncia "O item já está aí.".
  - "Nova pasta…" abre a criação na lateral e, ao confirmar, move o item.
  - "Outro projeto…" abre o `MoveToProjectMenu` da etapa 08 na mesma âncora.
- **Projeto arquivado:** não há "Mover para pasta…", e o rótulo do cabeçalho fica desabilitado.

**Toasts:**

- "Movido para MCP." ou "Movido para a raiz do projeto.", com Desfazer, que move de volta e fixa de novo se o item perdeu o fixado.
- Sem vaga no destino: "Movido para MCP, sem fixar: a pasta já tem 8 fixados."
- Mover para outro projeto mantém o toast da etapa 08.

**Arrastar** (`use-tree-dnd.ts`, `useDragAndDrop` do React Aria, só na lateral e não no popover da faixa). Tipos próprios: `application/x-tinyfold-item` e `application/x-tinyfold-folder`. Soltar fora da lateral não faz nada.

| Arrastando | Sobre | Resultado |
| --- | --- | --- |
| Item | Linha de pasta (`on`) | Vai para a pasta. A linha fica em estado de alvo. A pasta fechada abre depois de 800 ms (decisão 13) |
| Item | Antes ou depois de um filho, ou a linha "Pasta vazia" | Vai para a pasta desse filho. O indicador de 2 px `--accent` começa em x=76 |
| Item | Antes ou depois de um fixado ou item solto da raiz, ou a área vazia da árvore | Vai para a raiz. O indicador começa em x=52 |
| Item | Cabeçalho Itens (um `useDrop` à parte, que aceita o tipo do item) | Vai para a raiz, com o cabeçalho em estado de alvo |
| Item | Antes ou depois de uma linha de pasta | Recusado (`cancel`), sem indicador |
| Pasta | Antes ou depois de outra pasta | Reordena, com o indicador em x=52 |
| Pasta | Qualquer outro lugar, inclusive outra pasta | Recusado: sem indicador e com o cursor de "não permitido" |

Soltar mostra o mesmo toast do M. Arrastar fica desligado num projeto arquivado, durante a renomeação e no popover.

### Onde as pastas aparecem

| Lugar | Tratamento |
| --- | --- |
| Cabeçalho do documento e do desenho | `PageFrame` ganha um espaço à esquerda (`lead`) para o `FolderLabel`: ícone de pasta de 14 px e "MCP" em 12/16 `--text-3`. O chevron aparece no hover. Na raiz, "Sem pasta". Clicar abre "Mover para pasta…", com `aria-label` "Pasta MCP. Mover para pasta (M)". Num projeto arquivado, só o texto. Abaixo de 720 px, não aparece (decisão 16) |
| ⋯ do documento e do desenho | "Mover para pasta…" (M), com a pasta atual, antes de "Mover para projeto…", que perde o M |
| ⌘K, itens | À direita, a marca e o caminho "Tinyfold › MCP" em 12 `--text-3`. Na raiz, só o projeto |
| ⌘K, Pastas | Grupo depois de Projetos, só com texto digitado, com até 6 de `listFolders` filtradas localmente: "MCP · pasta · 12 itens", com o projeto à direita e os arquivados sinalizados. ↵ abre o projeto da pasta se for outro, expande a pasta e foca o primeiro filho |
| ⌘K, comandos | "Nova pasta", "Recolher todas as pastas" (quando o projeto tem pastas) e, em "Neste item", "Mover para pasta…" (M) |
| Índice | Filtros "Tipo" e "Pasta: Todas, Sem pasta, <pastas>", que correspondem a `?tipo=` e `?pasta=<id>\|raiz`. Uma pasta desconhecida ou excluída na URL vira Todas, com `replace`. O interruptor "Agrupar por pasta" começa ligado e fica guardado no dispositivo, junto da ordem. Os grupos são linhas de cabeçalho (`Cell colSpan`), com ícone de pasta, nome e contagem, na ordem manual, e "Sem pasta" por último. A ordem da tabela vale dentro de cada grupo. Resumo: "12 itens em Tinyfold · MCP." com o filtro. Com "Agrupar por pasta" desligado, a tabela ganha a coluna Pasta, depois de Tipo, com o nome da pasta ou "Sem pasta"; agrupada, ela some, porque o cabeçalho de cada grupo já diz a pasta ([decisão do usuário 2](#decisões-do-usuário)). "Ver todos" da lateral abre o Índice filtrado |
| Visão geral › Editados recentemente | A meta mostra o tipo e a pasta: "Documento · MCP" e "Desenho · Arquitetura" |
| Lixeira | A coluna Origem mostra "Tinyfold › MCP" ou "Tinyfold"; nas tarefas, o projeto. A pasta aparece mesmo excluída, e o aviso vem ao restaurar. Toasts: "“X” restaurado em MCP." com "Abrir", ou "A pasta “MCP” foi excluída; o item voltou para a raiz." com "Abrir" |

### Celular

O fallback continua funcional, como na etapa 08:

- **Árvore:** fica na lateral sobre a página. Tocar numa pasta abre ou fecha, e "+" e "⋯" ficam visíveis.
- **Sem arrastar:** mover usa o ⋯ da página › "Mover para pasta…". Reordenar e excluir usam o ⋯ da pasta.
- **Nova pasta:** a lateral abre sobre a página para receber o nome.
- **Cabeçalho:** sem o rótulo da pasta (decisão 16).

## Teclado e Esc

**Tabela de atalhos**, a da etapa 08 com as mudanças desta etapa (`shell/keyboard/shortcut-list.ts` e o diálogo Atalhos):

| Atalho | Ação | Etapa 09 |
| --- | --- | --- |
| ⌘K (Ctrl+K) | Buscar e comandar | — |
| G P, G 1–9, G V, G Q, G L | Seletor, projeto n, Visão geral, Quadro, Lixeira | Também com o foco na árvore |
| ⌘\\, F6, ⇧F6, `/`, ?, ⌘S, ⌘[ | Como na etapa 08 | — |
| ⌘Z (Ctrl+Z) | Desfazer a ação do toast na tela | Novo. Só fora de campos, do editor, do desenho e de menus e diálogos (decisão 11) |
| N | Menu Novo, com "Em <pasta>" no contexto de uma pasta ou de um item dentro dela | Muda |
| P | Fixar ou desafixar o item em foco ou aberto, no escopo dele | Muda o escopo |
| M | Mover para pasta…, na linha ou na página | Muda; antes, Mover para projeto |
| ↑ ↓, Home, End | Linha visível anterior ou seguinte; primeira ou última | Na árvore, pelo React Aria |
| → | Expande a pasta; aberta, vai ao primeiro filho | Novo na árvore |
| ← | Recolhe a pasta; num filho, volta para a pasta | Novo na árvore |
| ↵ (ou espaço) | Abre o item; numa pasta, alterna | Muda |
| Letras | Vão à próxima linha que começa com o que foi digitado (typeahead), exceto N, P, M e G | Novo |
| F2 | Renomeia a pasta em foco | Novo |
| ⌥↑, ⌥↓ | Reordenam a pasta em foco | Novo |
| ⇧F10 ou Menu | Menu ⋯ da pasta em foco | Novo |
| Esc | Fecha a camada mais recente | Também cancela a renomeação |

**Colisões e guardas:**

- **`use-tree-keys.ts`:** é um ouvinte em captura no contêiner da árvore.
  - Com o foco numa linha, encaminha N, P, M, G, `/`, `?` e qualquer tecla com acorde G pendente ao ouvinte global, com o contexto da linha (item ou pasta), e as retira do React Aria. É o padrão de `letShortcutsWin` do Índice, que reenvia todas as letras; aqui ele se restringe a essas teclas, para o typeahead continuar.
  - Trata F2, ⌥↑, ⌥↓ e ⇧F10 nas pastas.
  - As demais letras ficam com o typeahead. Uma busca por digitação não pode começar por N, P, M ou G, como no protótipo.
- **Campo de renomear:** fica fora de todos os atalhos, por ser editável, e para a propagação para a árvore.
- **⌘Z:** a guarda nova `acceptsUndo(target)` em `guards.ts`, pura e testada, aceita só fora de campos editáveis, do `.excalidraw` e de overlays (`inOverlay`). Sem toast com Desfazer na tela, o ⌘Z não é interceptado.
- **Pastas não têm P nem M:** fixar e mudar de projeto não se aplicam a elas.
- **No Excalidraw:** M, P e N continuam sem efeito, pela guarda da etapa 08.
- **Acordes:** `chords.ts` passa a expor `pending()`, para o encaminhamento da árvore.

**Esc** (`layers.ts`, sem camada nova):

- A renomeação trata o próprio Esc (restaura o nome e chama `preventDefault`), e o ouvinte global não faz mais nada.
- O popover "Mover para pasta…" e os menus são overlays do React Aria, que fecham só o mais recente.
- O filtro da lateral continua: o primeiro Esc limpa e o segundo devolve o foco.
- Um arrasto em curso é cancelado pelo Esc do próprio arrastar.
- A árvore usa `escapeKeyBehavior="none"`. O Esc **nunca** recolhe pastas, nunca navega e nunca recolhe a lateral fixa.

## Organização do código

### Backend (`src/workspace`)

```text
domain/folders.ts                  FOLDER_LIMITS (nome 100, 200 por projeto, 1.000 por restauração), Folder,
                                   folderName, folderNameKey, folderOrder (reordenar, puro), restoredPosition
domain/navigation-tree.ts          NavTree, NavFolder, navTree(items, folders, sort, limit); navigation.ts guarda
                                   NavItem (com type e folderId), NAV_SORTS e as contagens de tarefas
domain/models.ts                   folderId em Document, DocumentSummary e no ack de restauração
domain/canvas.ts                   folderId em Canvas e CanvasSummary
domain/project.ts                  MAX_PINNED passa a ser por escopo (comentário e nome mantidos)
domain/reading-limits.ts           projectFolders: 50
application/folders/               create-folder.ts, rename-folder.ts, move-folder.ts, delete-folder.ts,
                                   restore-folder.ts, list-folders.ts, folder-rules.ts (requireActiveFolder,
                                   requireFolderInProject, assertNameFree, folderAfterRestore), index.ts
application/moves/                 move-item.ts (projeto e pasta) e pin-scope.ts (keepPinIfRoom), no lugar de moves.ts
application/pins.ts                contagem por escopo
application/documents.ts, canvases.ts  folderId ao criar; restauração com folderAfterRestore e folderGone
application/schemas/folders.ts     entradas das escritas e de listFolders; moves.ts, documents.ts, canvases.ts,
                                   navigation.ts acompanham
application/navigation/            project-navigation.ts (tree), project-overview.ts e list-trash.ts com a pasta;
                                   ports.ts com folders() e navItems() dos dois tipos
application/reading/               ports.ts, list-projects.ts, search.ts e schemas.ts conforme a seção MCP
infra/migrations/006_folders.sql
infra/db.ts                        workspace_folders e folder_id
infra/repository/folders.ts        FolderRepository; moves.ts, pins.ts, documents.ts, canvases.ts e mappers.ts
infra/navigation/                  projects.ts (pastas e itens com folder_id), overview.ts e trash.ts com a pasta
infra/reader/                      projects.ts (pastas por projeto), search.ts (filtro e junção), documents.ts e
                                   canvases.ts (pasta do item)
infra/mcp/                         list-projects.ts, search.ts, format.ts (linha da pasta), read-drawing.ts
infra/operations/folders.ts        as operações das pastas, no índice de operations/
testing/folders.ts                 testFolder(service, projectId, name)
testing/legacy-workspace.ts        linhas no formato da 005 (cor, posição, fixado, origem com título)
```

**Entradas públicas:** `domain/index.ts` passa a exportar, para a web:

- `FOLDER_LIMITS`, `folderName` e `folderNameKey`;
- os tipos `Folder`, `NavTree`, `NavFolder` e `NavItem`.

`MAX_PINNED` e `NAV_SORTS` já são exportados. Nada mais muda nas regras do dependency-cruiser.

### Web (`src/web`)

```text
shell/sidebar/
├── ItemsSection.tsx          cabeçalho Itens e árvore; substitui ItemSection.tsx
├── ItemsHeader.tsx           "Itens n", "+", "⋯" (ordenar, recolher todas) e o alvo de soltar na raiz
├── tree/
│   ├── ItemsTree.tsx         Tree do React Aria; variantes da lateral e do popover
│   ├── FolderRow.tsx         linha de pasta, estados, "+" e "⋯"
│   ├── ItemRow.tsx           linha de item (substitui SidebarItem.tsx), P e M
│   ├── MoreRow.tsx           "Ver todos · n" e "Ver todos na raiz · n"
│   ├── EmptyFolderRow.tsx    "Pasta vazia · + Documento · + Desenho"
│   ├── FolderNameField.tsx   campo de criar e renomear
│   ├── tree-rows.ts          linhas a partir de tree, item ativo e pastas abertas (puro; substitui section-rows.ts)
│   ├── tree-drop.ts          alvo de soltar → destino ou recusa (puro)
│   ├── use-tree-dnd.ts       useDragAndDrop, alvo do cabeçalho e toasts
│   ├── use-tree-keys.ts      encaminhamento de teclas, F2, ⌥↑/⌥↓, ⇧F10
│   ├── use-expanded-folders.ts  estado aberto no dispositivo, primeira visita e chegada a um item
│   └── tree.css              grade de 256 px, guia, fio e estados
├── ItemsPopover.tsx          popover Itens da faixa (substitui os dois RailPopover)
├── SearchResults.tsx         grupo Pastas e lista plana com a pasta à direita
└── sidebar-prefs.ts          novo formato (projects/sort/expanded), leitura tolerante
shell/folders/
├── MoveToFolderPopover.tsx, move-to-folder.ts (pedido e cache do item), use-move-to-folder.ts (toasts e Desfazer)
├── use-folder-actions.ts     criar, renomear, reordenar, excluir, excluir com itens e restaurar
├── FolderMenu.tsx, DeleteFolderDialog.tsx, FolderLabel.tsx
└── folder-text.ts            textos dos toasts e anúncios, com plurais (puro)
shell/project/                NewItemMenu.tsx com a seção da pasta e "Pasta"; ItemMenu.tsx com "Mover para pasta…"
shell/keyboard/               ⌘Z, acceptsUndo, chords.pending(), tabela; use-item-shortcuts.ts
shell/command-palette/        palette-folders.ts (grupo Pastas e caminho), commands.ts, use-here-actions.tsx
ui/Toast.tsx                  undo e undoLatest(); toast-undo.ts com o estado do Desfazer
lib/queries/folders.ts        listFolders; navigation.ts com sort e tree
pages/project/item-index/     index-groups.ts (puro), IndexFilters.tsx, IndexTable.tsx (grupos e coluna Pasta)
pages/project/overview/       RecentSection.tsx com a pasta
pages/project/trash/          TrashGroups.tsx (Origem), trash-text.ts (avisos de restauração)
pages/document/, pages/drawing/  FolderLabel no cabeçalho; cópias e importações na pasta
router/paths.ts, routes.tsx   index(projectId, { tipo, pasta }) e validateSearch de pasta
```

**Saem:** `ItemSection.tsx`, `SectionList.tsx`, `section-rows.ts` (com o teste), `SidebarItem.tsx`, `RailPopover.tsx` e `sidebar-section.css`.

**Arquivos que crescem e são divididos:**

| Arquivo (linhas em `main`) | Divisão |
| --- | --- |
| `shell/project/ItemMenu.tsx` (102) | O submenu de projetos vai para `MoveToProjectSubmenu.tsx`. `ItemMenu` lista as ações |
| `shell/keyboard/use-shortcut-actions.ts` (108) | Fixar, mover e Novo do item ou da linha vão para `use-item-shortcuts.ts` |
| `shell/command-palette/palette-sections.ts` (119) | Grupo Pastas e caminho em `palette-folders.ts`. `CommandPalette.tsx` (111) passa as consultas para `use-palette-data.ts` |
| `components/editor/use-item-actions.ts` (149) | "Salvar como cópia" vai para `use-item-copy.ts`, com o destino da pasta |
| `shell/sidebar/ProjectSidebar.tsx` (113) | O estado da busca vai para `use-sidebar-search.ts` |
| `pages/project/item-index/IndexPage.tsx` e `index-rows.ts` (107) | Filtros em `IndexFilters.tsx`, grupos e filtro de pasta em `index-groups.ts` |
| `ui/Toast.tsx` (135) | O estado do Desfazer vai para `toast-undo.ts` |
| CSS da lateral | `sidebar-section.css` sai, entram `tree.css` e `items-header.css`, e `sidebar-row.css` e `layout.css` passam à grade de 256 px. Nenhum CSS novo vai para arquivo global |

## Testes

### Unidade (`check`)

- **Domínio:**
  - `domain/folders.test.ts`: espaços, quebras de linha e limite de `folderName`; chave sem caixa e sem acentos ("Ações" = "acoes", "MCP" = "mcp"); `folderOrder` antes, depois, no fim e com IDs desconhecidos; `restoredPosition` limitado ao fim.
  - `domain/navigation-tree.test.ts`: fixados da raiz por `pinned_at`; pastas por posição; filhos com os fixados primeiro e limite de 8; totais; raiz com limite; as três ordenações; desempate por ID; pasta vazia.
- **Lateral:**
  - `tree-rows.test.ts`: item ativo como 9.ª linha, só com a pasta aberta ou na raiz; "Ver todos" e as contagens; linha de pasta vazia; pasta fechada com o item ativo; primeira visita.
  - `tree-drop.test.ts`: cada linha da tabela de arrastar.
  - `sidebar-prefs.test.ts`: formato novo; `sections` antigo descartado; IDs desconhecidos.
- **Teclado:**
  - `keyboard.test.ts`: `acceptsUndo` em campo, editor, `.excalidraw` e overlay; encaminhamento da árvore (N, P, M, G, `/`, `?` e o acorde pendente vão aos atalhos; outras letras ficam com o typeahead); `chords.pending()`.
  - `toast-undo.test.ts`: o mais novo substitui; `undoLatest` só roda o toast na tela e nada depois que ele sai.
- **Textos e telas:** `folder-text.test.ts` (plurais: "1 item foi", "3 itens foram", "Estava vazia.", "1 deixou de ficar fixado."); `palette-sections.test.ts` (grupo Pastas, caminho, limite de 6); `commands.test.ts` (os comandos novos e quando aparecem); `index-groups.test.ts` (ordem manual, "Sem pasta" por último, filtros `raiz` e pasta, pasta desconhecida, colunas com e sem agrupar); `trash-text.test.ts` (Origem e os avisos de restauração).

### Banco (`test:db`, SQLite temporário)

**Migração 006** (`application/folders-migration.db.test.ts`), sobre bases montadas com `migrateWorkspaceTo(db, 5, …)` e linhas no formato da 005:

- **Banco vazio:** a tabela nova existe e nada mais muda.
- **Itens vivos, na lixeira e fixados, prévias e origens de tarefa:** `version`, `updated_at`, `pinned_at` e a revisão do quadro intactos, e `folder_id` nulo.
- **Gatilhos, por SQL direto:**
  - pasta de outro projeto na inserção e na atualização;
  - item vivo em pasta excluída;
  - restaurar sem limpar a pasta;
  - mudar o projeto da pasta;
  - excluir pasta com item vivo dentro.
- **Índice único:** nomes ativos repetidos são recusados; o nome de uma pasta excluída pode ser reusado.
- **Consistência:** `integrity_check` e `foreign_key_check` limpos, e migrar de novo não muda nada.

**Pastas** (`application/folders.db.test.ts`):

- `createFolder`: entra no topo e desce as outras; nome ajustado; nome repetido com outra caixa ou acento; limite de 200; projeto arquivado; projeto inexistente.
- `renameFolder`: versão; mesma chave; nome repetido; pasta excluída.
- `moveFolder`: renumera sem mudar versão; `beforeFolderId` de outro projeto; arquivado.
- `deleteFolder`: sem itens, os itens vão para a raiz sem mudar versão nem data, os fixados ficam enquanto a raiz tem vaga, `unpinned` conta os outros, e a lista é cortada em 1.000 com `complete: false`. Com itens, eles vão para a lixeira com o instante da pasta, a versão sobe, o fixado sai e `folder_id` fica.
- `restoreFolder`: os dois casos, com a posição devolvida; pula os itens que mudaram de pasta, de projeto, de versão ou saíram da lixeira; nome tomado; segunda restauração (`VERSION_CONFLICT`); pasta não excluída.
- **Idempotência e concorrência:** repetir com o mesmo `requestId` devolve a mesma resposta; dois `createFolder` simultâneos com o mesmo nome terminam com uma pasta só.

**Itens nas pastas:**

- `moves.db.test.ts`, ampliado:
  - mudar de pasta não muda versão nem data e não pede versão;
  - o fixado fica ou sai conforme a vaga;
  - pasta excluída, pasta de outro projeto, projeto arquivado;
  - mudar de projeto limpa a pasta e exige `expectedVersion`;
  - `folderId` com outro projeto é recusado.
- `pins.db.test.ts`: 8 na raiz e mais 8 numa pasta; o 9.º de cada escopo recusado, inclusive com pedidos simultâneos.
- `trash.db.test.ts`:
  - restaurar para uma pasta ativa, e para uma excluída (raiz e `folderGone`);
  - `listTrash` com o nome e `deleted`;
  - excluir de vez e esvaziar com itens de pastas excluídas, que mantêm a linha da pasta.
- `workspace.db.test.ts`: `createDocument` e `createCanvas` com `folderId`; cópia na pasta.
- `navigation.db.test.ts`:
  - `tree` com a lixeira e as pastas excluídas de fora, os limites e as ordenações;
  - as seções por tipo até B5;
  - `projectOverview` com a pasta e `listFolders`.

**MCP:**

- `tools.db.test.ts`: o teto da seção MCP, e "leaves trashed items out and flags archived projects" com as pastas.
- `search.db.test.ts`: `folderId`, `folder`, tarefas fora, `projectId` de outro projeto, pasta excluída.
- `documents.db.test.ts` e `drawings.db.test.ts`: a linha da pasta e a raiz.
- `list_projects` (em `tools.db.test.ts`): ordem das pastas, contagens, excluídas de fora, arquivados com `includeArchived`, corte em 50 com `folderCount`.

**Servidor:** `src/server/mcp.db.test.ts` com `list_projects` com pastas e `search` com `folderId`. O `search` por RPC e o do MCP devolvem os mesmos itens para a mesma entrada com `folderId`.

**Backup:** `scripts/folders-backup.db.test.ts`, no padrão de `projects-backup.db.test.ts`. O snapshot restaurado mantém as pastas ativas e excluídas, `folder_id`, o índice único e os gatilhos: uma inserção que os viola continua recusada no arquivo novo.

**Exemplo:** `seed-target.db.test.ts` continua igual. O `seed:sample` cria as pastas, e `--grande` cria a variante do projeto grande.

### Chrome (`build` e `e2e`, desktop e Pixel 7)

**Ajudantes:**

- `e2e/support/items.ts`: `newDocument` e `newDrawing` passam pelo "+" de Itens › Documento ou Desenho.
- `e2e/support/folders.ts` (novo):
  - `createFolder(page, name)`;
  - `folderRow`, `treeRow` e `expandFolder`;
  - `moveToFolder(page, target)`, pelo M.

  Os seletores usam `treegrid` e `row` pelo nome acessível.

As specs existentes trocam só o caminho de criar e os seletores da lateral, sem mudar o que verificam.

| Spec | Cenários |
| --- | --- |
| `folders.spec.ts` (novo) | **Criar:** pelo "+" de Itens, com "Nova pasta" selecionado; nome vazio cancela; nome repetido com outra caixa dá erro inline; N › Pasta e ⌘K "Nova pasta".<br>**Renomear e reordenar:** F2 e duplo clique, Esc restaura; ⌥↑/⌥↓ e o menu.<br>**Mover:** M com filtro, raiz, "Nova pasta…" que cria e move, "Outro projeto…"; toast com Desfazer e ⌘Z.<br>**Excluir:** os itens vão para a raiz e o Desfazer devolve pasta, posição e fixados; "Excluir pasta e itens…" com diálogo, Lixeira e Desfazer.<br>**Lixeira:** restaurar um item de pasta excluída vai para a raiz, com o aviso.<br>**Fixados:** 8 por escopo, e o 9.º recusado com o nome do escopo.<br>**Páginas:** rótulo do cabeçalho e o popover dele; N e o menu Novo na página de um item de pasta ("Novo documento em MCP").<br>**Índice:** agrupado por padrão, "Sem pasta" por último, filtro Pasta e `?pasta=`; a coluna Pasta só aparece sem agrupar.<br>**⌘K:** a pasta como resultado expande e foca o primeiro filho; caminho à direita.<br>**Visão geral:** "Documento · MCP" |
| `folder-tree.spec.ts` (novo) | **Papéis:** `treegrid`, `row`, `aria-level` e `aria-expanded`.<br>**Teclas:** ↑ ↓ Home End → ← ↵; typeahead com uma letra que não é atalho; N, P, M e G P com o foco numa linha; ⇧F10 na pasta.<br>**Esc:** cancela a renomeação e nunca recolhe pasta nem navega.<br>**Estado aberto:** persiste ao recarregar, por projeto; na primeira visita, só a pasta do item ativo abre; um link para item de pasta fechada a expande e rola até ele.<br>**Escala** (projeto grande): 8 filhos e "Ver todos · n", que abre o Índice filtrado; o item ativo como 9.ª linha; "Ver todos na raiz".<br>**Pasta vazia:** os dois links alcançáveis pelo teclado.<br>**Links:** clique do meio e ⌘-clique abrem outra aba; um clique cria uma entrada só no histórico.<br>**Ponto não salvo** na pasta fechada e no ícone Itens da faixa.<br>**Popover Itens** da faixa recolhida |
| `folder-drag.spec.ts` (novo, só desktop) | Item sobre a pasta (estado de alvo); item no cabeçalho Itens vai para a raiz; item entre filhos vai para a pasta; pasta reordenada pelo arrastar; pasta sobre pasta recusada sem mudança; pasta fechada abre depois do tempo de ativação; Esc cancela o arrasto |
| `navigation.spec.ts` | O limite de fixados passa a ser por escopo. M abre "Mover para pasta…", e mover de projeto passa por "Outro projeto…" |
| `escape.spec.ts` | A sequência ganha a renomeação e o popover "Mover para pasta…" |
| `trash.spec.ts` | Coluna Origem com a pasta |
| `narrow.spec.ts` | Árvore na lateral sobre a página, toque na pasta, "+" e "⋯" visíveis, mover pelo ⋯ da página (Pixel 7) |
| `routes.spec.ts` | `?pasta=` válido, `raiz` e desconhecido |
| `mcp.spec.ts` | `search` com `folderId` sobre itens criados pela interface numa pasta |

**Capturas** nos dois temas, em 1440 e 1280, e no celular, em `docs/screens/`, com dados fictícios do `seed:sample`:

- lateral com pastas, no projeto normal e no grande;
- renomeação inline;
- "Mover para pasta…";
- toast de exclusão;
- Índice agrupado;
- Lixeira com a origem;
- ⌘K com uma pasta;
- faixa com o popover Itens.

Como todas as telas do shell mostram a lateral, as capturas da etapa 08 também são refeitas com a árvore.

## Validação no Chrome real contra o protótipo

Usa bancos temporários e as portas 3491 e 5291. As etapas 07 e 08 usaram 3471/5271 e 3481/5281, e o E2E usa 5171. O banco `data/tinyfold.sqlite` não é aberto, e as portas 3370 e 5170 não são usadas.

```sh
TF_TMP="$(mktemp -d -t tinyfold-09)"
export OWNER_PASSWORD='validacao-pastas-09' PORT=3491 WEB_PORT=5291 \
  APP_ORIGIN=http://localhost:5291 COOKIE_SECURE=false BACKUP_DIR="$TF_TMP/backups"
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm seed:sample
DATABASE_PATH="$TF_TMP/grande.sqlite" mise exec -- pnpm seed:sample --grande
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm dev
# conferir no log: "Banco: <TF_TMP>/tinyfold.sqlite" e "Tinyfold em http://127.0.0.1:3491"
# depois parar o dev e repetir com grande.sqlite para a escala
```

**Exemplo**, de pastas.md §5:

| Projeto | Fixados da raiz | Pastas | Soltos na raiz |
| --- | --- | --- | --- |
| Tinyfold | Visão do produto | **MCP**: MCP somente leitura<br>**Arquitetura**: Notas de arquitetura, Fluxo do autosave | Navegação com projeto no centro |
| Reforma do escritório | Planta do escritório | **Compras**: Orçamento e fornecedores, Lista de compras | — |
| Geral | — | Nenhuma | Ideias soltas, Rabisco de logo |

- **Fixados:** o "Fluxo do autosave" deixa de ser fixado, e a "Planta do escritório" passa a ser.
- **`--grande`:** leva o Tinyfold a 55 itens, como o comando "Simular projeto grande" do protótipo: Produto 11, MCP 12, Arquitetura 18, Operação 8 e 5 na raiz.
- **Destino:** as duas variantes só gravam num banco novo dentro da pasta temporária do sistema, como hoje.

**Roteiro:**

1. **Lado a lado no Google Chrome,** pela extensão Claude in Chrome: `http://localhost:5291` e o protótipo servido como UTF-8 de `127.0.0.1:5299`, na versão "Pastas". Em 1440×900 e 1280×800, nos dois temas, comparar:
   - **Grade da lateral:** 256 px, chevron centrado em x=18, ícones de raiz de x=28 a 44, texto em x=52, filhos com ícone de x=52 a 68 e texto em x=76, guia em x=36, contagens em x=240, linhas de 28 px, Itens com 24 px e fio dos fixados de x=52 a 240. Medir com `getBoundingClientRect`.
   - **Estados da pasta:** fechada, aberta, hover com "+" e "⋯", fechada com o item ativo, ponto não salvo, alvo de arrastar e renomeação com erro.
   - **Escala** no banco grande: 8 filhos, "Ver todos · n", o item ativo como 9.ª linha e "Ver todos na raiz".
   - **Telas:** "Mover para pasta…", rótulo do cabeçalho, toasts com Desfazer, AlertDialog de "Excluir pasta e itens…", Índice agrupado e filtrado, Visão geral, Lixeira com a origem, ⌘K com a pasta e o caminho, filtro da lateral com o grupo Pastas, faixa com o popover Itens.
2. **Teclado:** a tabela da seção [Teclado e Esc](#teclado-e-esc) na árvore, inclusive o typeahead, ⌘Z depois de excluir e de mover, e a sequência do Esc. Nenhum Esc recolhe pasta nem navega.
3. **Arrastar:** os casos da tabela de arrastar, com o indicador no nível certo e o cursor de "não permitido".
4. **Larguras:** em 1024 px, a lateral sobre a página com a árvore e a criação de pasta abrindo a lateral; na emulação de Pixel 7, o toque e o ⋯.
5. **Registro:** as diferenças aceitas vão para `validacao.md`, por exemplo os 800 ms, os fixados por `pinned_at` e o limite de fixados por escopo, que o protótipo conta por projeto. As capturas vão para `docs/screens/`.
6. **Limpeza:** parar o `dev` e o servidor do protótipo e rodar `rm -rf "$TF_TMP"`.

## Critérios de pronto

- [ ] `check`, `test:db`, `build` e `e2e` (desktop e Pixel 7) verdes depois de cada entrega.
- [ ] Migração 006 aplicada sobre bases 005 reais sem mudar dados, com os gatilhos recusando as violações e o banco consistente.
- [ ] Criar, renomear, reordenar, excluir e excluir com os itens, com Desfazer pelo toast e por ⌘Z, e nomes únicos sem caixa e acentos.
- [ ] `moveItem` com pasta, sem conflito com o autosave, e mover de projeto limpando a pasta.
- [ ] Fixados por escopo, com o limite de 8 em cada um, também em concorrência.
- [ ] Lixeira com a origem, e restauração de item de pasta excluída para a raiz, com aviso.
- [ ] Árvore Itens conforme pastas.md: grade de 256 px, ordem, estados, escala, pasta vazia, estado aberto no dispositivo e popover da faixa.
- [ ] Teclado de pastas.md §4 com os atalhos ganhando do typeahead, Esc sem recolher nem navegar, e ⌘Z sem tomar o desfazer dos campos.
- [ ] Arrastar com os destinos da tabela, e recusa de pasta sobre pasta.
- [ ] A pasta no cabeçalho, no menu Novo, no ⌘K, no Índice, na Visão geral e na Lixeira.
- [ ] MCP com pastas em `list_projects`, `folderId` e `folder` em `search`, e a linha da pasta nos cabeçalhos, sem passar de 45.000 caracteres.
- [ ] Arquivos divididos conforme a tabela, sem CSS global novo.
- [ ] Validação no Chrome real contra o protótipo registrada, com bancos temporários e as portas 3491 e 5291.
- [ ] Documentação atualizada conforme a seção final.

## Divisão do trabalho

Dois subagentes no mesmo tree, um depois do outro, como na etapa 08. Cada entrega é um commit e deixa os quatro comandos verdes. A tolerância de `projectNavigation` às seções por tipo permite que o backend entre primeiro.

**1. Backend** (primeiro). Dono de:

- `src/workspace/**` e `src/server/**`;
- `scripts/seed-sample.ts` e `scripts/folders-backup.db.test.ts`.

| Ordem | Entrega (commit) |
| --- | --- |
| B1 | `feat(workspace): add folders to the schema`. Migração 006 com gatilhos e índices, `domain/folders.ts`, `folderId` nos modelos e mapeadores, `FolderRepository`, `folderId` em `createDocument` e `createCanvas`, `testing/folders.ts` e as linhas da 005 em `legacy-workspace.ts`, testes da migração |
| B2 | `feat(workspace): add folder writes with versioned restore`. `application/folders/`, `schemas/folders.ts`, `operations/folders.ts`, `listFolders`, testes das pastas |
| B3 | `feat(workspace): file documents and drawings in folders`. `moveItem` com pasta e as regras de versão, fixados por escopo, restauração com `folderGone`, `listTrash` com a origem, testes |
| B4 | `feat(workspace): show folders in navigation, search and MCP`. `tree` em `projectNavigation` (mantendo as seções), `projectOverview` com a pasta, `search` com `folderId` e `folder`, `list_projects` com pastas, a linha da pasta em `read_*`, o teste do teto, `seed:sample` com pastas e `--grande`, teste de backup |

Ao terminar B4, o backend entrega ao web os contratos e exemplos reais de resposta de `projectNavigation.tree`, `deleteFolder`, `restoreFolder`, `moveItem` e `listTrash`.

**2. Web** (depois de B4). Dono de:

- `src/web/**`;
- `e2e/**` e `docs/screens/*`;
- a documentação final.

| Ordem | Entrega (commit) |
| --- | --- |
| W1 | `feat(web): undo the latest toast with ⌘Z`. `undo` no `ToastProvider`, `acceptsUndo`, ⌘Z, o Desfazer de mover de projeto e o Desarquivar com ⌘Z, testes |
| W2 | `feat(web): replace sidebar sections with the items tree`. Árvore, grade de 256 px, `tree-rows.ts`, estado aberto, cabeçalho Itens com ordenar e recolher, escala, pasta vazia, ponto não salvo, popover Itens da faixa, filtro com Pastas, encaminhamento de teclas e typeahead. O M continua "Mover para projeto…" até W4. Ajudantes de E2E e specs atualizados |
| W3 | `feat(web): add folder actions to the sidebar`. Criar e renomear no lugar, reordenar, menu da pasta, excluir com Desfazer, excluir com os itens, ⇧F10, N e "+" na pasta |
| W4 | `feat(web): move items between folders`. `MoveToFolderPopover` (M, ⋯ da página, ⌘K), "Nova pasta…", "Outro projeto…", toasts, arrastar e soltar, fixados por escopo |
| W5 | `feat(web): show folders across pages`. `FolderLabel` e `lead` no `PageFrame`, menu Novo com a pasta, cópias e importações na pasta, ⌘K (pastas, caminho, comandos), Índice (filtros, agrupar, coluna Pasta sem agrupar, `?pasta=`), Visão geral, Lixeira |
| W6 | `test(e2e): cover folders, tree keyboard and drag`, com as capturas |

**3. Backend** (depois de W6):

- B5, `refactor(workspace): drop per-type sidebar sections`. Saem `documents`, `drawings`, `documentsSort`, `drawingsSort` e `navSection`, se mais ninguém os usar.

**4. Revisão adversarial cruzada** (três revisores somente leitura, em paralelo, com reteste do que for corrigido):

| Revisor | Foco |
| --- | --- |
| Dados e migração | A 006 sobre bases 005 reais; gatilhos e invariantes com SQL direto; `restoreFolder` pulando o que mudou; fixados por escopo em concorrência; idempotência e o conteúdo das respostas guardadas; colisões de `name_key` (NFD, maiúsculas pt-BR); teto e cursores do MCP |
| Árvore: acessibilidade, teclado e arrastar | Semântica `treegrid` e nomes; foco depois de criar, renomear, mover, excluir e desfazer; typeahead contra os atalhos e o acorde G; F2, ⌥↑/⌥↓, ⇧F10; a pilha do Esc; guarda do ⌘Z no editor e no Excalidraw; destinos, zonas mortas e cancelamento do arrastar; toque no celular; popover da faixa |
| Segurança e qualidade | IDs de outro projeto em `createDocument`, `moveItem`, `search`, `pinItem` e nas listas de `restoreFolder`; nomes nas linhas de cabeçalho do MCP; mensagens de erro; tamanho dos arquivos e divisões; duplicação entre a árvore da lateral e a do popover; regras do dependency-cruiser; qualidade dos testes |

**5. Web** (por último):

- W7, a validação no Chrome real e `docs: record stage 09`.

## Riscos

- **O `Tree` do React Aria é `treegrid` e tem typeahead embutido.**
  - Leitores de tela anunciam "grade em árvore", e o protótipo usa `tree`.
  - Mitigação: aceitar a semântica do React Aria, que é um padrão WAI-ARIA, e registrar a diferença. Os atalhos ganham do typeahead por um ouvinte em captura, testado nas duas direções.
- **Arrastar do React Aria:** a ativação é fixa em 800 ms, o `ListDropTargetDelegate` tem zonas antes, sobre e depois, e o cabeçalho Itens precisa de um `useDrop` à parte.
  - Mitigação: `tree-drop.ts` puro e testado, a spec de arrastar e a comparação no Chrome real.
- **Linhas com link interno:** clique do meio, ⌘-clique e histórico duplo. Mitigação: o padrão do Índice, verificado no E2E.
- **Atualização em massa do E2E:** todas as specs criam itens pelo "+" das seções, que deixam de existir. Mitigação: os ajudantes mudam na mesma entrega da árvore (W2), sem mudar o que cada teste verifica.
- **A grade da lateral muda** de 248 para 256 px e de x=40 para x=52 em todas as linhas. Mitigação: comparação com o protótipo e novas capturas da lateral e da faixa.
- **Desfazer:** a lista que volta pode estar desatualizada. Mitigação: o servidor confere cada item e pula os que mudaram; testes de banco de cada caso de pulo.
- **Pastas com mais de 1.000 itens** saem sem Desfazer. É um caso extremo, registrado como aceito.
- **Gatilhos em todo autosave:** uma busca pela chave primária por salvamento. Mitigação: medida no teste de banco.
- **Preferências do dispositivo:** a ordenação volta a Recentes uma vez, ao trocar o formato. O impacto é baixo e fica registrado.
- **MCP:** muitas pastas aumentam `list_projects`. Mitigação: o corte em 50 por projeto e o teste do teto com nomes pesados.
- **Migração:** só acrescenta, então o risco é menor que o da 005. Mesmo assim, a recomendação de operação continua: fazer `pnpm backup:create` antes de subir a versão.

## Documentação ao concluir

| Documento | Atualização |
| --- | --- |
| `arquitetura.md` | Modelo com `workspace_folders`, `folder_id` e gatilhos. Regras de pasta, fixados por escopo e restauração. A árvore de `projectNavigation`. O padrão de desfazer (restauração versionada e ⌘Z no toast). A seção MCP com pastas |
| `produto.md` | Pastas deixam de ser planejadas; o MCP devolve a pasta |
| `decisoes.md` | As decisões técnicas desta página e as respostas do usuário |
| `interface/README.md` e `identidade-visual.md` | Pastas implementadas e a lateral de 256 px |
| `implantacao.md` | Backup antes de subir a versão com a migração 006, e `seed:sample --grande` só para validação |
| `validacao.md` | Comandos executados, cenários, a comparação com o protótipo e as diferenças aceitas |
| `README.md` | "O que funciona" e as capturas |
| `src/workspace/README.md` | Regras de pastas, fixados por escopo, Lixeira com a origem e restauração |
| `etapas/README.md` e esta página | Estado, critérios marcados, Resultado e Desvios |

## Decisões do usuário

Respostas de 2026-10-31, registradas em [decisões](../decisoes.md):

1. **Fixados por escopo:** até 8 na raiz do projeto e até 8 em cada pasta, como no escopo inicial. Mover um item fixado para uma pasta cheia tira o fixado, e o toast avisa. O limite de 8 no projeto inteiro, do protótipo e da etapa 08, foi descartado.
2. **Coluna Pasta no Índice só sem agrupar:** com "Agrupar por pasta" ligado, o padrão, o cabeçalho de cada grupo diz a pasta; desligado, a tabela mostra a coluna Pasta. As alternativas de nunca mostrá-la, como no protótipo, e de mostrá-la sempre foram descartadas.
