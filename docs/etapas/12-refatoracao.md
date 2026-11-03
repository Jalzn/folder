# Etapa 12 — Refatoração

**Estado:** concluída localmente em 2026-11-03. As seis ondas obrigatórias, as correções aprovadas e os quatro opcionais W2.12/B3.34–B3.36 foram implementados. O complemento e seus portões estão registrados abaixo.

As tabelas de ondas e estimativas abaixo preservam o plano original. O processo efetivamente aprovado e executado está em [Critérios de pronto](#critérios-de-pronto), [Resultado](#resultado) e [Desvios](#desvios-do-plano).

## Objetivo

Deixar o código mais fácil de ler e de mudar **sem mudar o comportamento**:

- juntar o que está copiado entre partes paralelas: documento e desenho, pastas, colunas e etiquetas, e os três modelos de leitura;
- dar dono aos estados e às teclas da web;
- trocar as guardas que só existem na documentação por verificações automáticas;
- tornar o E2E isolado e paralelo.

As diferenças de comportamento que as revisões acharam não entram nos commits de refatoração, que as preservam. O usuário decidiu cada uma (ver [Decisões do usuário](#decisões-do-usuário)). As mudanças entram em commits `fix` próprios, logo depois do movimento que as prepara, cada um com um teste que falha antes e passa depois.

## Panorama

O código está saudável:

- **Fronteiras verificadas:** o domínio é puro, e o dependency-cruiser passa sem violações (869 módulos).
- **Arquivos pequenos na infraestrutura:** o maior tem 251 linhas. A exceção do backend são os validadores de conteúdo (BC-9).
- **Núcleos puros testáveis sem React:** os da árvore, do teclado, da fila de escritas, das mudanças de item e do quadro.
- **Guardas boas:** as respostas do MCP têm testes de texto exato, e o gerador de tokens tem teste de paridade e de contraste.
- **Rapidez fora do E2E:** o `check` leva cerca de 12 s, e o `test:db` roda 264 testes em poucos segundos de parede.

A dívida é de **repetição entre partes paralelas** e de **módulos-gaveta**, não de arquitetura:

- **Backend:**
  - documento e desenho repetem o ciclo de vida inteiro;
  - pastas, colunas e etiquetas repetem as mesmas regras de nome e ordem;
  - a união `'document' | 'drawing' | 'task'` está escrita em mais de 14 lugares;
  - erros não têm casa, e a mesma situação recebe códigos diferentes;
  - os três modelos de leitura copiam SQL entre si;
  - o relógio não chega ao `/rpc`.
- **Web:**
  - o protocolo do Desfazer foi copiado à mão duas vezes;
  - `ShellUiProvider` junta 13 estados de 6 assuntos;
  - o autosave genérico tem o rascunho do documento como padrão;
  - teclas e guardas se repetem com regras diferentes;
  - as teclas dos incorporados misturam três tarefas: classificar a seleção, calcular o alvo e ler o DOM;
  - documento e desenho são cópias que já divergiram.
- **Testes e CSS:**
  - o E2E tem 214 testes em série, num banco compartilhado, em 13–22 min;
  - 33 desses testes herdam o projeto deixado pelo anterior;
  - os ajudantes se repetem nas specs;
  - o lint não pega `expect` sem `await` nem `test.only`;
  - o E2E pode rodar contra um bundle velho;
  - a gaveta ignora os tokens de tipo.

## Regras da etapa

- **Um movimento por commit**, verde sozinho, que entra na `main` sem depender do seguinte. A mensagem diz "No behavior change." e lista os IDs.
- **Nenhum teste muda de asserção num commit de refatoração.** Um teste só muda em três casos:
  - quando muda de lugar ou de import;
  - quando troca de ajudante na onda 2, com a mesma intenção;
  - num commit das [correções decididas](#correções-decididas), só na asserção do comportamento decidido.
- **Sem migração nova.** O esquema que as migrações deixam fica idêntico do começo ao fim (o retrato de B1.3).
- **Sem renomear nomes de operação** (`'workspace.X'`), que entram na impressão digital de `core_mutations`. B1.2 os fixa.
- **Correções decididas em commits próprios.** Cada uma leva o número do movimento que a prepara, com uma letra (B3.6a vem logo depois de B3.6), e nunca entra num commit `refactor`.
- **Uma diferença de comportamento achada no meio do caminho** para e vira pergunta ao usuário. Ela não é "corrigida de passagem".

## Achados consolidados

As duplicações entre os relatórios viraram uma linha só, com todos os IDs. A coluna "Onda" aponta os commits.

### Backend

| Tema | IDs | Mudança | Onda |
| --- | --- | --- | --- |
| Tipos de item | BC-3, WP-7, WF-16 (`itemKey`), BI-16 | `domain/items.ts` com `ITEM_TYPES`, `FILED_ITEM_TYPES`, `FiledItem`, `ItemAck` e `RestoreAck`, mais o mapeamento "drawing no contrato, canvas no armazenamento". `models.ts` se divide por agregado. O domínio passa a exportar `EMBED_*`, que a web usa num só módulo (`embed-blocks.ts`) | B3.1, B3.2, W5.1 |
| Ciclo de vida de documento e desenho | BC-1, BC-6 | `requireItem`, `trashItem`, `restoreItem` e `itemAck` por `FiledItemKind`. Os nomes de operação, os acks compactos e a leitura da lixeira só em `getCanvas` não mudam no movimento. `helpers.ts` se desfaz em buscas por agregado, com um caso de uso por arquivo. Pela decisão 1, `getDocument` passa a ler a lixeira, como `getCanvas` | B3.12–B3.14, B3.14a |
| Nomes e ordem de pastas, colunas e etiquetas | BC-2, BC-14, WF-10, TT-7 | Do backend à interface:<br>• `NamedCollection` e `ordering.ts` (`renumber`, `reorderById`);<br>• `nameTakenBy` e `columnDeletionBlocker` puros no domínio, que a web passa a usar;<br>• na web, `InlineNameField` com `ui/inline-field.css`. | B3.7–B3.9, W5.18, W6.8 |
| Catálogo de erros | BC-4 (passo 1), BC-11, BI-10, BI-9 | `application/errors.ts` no workspace e no auth, com frases inteiras e sem montar gênero. O catálogo entra com os textos e códigos de hoje, inclusive as duas frases de conflito de versão. No `/rpc`, `originGuard`, `appErrors` e `httpStatusOf` se separam em `pub`. Depois vêm as correções decididas: a frase do domínio na validação (decisão 4), os códigos alinhados (decisão 3) e uma frase só para o conflito (decisão 7) | B3.4–B3.6, B3.6a, B3.16a, B3.29a |
| Código morto | BC-5, BI-11, WF-20, WP-18 | Saem `authed`, `backupDatabase`, `DomainError.conflict`, os apelidos de pasta, 17 exports do domínio, o apelido `searchableItems` e os exports usados só no próprio arquivo. `MAX_PINNED` passa a ser lido pela web. O ramo morto de `restore-column.ts` sai. Pela decisão 5, `query` e `deleted` saem de `listDocuments` e `listCanvases` | B1.5–B1.7, W1.5, W1.8, B3.14b |
| Raiz de composição e servidor | BI-1, BI-5 | `createWorkspace(db, { clock, timeZone, logError })` substitui quatro fábricas e leva o relógio ao `/rpc`. Do lado do servidor:<br>• `cookieSession` serve `/rpc` e `/arquivos`;<br>• `mountRpc`, `security-headers.ts` e `mountSpa` ficam em módulos próprios;<br>• `RequestContext` perde `db`, `now` e `session.token`. | B1.6, B3.23–B3.25 |
| SQL dos modelos de leitura | BI-2, BI-3, BI-6, BI-9, BI-13, BI-15, BI-16, BI-12 | `infra/sql/` (tabelas, item-tables, mappers, refs, quadro e pastas), com a regra `workspace-read-models-share-sql-only`. Mais:<br>• uma hidratação de tarefa só;<br>• `overdueOn` e `openTask` nomeados, com teste de paridade com `isOverdue`;<br>• `updateAtVersion` no lugar de 11 cópias;<br>• selects estreitos;<br>• leituras longas divididas.<br>Pela decisão 7, os resumos passam a ser cortados por ponto de código. O auxiliar de keyset (BI-12) é opcional | B3.26–B3.31, B3.31a, B3.34 |
| Paginação do Markdown para agentes | BC-8, BI-7 | Na aplicação, `pagedMarkdown` e `optionalCursor`, e `list-order.ts` vai para `domain/paging`. No MCP:<br>• `pagedMarkdownResult`, `keysetJsonResult` e `text-cut.ts`, com o `codePointPrefix` único;<br>• `format.ts` vira `headers.ts`, com `drawingHeader`.<br>Os limites continuam visíveis em cada ferramenta | B3.15–B3.18 |
| Portas e modelos de leitura | BC-7, BC-13 | `ports.ts` vira barril, dividido por agregado, e os modelos de leitura vão para `reading/read-models.ts`. `TaskDetail` vira `TaskForReading`. As portas com strings vizinhas usam argumentos nomeados, e `idempotentWrite` recebe `{ now }`. As datas com marca são opcionais | B3.10, B3.11, B3.32, B3.33, B3.35 |
| Validadores de conteúdo | BC-9 | `content-guards.ts`, `canvas-elements.ts`, `canvas-validation.ts` e `document-validation.ts`, preservando as diferenças entre cena e documento. É fronteira de segurança | B3.19, B3.20 |
| Texto, ordem e paleta no domínio | BC-10 | `domain/text.ts` (`UNTITLED`, `titleOrUntitled` e `collapseWhitespace`), mais `compareCodeUnits`, `byPosition` e `firstUnused` | B3.3 |
| Auth | BC-11 | Um caso de uso por arquivo e `read` → `store`. Mais:<br>• uma porta `TokenSecrets`;<br>• limites de senha nomeados;<br>• `isOffset`;<br>• a tabela de `deviceLabel`.<br>Pela decisão 7, o nome do dono passa pela regra de nomes, com `visibleText` no `core` | B3.5, B3.21, B3.22, B3.22a, B3.22b |
| Esquema e gatilhos | BI-4 | O retrato do esquema por teste, em `schema/current.sql`, fora de `migrations/`. `docs/banco.md` cataloga os cerca de 24 gatilhos e as convenções de migração | B1.3, B1.4 |
| Transações | BI-14 | Um comentário diz que a leitura também reserva o escritor, os `Promise.all` em transação viram awaits em sequência, e `idempotentWrite` recebe o instante | B3.32 |
| Pastas de domínio | BC-15 | `domain/markdown/` e `domain/canvas/`, opcional | B3.36 |

### Web

| Tema | IDs | Mudança | Onda |
| --- | --- | --- | --- |
| Protocolo do Desfazer | WF-1 | Mover para pasta e para projeto passam por `useUndoableChange`, e o núcleo `runUndoableChange` ganha teste sem React. Excluir pasta e arquivar projeto ficam como estão | W4.1, W4.2 |
| Chaves e cache do TanStack Query | WF-2 | `keys.ts` com `itemQuery(type, id)`, mais `cache.ts` para aplicar e invalidar. A invalidação grossa fica | W1.6, W4.8 |
| Sessões e autosave | WF-5, WF-6, WP-4, WF-15 | Em `lib/autosave/`:<br>• um controlador sem padrão de documento;<br>• `status.ts` puro;<br>• `watchPage`, que preserva a diferença de hoje até a decisão 6, quando toda sessão passa a tentar de novo ao esconder a aba.<br>Documento e desenho saem de uma especificação de sessão (`item-session.ts`); a tarefa fica à parte. A sessão vencida só é detectada no link RPC, e há um `signOut()` só. `createStore` e `deviceValue` completam | W4.3–W4.7, W4.6a, W4.19 |
| Provedores do shell | WF-3, WF-4, WF-12 | `AppProvider` se divide em dono, itens novos e diálogo de projeto, com `useApp` como fachada e `useCreateInProject`. `ShellUiProvider` se divide por assunto. `AppLayout` ganha regiões, `useSidebarMode` e `ShellOverlays` | W4.11–W4.14 |
| Referências tardias e slots | WF-7, WP-11 | `useLatest`, `useStableHandlers` e um `useCommandSlot` substituem seis mecanismos de "componente empresta comandos a outro" | W4.9, W4.10 |
| Teclas, guardas e comandos | WF-8, WF-9, WF-14, WP-8, WP-15, WP-14 | A tabela `KEYS` e a API pública do teclado, com a seção "Modelo de teclado". Mais:<br>• as guardas do shell reaproveitadas no quadro, na gaveta, nos campos, no Índice e em Etiquetas;<br>• um registro de comandos para a paleta e os atalhos;<br>• os comandos do item aberto descritos uma vez.<br>Pela decisão 7, o checkbox com foco deixa de contar como campo no quadro e na gaveta | W4.15–W4.18, W4.16a, W5.10, W5.16 |
| Camadas da web | WF-13, TT-14 | Regras do dependency-cruiser. `use-action.ts`, `use-undoable-change.ts` e `item-changes.tsx` vão para `shell/writes/`, o que tira a importação de `lib` → `ui`. `router/` se separa de `navigation/`. Os subbarris do shell se tornam explícitos | B1.1, W4.22 |
| Organização de `lib` e contrato do DOM | WF-16, WF-17, WF-18, WF-19 | `lib/` por assunto, com os `shortDate` renomeados. Mais:<br>• constantes do contrato do DOM;<br>• ajudantes de foco juntos;<br>• a importação da matemática em fases;<br>• um teste de que toda rota de projeto se lê. | W1.7, W4.20, W4.21, W4.23 |
| Teclado dos incorporados | WP-1, WP-2, WP-3 | `embed-keymap.ts`, do qual sai a lista de teclas seguradas. Os alvos ficam em `embed-selection.ts` e `embed-targets.ts`, puros e testados no esquema real. O contorno da deriva do Chrome fica em `selection-drift.ts`, com `driftDecision` puro. A política e os tempos da proteção não mudam | W5.0–W5.5 |
| Página do item aberto | WP-4, WP-5, WP-6, WP-17 | `useItemEditor`, `ItemEditorDialogs` e `HiddenFileInput`. `createBeside` serve a cópias e importações, e `downloadDraft` e `isFinalRefusal` ficam compartilhados. As vistas de carregamento dos incorporados também. As diferenças da tabela de derivas viram opção explícita no movimento, e as correções decididas as alinham: o documento na lixeira, o desenho em projeto arquivado, o campo de arquivo, a importação, o rascunho baixado e a cópia | W5.6–W5.8d |
| Gaveta e quadro | WP-9, WP-10, WP-12, WP-13, WP-16 | `NewTaskForm` e `TaskEditor` se dividem, e `task-property-rows.tsx` e `task-writes.ts` ficam compartilhados. `BoardPage` se divide em menu, filtro e endereço. Mais `useConfirmation` e `TrashDialog`. Pela decisão 7, a lixeira pela gaveta reenvia uma vez a resposta perdida | W5.11–W5.17, W5.11a |
| Nomes | WP-18 | Os nomes passam a valer para a web:<br>• `CanvasEditor` → `DrawingEditor` e `canvas-session` → `drawing-session`, só na web;<br>• um tipo do editor de blocos;<br>• componentes importados pelo índice;<br>• `editableTitle`, `useOpenTaskId`, `useLabelMap`, `paths.permanent` e `renderLightPreview`;<br>• a nota de projeto arquivado como constante.<br>Os comentários perdem a narrativa e mantêm os IDs de revisão | W1.8, W5.19–W5.22 |

### Testes, ferramentas e CSS

| Tema | IDs | Mudança | Onda |
| --- | --- | --- | --- |
| Lint e configuração | TT-2, TT-10 | `noPlaywrightMissingAwait`, `noFocusedTests` (só em testes), `noDescendingSpecificity` e `forbidOnly` na CI. `noPlaywrightWaitForTimeout` entra como aviso, e `tailwindDirectives` sai. Um `serverEnv` só, e o E2E recusa um bundle mais velho que o código | W1.1, W1.2 |
| Arnês dos testes de banco | BC-12, BI-8, TT-13 | `core/testing/temp-database.ts` com `useTempDatabase` e `testClock`. `workspace/testing/database.ts` com `useWorkspaceDb({ clock, timeZone })`, e `testing/builders.ts` com `request`, `paragraph` e `check`. Mais:<br>• `server/testing/test-app.ts`;<br>• `testing/legacy/`;<br>• `backupRoundTrip` para os scripts.<br>Os arquivos temporários continuam isolados | B2.1–B2.4 |
| Ajudantes do E2E | TT-3, TT-11, TT-17 | `support/` por área: `shell`, `document`, `api`, `network`, `pointer` e `text`. A lateral abre pela largura, sem sondagem. Os atalhos têm nome: `appShortcut`, `hostShortcut` e `hostKey` | W2.1–W2.5 |
| Isolamento e paralelismo do E2E | TT-1, TT-4, TT-8, TT-9, TT-16, TT-12 | Fixtures `page` autenticado, `project` por RPC e `api` tipada pelo `AppRouter`. Mais:<br>• dispositivo por sufixo e tag;<br>• specs por área, com `@smoke`;<br>• um servidor por worker, com `@timing` em série;<br>• o relógio do Playwright nas asserções de "nada foi salvo". | W2.6–W2.13 |
| Exemplo | TT-18 | Uma função por projeto do exemplo, na mesma ordem de escrita, e as faixas da `--grande` por tabela | B2.5 |
| Tokens e convenções de CSS | TT-5, TT-6, TT-19 | O papel `500 13/20` na escala, e os tokens nos valores idênticos da gaveta, dos diálogos e dos chips. O editor recebe o tipo por `--editor-type`. Mais:<br>• larguras nomeadas;<br>• estado por `data-*`;<br>• um teste de convenções que começa como catraca na onda 1.<br>Pela decisão 7, a descrição da tarefa no escuro passa a 400 | W1.3, W6.1–W6.3, W6.2a, W6.11 |
| Primitivas e arquivos de CSS | TT-7, TT-15, WF-11 | `SearchableMenu` com `ui/menu-filter.css`, e a árvore reaproveitando a linha da lateral. `LabelPicker` usa `LabelSquare`. `drawer.css` e `embeds.css` se dividem por componente, e `inline-math.css` passa aos tokens. Pela decisão 7, o filtro de projetos exige todas as palavras, os filtros dos menus ganham as mesmas medidas e os campos de nome a mesma cor de erro e o mesmo peso | W6.4–W6.10, W6.7a, W6.7b, W6.8a |

### Fora da etapa

- **Migração 008 para os gatilhos** (BI-4, alternativa): o banco real ainda está na etapa 07 e vai aplicar 005 a 007 numa subida só.
- **Marca nos IDs** (BC-13): a própria revisão desaconselha.
- **Trocar para o UPDATE estreito do item** (BC-1, passo opcional): muda o SQL ao lado dos gatilhos sem ganho visível.
- **`item-changes` em excluir pasta e arquivar projeto** (WF-1): mudaria qual Desfazer some. Não é refatoração, e nenhuma revisão o pede.
- **Fora pelo "Não mexer" das revisões:** `@layer`, utilitários `.t-*` e `.truncate`, Page Objects, `features/`, banco `:memory:`, biblioteca de estado e `useMutation`.

## Ondas

Seis ondas. A ordem de partida (guardas, backend, fundações da web, funcionalidades da web, testes e CSS) mudou num ponto: **o arnês de testes sobe para a onda 2**. Cada commit da etapa roda o E2E completo. Hoje ele leva 13–22 min, e depois do isolamento e de um servidor por worker deve levar cerca de 5–8 min. Com cerca de 170 commits, adiantar isso economiza mais de um dia de máquina. As fixtures também barateiam os testes de caracterização das ondas 4 e 5. O CSS fica por último, porque depende das divisões da gaveta e dos seletores juntos.

As correções decididas entram na onda do movimento que as prepara. A tabela [Correções decididas](#correções-decididas) junta todas, com o teste de cada uma.

| Onda | Assunto | Dono | Começa |
| --- | --- | --- | --- |
| 1 | Guardas e limpeza | Backend e web, em paralelo | Na aprovação |
| 2 | Arnês de testes | Backend (banco) e web (E2E) | Depois da onda 1 |
| 3 | Consolidação do backend | Backend | Depois da parte do backend da onda 2. Corre junto das ondas 2 a 5 da web, pois as árvores são disjuntas |
| 4 | Fundações da web | Web | Depois da onda 2 |
| 5 | Funcionalidades da web | Web | Depois da onda 4 e de B3.1, B3.7 e B3.14a |
| 6 | CSS e primitivas de interface | Web | Depois da onda 5 |

"Chrome" marca os commits que pedem a passagem manual no Chrome real, ao ritmo de uma pessoa, antes de entrar.

### Onda 1 — Guardas e limpeza

| # | Commit | IDs | Dono | Chrome |
| --- | --- | --- | --- | --- |
| B1.1 | `chore(deps): cruise scripts and e2e and keep the web's ui layer a leaf` | TT-14, WF-13 | Backend | — |
| B1.2 | `test(server): pin the RPC inputs and the write operation names` | guarda nova | Backend | — |
| B1.3 | `test(workspace): snapshot the schema the migrations leave` | BI-4 | Backend | — |
| B1.4 | `docs: catalogue the database triggers and the migration conventions` | BI-4 | Backend | — |
| B1.5 | `refactor(core): drop the unused authed alias, backupDatabase and DomainError.conflict` | BC-5, BI-10 | Backend | — |
| B1.6 | `refactor(server): drop the RPC context fields no procedure reads` | BI-5 | Backend | — |
| B1.7 | `refactor(workspace): drop unused exports, folder name aliases and the searchableItems alias` | BC-5, BI-11 | Backend | — |
| W1.1 | `chore(lint): catch unawaited Playwright calls, focused tests and descending specificity` | TT-2 | Web | — |
| W1.2 | `test(e2e): share the server settings and refuse a stale web bundle` | TT-10 | Web | — |
| W1.3 | `test(web): refuse new raw fonts, unknown variables and stray breakpoints in CSS` | TT-5, TT-19 | Web | — |
| W1.4 | `test(e2e): capture the sample pages for a pixel comparison` | TT-5 | Web | — |
| W1.5 | `refactor(web): export the write runner type, share the item key and read MAX_PINNED from the domain` | WF-20, WF-16, BC-5 | Web | — |
| W1.6 | `refactor(web): add a query key factory and item queries` | WF-2 | Web | — |
| W1.7 | `test(web): check that every project route parses` | WF-19 | Web | — |
| W1.8 | `refactor(web): drop exports used only in their own file` | WP-18, WF-20 | Web | — |

Notas sobre os commits:

- **B1.1:** liga só as regras que já dão 0 violações: `scripts-through-entry-points`, `e2e-type-only`, `testing-helpers-stay-in-tests` estendida a `scripts/`, `web-ui-knows-no-app` e `web-nothing-imports-pages`. `web-lib-is-a-leaf` entra como `warn` até W4.22.
- **B1.2:** o retrato da lista de procedimentos e do JSON Schema de cada entrada (`z.toJSONSchema`, do Zod 4), e o conjunto dos nomes passados a `ctx.write`. É a guarda dos movimentos de BC-1, BC-6, BI-1 e BI-11.
- **W1.3:** os valores de hoje entram como exceções nomeadas, uma a uma. A onda 6 as tira.
- **W1.4:** a rede visual. O script fica à parte (`e2e:visual`), fora do `e2e`. Ele captura o exemplo nos dois temas, em 1440 px e no Pixel 7. As referências saem do commit-base de cada onda, na pasta de rascunho, e não são versionadas, porque dependem da máquina.

**Portões:** os quatro comandos em cada commit.

- **Evidência dos guardas:** o lint recusa um arquivo de prova com `test.only` e `expect` sem `await`; o `deps` passa sobre `src`, `scripts` e `e2e`.
- **Retratos (B1.2 e B1.3):** são criados; nenhum outro arquivo de teste muda.
- **E2E:** a mesma lista de testes executados (`playwright test --list`, comparada).

**Chrome:** nenhum commit da onda pede a passagem manual.

### Onda 2 — Arnês de testes

| # | Commit | IDs | Dono | Chrome |
| --- | --- | --- | --- | --- |
| B2.1 | `test: add temp database and clock helpers to core/testing` | BC-12, BI-8 | Backend | — |
| B2.2 | `test(workspace): share the workspace database harness and builders`, um commit por pasta | BI-8, TT-13 | Backend | — |
| B2.3 | `test(server): one app fixture for the server tests` | BI-8 | Backend | — |
| B2.4 | `test(scripts): share the backup round trip` | TT-13 | Backend | — |
| B2.5 | `refactor(scripts): seed each sample project in its own function` | TT-18 | Backend | — |
| B2.6 | `test(workspace): split the persistence and adversarial cases by area` | TT-16 | Backend | — |
| W2.1 | `test(e2e): gather the toast, announcer and editor locators in support` | TT-3 | Web | — |
| W2.2 | `test(e2e): one helper to write a document and wait for its save` | TT-3 | Web | — |
| W2.3 | `test(e2e): gather RPC builders and network faults in support` | TT-3 | Web | — |
| W2.4 | `test(e2e): name the app, host and editor shortcuts in one keyboard module` | TT-17 | Web | — |
| W2.5 | `test(e2e): open the sidebar overlay by the layout, not by a probe` | TT-11 | Web | — |
| W2.6 | `test(e2e): add signed-in, project and api fixtures` | TT-1 | Web | — |
| W2.7 | `test(e2e): start <área> specs in a project of their own`, um commit por área | TT-1 | Web | — |
| W2.8 | `test(e2e): type RPC calls with the app router` | TT-8 | Web | — |
| W2.9 | `test(e2e): target the phone and the desktop by file suffix and tag` | TT-9 | Web | — |
| W2.10 | `test(e2e): group specs by area and add a smoke subset` | TT-16 | Web | — |
| W2.11 | `test(e2e): run one server per worker, with timing specs kept serial` | TT-4 | Web | — |
| W2.12 | Opcional: `ci: shard the browser tests across two runners` | TT-4 | Web | — |
| W2.13 | `test(e2e): prove nothing was saved with the page clock instead of waiting` | TT-12 | Web | — |

Notas sobre os commits:

- **W2.7:** começa pelos 33 testes que herdam o projeto.
- **W2.12:** só vale quando houver remoto; sem ele, o `ci.yml` não roda.
- **W2.13:** onde o relógio falso não servir ao Excalidraw ou ao BlockNote, o wait fica com `biome-ignore` e o motivo. Os números do ritmo de uma pessoa ganham nome em `support/pace.ts`.

**Portões:** os quatro comandos em cada commit, mais estas conferências:

- **Banco:** `test:db` com os mesmos 264 testes, pelos mesmos nomes, em cada commit de B2.2.
- **E2E:** os mesmos testes executados no desktop e no Pixel 7, pela lista de títulos. Depois de W2.9, os 130 pulados somem do relatório, mas o conjunto executado é o mesmo.
- **Paralelismo:** depois de W2.11, cinco rodadas seguidas do E2E completo, sem falha intermitente. O tempo de cada rodada vai para a validação.
- **Exemplo:** o seed grava o mesmo banco: `seed-sample.db.test.ts` e `e2e/seed-sample.spec.ts` passam sem mudança.

**Chrome:** nenhum commit da onda pede a passagem manual. O app não muda.

### Onda 3 — Consolidação do backend

Os testes de caracterização entram primeiro.

| # | Commit | IDs | Dono |
| --- | --- | --- | --- |
| B3.0a | `test(workspace): pin trash and restore of documents and drawings across folders, pins and archived projects` | antes de BC-1 e BI-9 | Backend |
| B3.0b | `test(workspace): pin what the board, the drawer and the agents read for the same tasks` | antes de BI-2 e BI-3 | Backend |
| B3.0c | `test(workspace): list the refusals of the scene and document validators` | antes de BC-9 | Backend |
| B3.1 | `refactor(workspace): add the shared item types to the domain` | BC-3, WP-7 | Backend |
| B3.2 | `refactor(workspace): split domain models by aggregate` | BC-3 | Backend |
| B3.3 | `refactor(workspace): share text, order and palette helpers in the domain` | BC-10 | Backend |
| B3.4 | `refactor(workspace): collect application error messages in one catalogue` | BC-4 | Backend |
| B3.5 | `refactor(auth): collect auth error messages and password limits` | BC-4, BC-11 | Backend |
| B3.6 | `refactor(core): keep the origin guard apart from the error mapping in the RPC base` | BI-10 | Backend |
| B3.6a | `fix(core): keep the domain's message on an RPC validation error` | decisão 4, BI-10 | Backend |
| B3.7 | `refactor(workspace): move the pure name and column rules to the domain` | BC-14 | Backend |
| B3.8 | `refactor(workspace): share the named-collection rules of folders, columns and labels` | BC-2 | Backend |
| B3.9 | `refactor(workspace): renumber and reorder through one helper` | BC-2 | Backend |
| B3.10 | `refactor(workspace): split application ports by aggregate` | BC-7 | Backend |
| B3.11 | `refactor(workspace): split reading ports from read models and rename TaskForReading` | BC-7 | Backend |
| B3.12 | `refactor(workspace): move project, document and canvas lookups out of helpers` | BC-6 | Backend |
| B3.13 | `refactor(workspace): trash and restore documents and drawings through one item kind` | BC-1 | Backend |
| B3.14 | `refactor(workspace): one use case per file for projects, documents, canvases and pins` | BC-6 | Backend |
| B3.14a | `fix(workspace): read trashed documents for their owner, as drawings` | decisão 1 | Backend |
| B3.14b | `refactor(workspace)!: drop query and deleted from the document and drawing lists` | decisão 5, BI-11 | Backend |
| B3.15 | `refactor(workspace): share markdown paging and optional cursors in reading` | BC-8 | Backend |
| B3.16 | `refactor(workspace): move list order keys to the domain` | BC-8 | Backend |
| B3.16a | `fix(workspace): answer the same situations with the same error codes` | decisão 3, BC-4 | Backend |
| B3.17 | `refactor(mcp): share the code point cut and the text helpers` | BI-7 | Backend |
| B3.18 | `refactor(mcp): one paged Markdown result for read_document and read_task` | BI-7 | Backend |
| B3.19 | `refactor(workspace): share content guards between the scene and document validators` | BC-9 | Backend |
| B3.20 | `refactor(workspace): split scene and document validation from their models` | BC-9 | Backend |
| B3.21 | `refactor(auth): one token secrets port and a named autocommit store` | BC-11 | Backend |
| B3.22 | `refactor(auth): split the auth service by use case` | BC-11 | Backend |
| B3.22a | `refactor(core): move the visible text rule to the core domain` | decisão 7, BC-11 | Backend |
| B3.22b | `fix(auth): pass the owner's name through the name rules` | decisão 7, BC-11 | Backend |
| B3.23 | `refactor(server): read the cookie session in one place for /rpc and /arquivos` | BI-5 | Backend |
| B3.24 | `refactor(server): mount /rpc, the security headers and the SPA from their own modules` | BI-5 | Backend |
| B3.25 | `refactor(workspace): build the router, service, tools and files from one runtime` | BI-1 | Backend |
| B3.26 | `refactor(workspace): move the SQL the read models share to infra/sql` | BI-2, BI-16 | Backend |
| B3.27 | `refactor(workspace): one task hydration for the board, the drawer and the agents` | BI-3 | Backend |
| B3.28 | `refactor(workspace): name the open and overdue task predicates once` | BI-6 | Backend |
| B3.29 | `refactor(workspace): run versioned updates through one helper` | BI-9 | Backend |
| B3.29a | `fix(workspace): say a version conflict in one sentence` | decisão 7, BC-4 | Backend |
| B3.30 | `refactor(workspace): split the long reads in search, embeds and trash` | BI-15 | Backend |
| B3.31 | `perf(workspace): select only the columns hydration and lists use` | BI-13 | Backend |
| B3.31a | `fix(workspace): cut item summaries by code point` | decisão 7, BI-13 | Backend |
| B3.32 | `docs(core): say reads take the same immediate transaction as writes` | BI-14 | Backend |
| B3.33 | `refactor(workspace): name the easily swapped repository arguments` | BC-13 | Backend |
| B3.34 | Opcional: `refactor(workspace): keyset predicates from one helper` | BI-12 | Backend |
| B3.35 | Opcional: `refactor(core): brand civil dates and instants` | BC-13 | Backend |
| B3.36 | Opcional: `refactor(workspace): group markdown and canvas domain modules in folders` | BC-15 | Backend |

Notas sobre os commits:

- **B3.0a:** cobre a pasta excluída (`folderGone`), o fixado perdido e mantido, o projeto arquivado e a repetição com o mesmo ID de pedido, que devolve o mesmo ack. Fixa também as duas frases de conflito, a de antes e a de durante o UPDATE.
- **B3.0b:** etiquetas na ordem, checklist, referência de coluna, documentos de origem e atraso, iguais nos três modelos.
- **B3.0c:** cada limite e cada frase de hoje, para a cena e para o documento.
- **B3.1:** o domínio exporta também `EMBED_PROPS`, `EMBED_KINDS` e `isEmbedType`.
- **B3.4:** as duas frases de conflito ficam até B3.29a.
- **B3.6:** `originGuard`, `appErrors`, `httpStatusOf`, `publicProcedure` e `fileUpload`. O texto genérico de `VALIDATION` fica até B3.6a.
- **B3.20:** os validadores são fronteira de segurança. As diferenças entre cena e documento ficam explícitas.
- **B3.25:** a mudança é só de fiação. Em produção, o relógio já é o do sistema.
- **B3.26:** traz a regra `workspace-read-models-share-sql-only`, e `infra/db.ts` vira `infra/sql/tables.ts`.
- **B3.28:** inclui o teste de paridade com `isOverdue`.
- **B3.32:** troca os `Promise.all` dentro de transação por awaits em sequência, e `idempotentWrite` recebe `{ now }`.
- **B3.22a:** é só um movimento, sem mudança, e prepara B3.22b.
- **Correções (com letra):** o teste de cada uma está em [Correções decididas](#correções-decididas).

**Portões:** os quatro comandos em cada commit, mais estas conferências:

- **Retratos:** o do esquema (B1.3) e o do contrato RPC e dos nomes de operação (B1.2) não mudam, salvo o do contrato em B3.14b, que tira `query` e `deleted` das entradas.
- **Textos exatos:** os testes do MCP passam sem edição.
- **Testes de banco:** os de hoje passam sem mudar de asserção nos commits de refatoração, e os de caracterização (B3.0a a B3.0c) são novos. Numa correção, muda só a asserção do comportamento decidido, como a frase de B3.0a em B3.29a.
- **Fronteiras:** `deps` com 0 violações, inclusive a regra nova de B3.26.

**Chrome:** nenhum commit pede a passagem manual. A revisão adversarial cobre a equivalência, e as correções da onda chegam à interface só por mensagens e códigos, que os testes conferem.

### Onda 4 — Fundações da web

Os testes de caracterização entram primeiro.

| # | Commit | IDs | Dono | Chrome |
| --- | --- | --- | --- | --- |
| W4.0a | `test(web): pin the autosave listeners of open editors and background sessions` | antes de WF-5, WP-4 e WF-6 | Web | — |
| W4.0b | `test(web): list every shortcut and the targets that silence it, as today` | antes de WF-8, WF-9 e WP-15 | Web | — |
| W4.0c | `test(e2e): cover the undo of folder and project moves by toast and ⌘Z` | antes de WF-1 | Web | — |
| W4.1 | `refactor(web): route folder and project moves through useUndoableChange` | WF-1 | Web | Chrome |
| W4.2 | `test(web): cover the undoable change protocol without React` | WF-1 | Web | — |
| W4.3 | `refactor(web): detect an expired session in the RPC link only` | WF-6 | Web | — |
| W4.4 | `refactor(web): sign out through one function` | WF-6 | Web | — |
| W4.5 | `refactor(web): move autosave into lib/autosave without a document default` | WF-5 | Web | — |
| W4.6 | `refactor(web): share the page listeners of an autosave` | WF-5 | Web | — |
| W4.6a | `fix(web): retry a failed save when the tab hides, in open editors too` | decisão 6, WF-5 | Web | — |
| W4.7 | `refactor(web): build the document and drawing autosave sessions from one spec` | WP-4 | Web | Chrome |
| W4.8 | `refactor(web): patch and invalidate the cache through lib/queries/cache` | WF-2 | Web | — |
| W4.9 | `refactor(web): add useLatest, useStableHandlers and command slots` | WF-7, WP-11 | Web | — |
| W4.10 | `refactor(web): lend task, embed and page commands through slots` | WF-7, WP-11 | Web | Chrome |
| W4.11 | `refactor(web): split AppProvider into owner, new items and the project dialog` | WF-4 | Web | Chrome |
| W4.12 | `refactor(web): create items in a project through one hook` | WF-4 | Web | Chrome |
| W4.13 | `refactor(web): split the shell UI state by concern`, até quatro commits | WF-3 | Web | Chrome |
| W4.14 | `refactor(web): host the shell overlays and the sidebar mode outside AppLayout` | WF-12 | Web | Chrome |
| W4.15 | `refactor(web): name every shortcut key once` | WF-8 | Web | Chrome |
| W4.16 | `refactor(web): reuse the shell's key guards in fields, the index, the board, the drawer and the labels dialog` | WF-8, WP-15 | Web | Chrome |
| W4.16a | `fix(web): let board and drawer keys act with the focus on a checkbox` | decisão 7, WP-15 | Web | Chrome |
| W4.17 | `refactor(web): one command registry for the palette and the shortcuts` | WF-9 | Web | Chrome |
| W4.18 | `refactor(web): describe the open item's commands once` | WF-14 | Web | Chrome |
| W4.19 | `refactor(web): add createStore and device storage helpers` | WF-15 | Web | — |
| W4.20 | `refactor(web): group lib into autosave, writes, text, dates and react` | WF-16 | Web | — |
| W4.21 | `refactor(web): name the DOM contract and gather the focus helpers` | WF-17 | Web | Chrome |
| W4.22 | `chore(web): enforce ui, lib and shell boundaries with dependency-cruiser` | WF-13, TT-14 | Web | — |
| W4.23 | `refactor(web): split the Markdown math import into phases` | WF-18 | Web | — |

Notas sobre os commits:

- **W4.0a:** esconder a aba, a rede voltar e sair da página, em cada estado (pendente, erro e conflito). Cobre também as recusas definitivas e a falha ao apagar o rascunho guardado. Vale para `use-autosave-lifecycle` e para `listenInBackground`.
- **W4.0b:** uma tabela da tecla, do escopo e do que a silencia (campo, sobreposição, desenho). Inclui o checkbox no quadro e na gaveta, como é hoje.
- **W4.0c:** cobre Desfazer, ⌘Z e "O item mudou depois", completando o que `open-item-move` e `folders` ainda não cobrem.
- **W4.6:** `watchPage(…, { retryOnHide })` mantém a diferença de hoje, e W4.6a a tira.
- **W4.7:** os E2E `draft-isolation`, `open-item-move`, `canvas` e `adversarial` passam sem mudança.
- **W4.8:** feito em conjunto com as sessões de W4.7.
- **W4.13:** um commit por provedor (sobreposições, pedidos da lateral, slot da página e filtros do quadro), num ramo curto com W4.11 a W4.14.
- **W4.16:** a regra antiga do checkbox fica como `isFieldTarget`, e W4.16a a tira.
- **W4.22:** move `use-action.ts`, `use-undoable-change.ts` e `item-changes.tsx` para `shell/writes/` e separa `navigation/` de `router/`. `web-lib-is-a-leaf` vira erro.

**Portões:** os quatro comandos em cada commit, mais estas conferências:

- **E2E:** a mesma lista executada, mais os testes de caracterização.
- **Retratos da onda:** W4.0a e W4.0b só mudam em W4.6a e W4.16a, nas linhas que a decisão muda.
- **Fronteiras:** `deps` sem `warn` no fim da onda.

**Chrome:** a passagem manual cobre os commits marcados:

- **Desfazer:** de mover, pelo toast e pelo ⌘Z.
- **Esc:** em camadas, com a paleta, a lateral sobreposta e a gaveta.
- **Atalhos:** os de uma letra, e os modificadores com o foco em cada tipo de alvo, inclusive F, P e ⌥↑/⌥↓ com o foco num checkbox depois de W4.16a.
- **Teclas seguradas:** N e o ⌘K com um documento novo.
- **Foco:** a volta do foco ao fechar cada diálogo.
- **Autosave:** com a rede caindo e voltando, e com duas abas em conflito.

### Onda 5 — Funcionalidades da web

| # | Commit | IDs | Dono | Chrome |
| --- | --- | --- | --- | --- |
| W5.0 | `test(web): cover where the embed keys take the selection, on the document schema` | WP-2, antes do movimento | Web | — |
| W5.1 | `refactor(web): name the embed blocks in one module` | WP-7, BC-3 | Web | — |
| W5.2 | `refactor(web): derive the embed selection hold's keys from the embed keymap` | WP-1 | Web | Chrome |
| W5.3 | `refactor(web): read an embed selection's kind in one pure module` | WP-2 | Web | Chrome |
| W5.4 | `refactor(web): work out the embed keys' targets apart from applying them` | WP-2 | Web | Chrome |
| W5.5 | `refactor(web): keep Chrome's selection drift workaround in one module` | WP-3 | Web | Chrome |
| W5.6 | `refactor(web): share the embed blocks' loading and fallback views` | WP-17 | Web | — |
| W5.7 | `refactor(web): share the open item page's wiring between document and drawing` | WP-5 | Web | Chrome |
| W5.7a | `fix(web): keep a trashed document's editor while it holds unsaved text` | decisão 1, WP-5 | Web | Chrome |
| W5.7b | `fix(web): make drawings read-only in archived projects` | decisão 2, WP-5 | Web | Chrome |
| W5.7c | `fix(web): keep the drawing's hidden file input out of the Tab order` | decisão 7, WP-5 | Web | Chrome |
| W5.8 | `refactor(web): one way to create an item beside the open one, for copies and imports` | WP-6 | Web | — |
| W5.8a | `fix(web): guard document imports and report their session errors as drawings do` | decisão 7, WP-6 | Web | — |
| W5.8b | `fix(web): announce every draft download the same way` | decisão 7, WP-6 | Web | — |
| W5.8c | `fix(web): stop a document or drawing copy whose target is gone` | decisão 7, WP-6 | Web | — |
| W5.8d | `fix(web): trim the titles of document and drawing copies` | decisão 7, WP-6 | Web | — |
| W5.9 | `refactor(web): give the document editor's late-bound callbacks one home` | WP-8 | Web | — |
| W5.10 | `refactor(web): move the document page commands and the task-from-excerpt choice to hooks` | WP-8, WF-14 | Web | Chrome |
| W5.11 | `refactor(web): share the task writes that move a task back and trash it` | WP-13 | Web | — |
| W5.11a | `fix(web): resend a lost trash answer once from the task drawer` | decisão 7, WP-13 | Web | — |
| W5.12 | `refactor(web): build the drawer's property rows in one place` | WP-10 | Web | — |
| W5.13 | `refactor(web): split the new task form into its draft, guard and creation` | WP-9 | Web | Chrome |
| W5.14 | `refactor(web): move the open task's drawer commands to a hook` | WP-9 | Web | Chrome |
| W5.15 | `refactor(web): split the board page's menu, label filter and task address` | WP-12 | Web | Chrome |
| W5.16 | `refactor(web): split the labels dialog's focus and new row` | WP-14 | Web | Chrome |
| W5.17 | `refactor(web): one trash confirmation and one way to keep a dialog's value while it closes` | WP-16 | Web | — |
| W5.18 | `refactor(web): check names and column deletion with the domain's rules` | BC-14 | Web | — |
| W5.19 | `refactor(web): type the block editor once` | WP-18 | Web | — |
| W5.20 | `refactor(web): import components through their index` | WP-18 | Web | — |
| W5.21 | `refactor(web): name the drawing page's files after the drawing` | WP-18 | Web | — |
| W5.22 | `refactor(web): share the small item helpers and trim history comments` | WP-18 | Web | — |

Notas sobre os commits:

- **W5.0:** usa o harness do BlockNote real e fixa o comportamento atual, antes de qualquer movimento.
- **W5.2:** traz `embed-keymap.test.ts`, que liga o keymap às teclas seguradas.
- **W5.5:** traz `selection-drift.test.ts`. A política, os 80 ms e o `isTrusted` não mudam.
- **W5.7:** cada diferença da tabela de derivas vira opção explícita, com o valor de hoje. De W5.7a a W5.8d, as correções mudam os valores decididos.
- **W5.7a:** depende de B3.14a na `main`.
- **W5.10:** ⌘⌥T e "Criar tarefa da seleção" com a gaveta, e o checkbox "Incorporar no documento".
- **W5.22:** os ajudantes são `editableTitle`, `useOpenTaskId`, `useLabelMap`, `paths.permanent`, `renderLightPreview` e a nota de projeto arquivado. Os comentários perdem a narrativa e mantêm os IDs de revisão.

**Portões:** os quatro comandos em cada commit.

- **E2E:** `embed-keys` (com `@timing`, em série), `embeds`, `drawing-embed`, `origin-marker`, `task-drawer`, `board`, `labels`, `draft-isolation` e `canvas` passam sem mudar.
- **Testes novos:** `embed-targets.test.ts`, `embed-keymap.test.ts` e `selection-drift.test.ts`.

**Chrome:** W5.2 a W5.5 pedem uma sessão inteira no Chrome real, nos incorporados, ao ritmo de uma pessoa:

- **Setas:** atravessam uma sequência de cards e figuras.
- **Seleção:** ⇧↑ e ⇧↓ a estendem, ⌘↑ e ⌘↓ vão às pontas, e Page Up e Page Down não fazem nada.
- **Remover:** ⌫ e Delete em duas vezes, com Desfazer.
- **Digitar e colar:** digitar, colar e Tab num card selecionado.
- **Ponteiro e outros meios:** clicar depois das teclas, e o leitor de tela sem a proteção.

**Chrome nos demais commits marcados:**

- **Página do item:** a ordem do Tab, o campo de arquivo, os diálogos de cópia e de importação e os rascunhos.
- **Tarefa nova:** as teclas seguradas, o ⌘↵ e Esc com o texto digitado.
- **Quadro:** F, N, os movimentos por teclado e `?tarefa=`.
- **Etiquetas:** o foco ao criar, renomear e excluir.
- **Correções decididas:** o documento excluído em outra aba com texto não salvo; o desenho num projeto arquivado, só para leitura também pelo teclado; a ordem do Tab da página do desenho.

### Onda 6 — CSS e primitivas de interface

Antes de cada commit, a rede visual de W1.4 compara as capturas com as referências do commit-base da onda.

| # | Commit | IDs | Dono | Chrome |
| --- | --- | --- | --- | --- |
| W6.1 | `refactor(web): add the medium UI text role to the type scale` | TT-5 | Web | — |
| W6.2 | `style(web): use the type and height tokens in the drawer, dialogs and chips` | TT-5 | Web | — |
| W6.2a | `style(web): give the task description its 400 weight in the dark theme` | decisão 7, TT-5 | Web | — |
| W6.3 | `style(web): let each host set the block editor's type through variables` | TT-6 | Web | — |
| W6.4 | `style(web): split drawer.css by component and give the label chip its own rules` | TT-15 | Web | — |
| W6.5 | `style(web): move the embed picker and origin marker styles next to their components` | TT-15 | Web | — |
| W6.6 | `style(web): align inline-math.css with the tokens and the field focus ring` | TT-15 | Web | — |
| W6.7 | `refactor(ui): add SearchableMenu with the menu filter styles`, um consumidor por commit | WF-11, TT-7 | Web | Chrome |
| W6.7a | `fix(web): filter projects by every word` | decisão 7, WF-11 | Web | Chrome |
| W6.7b | `style(web): give the menu filters the same measures` | decisão 7, TT-7 | Web | — |
| W6.8 | `refactor(ui): add InlineNameField with the inline field styles`, um consumidor por commit | WF-10, TT-7 | Web | Chrome |
| W6.8a | `style(web): unify the rename fields' error colour and weight` | decisão 7, TT-7 | Web | — |
| W6.9 | `style(web): let the tree reuse the sidebar row rules` | TT-7 | Web | — |
| W6.10 | `refactor(web): draw the label picker's colour with LabelSquare` | TT-7 | Web | — |
| W6.11 | `style(web): name layout widths and keep state in data attributes` | TT-19 | Web | — |

Notas sobre os commits:

- **W6.2:** troca só os valores idênticos aos tokens.
- **W6.3:** confere a medida 15/24 com `getComputedStyle`, como o E2E da etapa 10.
- **W6.6:** troca só os valores idênticos. Os que estão fora da grade ficam na lista de exceções.
- **W6.7:** os consumidores são projetos, mover para pasta, etiquetas e incorporados.
- **W6.8:** os consumidores são pasta, coluna e etiqueta. Os valores de hoje ficam preservados por variável.
- **W6.11:** troca `.is-current`, `.is-last-pin` e `.is-drop-target` por atributos, com os 2 seletores do E2E.

**Portões:** os quatro comandos em cada commit, mais estas conferências:

- **Pixels:** a comparação dá zero diferença nos dois temas, em 1440 px e no Pixel 7, nos commits de refatoração. Em W6.2a, W6.7b e W6.8a, a diferença fica só nos elementos decididos, e as capturas novas passam a ser a referência.
- **Catraca de CSS:** a lista de exceções do teste de W1.3 encolhe e, no fim, só tem exceções com motivo escrito.

**Chrome:** nos filtros, digitar, as setas, ↵, Esc e o filtro vazio. Nos campos de nome, ↵, Esc, sair do campo, o nome repetido com o erro, e o celular.

### Correções decididas

As [decisões do usuário](#decisões-do-usuário) viram 21 commits, mais o movimento B3.22a, que prepara B3.22b. Cada commit entra logo depois do movimento que o prepara e traz um teste que falha antes e passa depois.

| Decisão | Commit | Onda | Teste |
| --- | --- | --- | --- |
| 1 | B3.14a `fix(workspace): read trashed documents for their owner, as drawings` | 3 | `getDocument` devolve o documento da lixeira com `deletedAt`, e `saveDocument` nele continua recusado |
| 1 | W5.7a `fix(web): keep a trashed document's editor while it holds unsaved text` | 5, depois de B3.14a | E2E: o documento excluído por RPC com um rascunho pendente mantém o editor, com a faixa, "Baixar rascunho" e "Salvar como cópia". Sem nada local, a página mostra o aviso da lixeira |
| 2 | W5.7b `fix(web): make drawings read-only in archived projects` | 5 | E2E: o desenho de um projeto arquivado abre só para leitura, com a faixa, e nenhum salvamento sai |
| 3 | B3.16a `fix(workspace): answer the same situations with the same error codes` | 3 | Banco: cada situação da tabela da decisão 3 com o código novo. Depois da integração da onda 3, a web acrescenta ao E2E `folder-retries` o caso da pasta de referência excluída em outra aba, que passa a dizer que a lista mudou |
| 4 | B3.6a `fix(core): keep the domain's message on an RPC validation error` | 3 | `server.db.test.ts`: um incorporado inválido pelo `/rpc` responde a frase do domínio, e um erro de esquema sem ela responde o texto genérico |
| 5 | B3.14b `refactor(workspace)!: drop query and deleted from the document and drawing lists` | 3 | Banco: a lista ignora as duas chaves. O retrato do contrato (B1.2) muda só neste commit |
| 6 | W4.6a `fix(web): retry a failed save when the tab hides, in open editors too` | 4 | A tabela de W4.0a: o editor aberto em erro tenta de novo ao esconder a aba; em conflito ou recusa definitiva, não |
| 7 | B3.22b `fix(auth): pass the owner's name through the name rules`, depois do movimento B3.22a | 3 | Banco do auth: um nome com caracteres invisíveis e um emoji na posição 100 |
| 7 | B3.29a `fix(workspace): say a version conflict in one sentence` | 3 | B3.0a: o conflito durante o UPDATE passa à frase completa |
| 7 | B3.31a `fix(workspace): cut item summaries by code point` | 3 | Banco: um emoji na posição 280 do resumo não é partido |
| 7 | W4.16a `fix(web): let board and drawer keys act with the focus on a checkbox` | 4 | A tabela de W4.0b e o E2E do checkbox passam ao comportamento do shell |
| 7 | W5.7c `fix(web): keep the drawing's hidden file input out of the Tab order` | 5 | E2E: a ordem do Tab da página do desenho |
| 7 | W5.8a `fix(web): guard document imports and report their session errors as drawings do` | 5 | Unidade: uma segunda importação durante a primeira é ignorada, e a falha da sessão é avisada |
| 7 | W5.8b `fix(web): announce every draft download the same way` | 5 | E2E: o toast e o nome do arquivo no documento, no desenho e na tarefa |
| 7 | W5.8c `fix(web): stop a document or drawing copy whose target is gone` | 5 | Unidade de `isFinalRefusal`: `NOT_FOUND` encerra a cópia |
| 7 | W5.8d `fix(web): trim the titles of document and drawing copies` | 5 | Unidade: o título da cópia sem os espaços das pontas |
| 7 | W5.11a `fix(web): resend a lost trash answer once from the task drawer` | 5 | E2E: a resposta perdida da lixeira pela gaveta é reenviada uma vez, com o mesmo ID de pedido |
| 7 | W6.2a `style(web): give the task description its 400 weight in the dark theme` | 6 | E2E: o peso calculado da descrição no escuro é 400; nas capturas, só a descrição muda |
| 7 | W6.7a `fix(web): filter projects by every word` | 6 | Unidade do filtro: palavras fora de ordem e não contíguas acham o projeto |
| 7 | W6.7b `style(web): give the menu filters the same measures` | 6 | As capturas dos quatro popovers, conferidas contra o protótipo; as exceções de W1.3 encolhem |
| 7 | W6.8a `style(web): unify the rename fields' error colour and weight` | 6 | E2E: a cor calculada do erro é a de `--danger` nos três campos |

## Verificação

### Em todo commit

```sh
mise exec -- pnpm check
mise exec -- pnpm test:db
mise exec -- pnpm build
mise exec -- pnpm e2e   # desktop e Pixel 7; servidores e portas por worker
```

Antes de W2.11, cada execução reservava uma faixa de portas com `E2E_PORT`. Na retomada, cada worker passou a obter uma porta disponível do sistema, com servidor e SQLite temporários próprios. As portas do uso real e de outros testes não são reutilizadas. O servidor confirma que conseguiu escutar antes da consulta de prontidão.

A equivalência se prova por quatro evidências:

- **Testes intactos:** nenhum teste existente muda de asserção num commit de refatoração (ver [Regras](#regras-da-etapa)). Numa correção decidida, muda só a asserção do comportamento decidido.
- **Mesmos E2E:** a mesma lista de testes executados.
- **Retratos estáveis:** o do esquema (B1.3), o do contrato RPC e dos nomes de operação (B1.2), os textos exatos do MCP e os tokens.
- **Revisão do diff:** a revisão do diff de testes na revisão adversarial.

Um retrato que mude num commit de refatoração para o trabalho.

### Testes de caracterização antes dos movimentos arriscados

| Movimento | Antes de mover | Onde |
| --- | --- | --- |
| Autosave e sessões (WF-5, WP-4, WF-6) | W4.0a (ouvintes por estado), um teste de unidade do 401 no meio de um salvamento e dois E2E, se faltarem:<br>• a gaveta fechada com a descrição não salva e o servidor falhando, que tenta de novo quando a rede volta e avisa ao sair;<br>• a sessão vencida durante o autosave, que mantém o rascunho e leva à entrada. | `lib/autosave/*.test.ts`, `e2e/sync/` |
| Desfazer (WF-1) | W4.0c: mover para pasta e para projeto, com Desfazer pelo toast, ⌘Z e "O item mudou depois" | `e2e/tree/` |
| Teclado, comandos e provedores (WF-3, WF-8, WF-9, WF-12, WF-14, WP-15) | W4.0b (a tabela das teclas e dos alvos), mais um E2E de F, P e ⌥↑/⌥↓ com o foco no checkbox "Incorporar no documento", fixando o comportamento de hoje | `shell/keyboard/*.test.ts`, `e2e/shell/` |
| Teclas dos incorporados (WP-1, WP-2, WP-3) | W5.0 (`embed-targets.test.ts`, no esquema real); `embed-keymap.test.ts` e `selection-drift.test.ts`, escritos no próprio movimento e conferidos contra o E2E `embed-keys` ao ritmo de uma pessoa | `editor/blocks/` |
| Ciclo de vida e gatilhos (BC-1, BI-9) | B3.0a, mais o retrato do esquema. O catálogo de `docs/banco.md` diz que teste cobre cada gatilho | `application/*.db.test.ts` |
| SQL dos modelos de leitura (BI-2, BI-3, BI-6, BI-13) | B3.0b e o teste de paridade de `overdueOn` | `infra/**/*.db.test.ts` |
| Validadores (BC-9) | B3.0c | `domain/*.test.ts` |
| Composição e servidor (BI-1, BI-5, BI-10) | Os testes de servidor de hoje (cookie e bearer, origem recusada, cabeçalhos, 401, `/arquivos` com 304 e 404), mais um teste de que o `/rpc` e o MCP leem o mesmo instante com relógio fixo | `server/*.db.test.ts` |
| CSS (onda 6) | A rede visual de W1.4 | `e2e:visual` |

### Revisão adversarial ao fim de cada onda

Um revisor somente leitura recebe o intervalo de commits da onda e esta página, sem as conclusões do agente. A pergunta é uma só: **o que pode ter mudado de comportamento?** O que for corrigido volta ao mesmo revisor para reteste.

| Onda | Foco da equivalência |
| --- | --- |
| 1 | Exports removidos sem uso dinâmico; as regras novas não escondem uma exceção; o retrato pega uma mudança de gatilho de propósito (o revisor tenta) |
| 2 | Os testes migrados verificam a mesma coisa (nenhuma asserção mais fraca, nenhum `await` perdido); nenhum teste passou a depender de outro; o paralelismo não esconde falhas intermitentes |
| 3 | Para cada movimento:<br>• a ordem dos efeitos dentro da transação e os gatilhos que disparam;<br>• o código, o status e o texto de cada erro;<br>• os nomes de operação e a impressão digital;<br>• os acks compactos;<br>• a leitura da lixeira;<br>• os limites do MCP;<br>• o instante e o fuso usados. |
| 4 | O momento de cada efeito (pelos ouvintes de página, toasts e foco); as closures velhas por trás de `useLatest`; a identidade das ações; a ordem dos ouvintes de teclado e a pilha do Esc; o que cada sobreposição faz ao abrir dentro de outra; as escritas na fila por instância |
| 5 | Os alvos de cada tecla em cada tipo de seleção; a proteção da seleção (tempos, `isTrusted`, a tecla ⇧ sozinha); as opções das derivas com o valor de hoje; a criação ao lado (destino, toast, título) |
| 6 | Pixels nos dois temas; a herança de `letter-spacing` nos `<input>`; a especificidade depois das divisões; as variáveis por lugar com os valores de hoje |

### Validação no Chrome real

A validação roda num banco temporário do `seed:sample`, em portas próprias, definidas no começo de cada onda. Ela é feita por uma pessoa ou por um agente ao ritmo de uma pessoa, com pausas entre as teclas, e fica registrada em [validação](../validacao.md). As listas estão em cada onda.

## Divisão do trabalho

São dois subagentes, como nas etapas 09 a 11. Cada um trabalha numa worktree própria, na pasta de rascunho da sessão (nunca em `.claude/worktrees/`), a partir de `main`, nos ramos `refactor/backend` e `refactor/web`.

- **Entrada na `main`:** cada commit entra na `main` por rebase ao fim da sua onda, depois da revisão adversarial. Um commit que a revisão recusar não segura os anteriores.
- **Backend:** dono de `src/core`, `src/auth`, `src/workspace`, `src/server` e `scripts`. Na onda 1, também de `.dependency-cruiser.cjs`.
- **Web:** dono de `src/web`, `e2e`, `biome.json`, `playwright.config.ts`, dos scripts do `package.json` e de `.github/workflows`. Em W4.22, também de `.dependency-cruiser.cjs`.
- **Arquivos compartilhados:** um dono por onda. A documentação final é da web, como nas etapas anteriores, e o backend escreve `docs/banco.md` e a sua parte de `arquitetura.md`.
- **Carga da máquina:** com os dois agentes rodando o E2E ao mesmo tempo, as specs `@timing` podem falhar por carga, como em `576ce85`. Uma falha intermitente é investigada, nunca repetida até passar. Se ela se repetir, as rodadas completas dos dois agentes passam a ser feitas uma de cada vez.

## Estimativa

Ordem de grandeza. As horas incluem implementar, rodar os portões e corrigir o que a revisão achar. Elas não incluem a revisão adversarial (cerca de 1 a 2 h por onda) nem a espera da pessoa na validação manual.

| Onda | Commits | Horas de agente | Sessões no Chrome |
| --- | --- | --- | --- |
| 1 — Guardas e limpeza | 15 | ~10 (backend ~4, web ~6) | 0 |
| 2 — Arnês de testes | ~28 (backend ~8, com B2.2 por pasta; web ~20, com um por área em W2.7) | ~18 (backend ~4, web ~14) | 0 |
| 3 — Backend | 44, com os 8 commits das decisões, mais 3 opcionais | ~29 | 0 |
| 4 — Fundações da web | ~31, com W4.13 em até quatro e 2 correções | ~25 | 2 |
| 5 — Funcionalidades da web | 31, com 8 correções | ~25 | 3 (uma só para os incorporados) |
| 6 — CSS e primitivas | ~20, com um consumidor por commit em W6.7 e W6.8 e 4 correções | ~13 | 1 |
| **Total** | **~170** | **~120** | **6** |

A onda 3 corre em paralelo com as ondas 2 a 5 da web, e por isso o tempo corrido fica perto da soma das ondas da web (~85 h). Antes de W2.11, o E2E completo de cada commit leva 13–22 min; depois, a estimativa da revisão é de 5–8 min.

## Riscos

- **"Sem mudança" é difícil de provar no React.** A ordem dos efeitos, as closures velhas e a identidade das funções mudam sem quebrar tipo. Mitigação: os testes de caracterização antes, a passagem no Chrome e a revisão com esse foco.
- **Teclado e deriva da seleção do Chrome.** São sensíveis a tempo e só aparecem no Chrome real. Mitigação:
  - `@timing` em série;
  - a sessão inteira de W5.2 a W5.5 ao ritmo de uma pessoa;
  - a política e os tempos da proteção no "Não mexer".
- **Gatilhos e transações.** Mover SQL pode mudar a ordem dos comandos e quais gatilhos disparam. Mitigação: o retrato do esquema, B3.0a, o catálogo de gatilhos e as operações em lote mantidas item a item.
- **Impressão digital das escritas.** Renomear uma operação quebraria os reenvios por até 30 dias. Mitigação: B1.2.
- **Banco real ainda na etapa 07.** A etapa não acrescenta migração, e o retrato prova isso.
- **Paralelismo do E2E.** Mais carga traz mais falhas de tempo. Mitigação: `@timing` em série, as cinco rodadas seguidas de W2.11 e nenhuma repetição automática.
- **Ruído na comparação de pixels.** Fontes e suavização variam entre máquinas. Mitigação: as referências saem da mesma máquina, do commit-base da onda, e não são versionadas.
- **Conflitos de rebase.** Cerca de 170 commits em dois ramos. Mitigação: as árvores são disjuntas, os arquivos compartilhados têm um dono por onda e a entrada é ao fim de cada onda.
- **Correção de passagem.** Uma diferença achada no meio vira pergunta ao usuário, não um ajuste dentro de um `refactor`. A revisão confere isso.
- **Correções no meio da refatoração.** As 21 correções decididas mudam comportamento entre commits que não podem mudá-lo. Mitigação: cada uma é um commit próprio, com letra, logo depois do movimento, com o teste que falha antes; a revisão da onda confere o movimento antes da correção.
- **Aba antiga.** Os contratos só mudam nas correções decididas. A web não envia `query` nem `deleted` (B3.14b). Uma aba antiga que receba um código alinhado (B3.16a) trata `VERSION_CONFLICT` e `DOMAIN_RULE` como já trata os conflitos e as recusas definitivas.

## Não mexer

As revisões concordam nestes pontos. Eles valem para todos os commits.

**Dados, transações e contratos**

- **Nomes de operação literais** em `ctx.write('workspace.X', …)` e `canonical()` com `localeCompare`: entram na impressão digital de `core_mutations`.
- **`readTransaction` e `writeTransaction` com o mesmo corpo** (`BEGIN IMMEDIATE`): trocar para `DEFERRED` é decisão de concorrência. Basta o comentário de B3.32.
- **As migrações aplicadas e os gatilhos com efeito** (`workspace_columns_done_handover` e `_kept`): sem migração 008 agora.
- **O executor de migrações:** as chaves estrangeiras desligadas e o `foreign_key_check` antes do `COMMIT` (desvio da etapa 10).
- **Os laços por item nas operações em lote** (`deleteColumn`, `restoreFolder`, `restoreColumn` e `emptyTrash`): cada item confere a versão e passa pelos gatilhos.
- **Padrões que não convém adotar:** uma porta por caso de uso, tipos Result e um command bus. `WorkspaceRepository` é a unidade de trabalho, e o registro `operation(schema, run)` já é comando com handler.
- **Desvios aceitos nas etapas:**
  - as listas de Desfazer como palavra do cliente;
  - `strictObject` só nas escritas de tarefa;
  - escritas sem registro de pedido (`pinItem`, `unpinItem`, `saveCanvasPreview` e `createAccessToken`);
  - gravar num documento ou desenho excluído continua recusado. A leitura da lixeira, hoje só de `getCanvas`, passa ao documento só em B3.14a (decisão 1).
- **`'drawing'` no contrato e `canvas` no armazenamento:** só documentar o mapeamento. A troca de nome da onda 5 é só da web.
- **IDs de incorporado em minúsculas:** `EMBED_ID` e `isCanvasId`, sem trocar por `z.uuid()`. As duas regex idênticas podem virar uma constante.
- **Os gatilhos que repetem regras da aplicação:** são defesa em profundidade.
- **Sem marca nos IDs.**
- **Módulos que parecem densos, mas estão certos:**
  - `markdown-emphasis.ts`;
  - os comentários de `visible-text.ts` e `names.ts`;
  - `canvas-outline.ts`;
  - `migrate.ts`;
  - `excerpt-windows.ts`;
  - o atalho `scene_version === version`;
  - a regex de UUID em `idempotentWrite`;
  - `itemTable` com tipo por união.
- **Fronteiras:**
  - `Owner` em `core/application`;
  - as mensagens do MCP diferentes das do RPC;
  - as portas separadas de `reader/` e `navigation/`;
  - `AgentTool` independente do SDK.
- **MCP:**
  - a cadeia `withToolErrors` → `withoutHiddenText` → `withTextCeiling`;
  - a ordem das verificações de `/mcp` e a leitura do corpo antes do SDK;
  - `/.well-known/*` dentro de `mountMcp`;
  - `READING_LIMITS` e `MCP_LIMITS` visíveis em cada ferramenta.
- **`testing/fixtures/stage-09-*.sql`:** não regenerar.

**Web**

- **Os núcleos puros com hooks finos:**
  - árvore: `tree-keys`, `tree-drop` e `tree-rows`;
  - teclado: `chords`, `guards`, `layers`, `commands` e `palette-*`;
  - escritas: `toast-undo`, `write-queue`, `item-changes`, `session-pool` e `held-typing`;
  - quadro: `board-keys`, `board-drop`, `board-columns` e `board-text`;
  - documento e listas: `embed-view`, `embed-removal`, `origin-places`, `trash-groups`, `index-rows` e `completed-groups`.
- **A invalidação grossa** (`refreshWorkspace()` depois de toda escrita): sem atualização otimista e sem `useMutation`.
- **As duas estratégias de ID de pedido:** `useRequest().for(input)` e `requestId()` com `onceMoreIfLost`. Só embrulhar, sem fundir.
- **O toast de uma vaga, com o ⌘Z**, e a pilha do Esc junto das sobreposições do React Aria.
- **As teclas seguradas** (`held-typing.ts`) e o polling por quadros de `ui/focus.ts`. O foco vai por referência, nunca por seletor.
- **Diálogos, rotas e filas:**
  - `AlertDialog` como único caminho de confirmação;
  - `paths.ts` com `navigate({ href })`;
  - sobreposições como estados independentes;
  - a fila por instância de `useAction`.
- **Sem biblioteca de estado nova.** Também ficam o algoritmo de `markdown.ts` e `useBoardMoves`, que calcula o lugar quando a fila roda.
- **A proteção da seleção dos incorporados, com a mesma política e os mesmos tempos:**
  - os 80 ms;
  - a parte que fica até outra tecla;
  - o `focus()` no keydown;
  - o `pointerdown` em captura;
  - o ⇧ sozinho.
- **Os contornos do editor:**
  - `domObserver.flush()` com `isTrusted`;
  - `runsBefore: ['nodeSelectionKeyboard']`;
  - a âncora do seletor como getter;
  - `EmbedsProvider` sem estado de módulo.
- **Lugar e padrões:** `components/task-drawer/` fica onde está. Não adotar container e presentational, pastas por feature, nem um ajudante para os `...(x ? { x } : {})`.
- **Os comentários com IDs de revisão** (A2, B-f, M4…): encurtar só a narrativa.

**Testes, ferramentas e CSS**

- **Seletores por papel e nome acessível:** sem espalhar `data-testid`. Os nomes dos testes também ficam.
- **Arquitetura dos testes:** sem Page Objects em classes, sem `:memory:` nem banco-modelo nos testes de banco, e sem um pré-commit mais barato que o `check`.
- **CSS:** sem `@layer` por ora, sem utilitários `.t-*` nem `.truncate`, e sem limpeza de CSS morto (não há).
- **O gerador de tokens e `tokens.test.ts`.**
- **O ritmo de uma pessoa em `embed-keys.spec.ts`:** os números ganham nome, e os testes ficam.
- **Exemplo:** o servidor próprio de `seed-sample.spec.ts`, e a separação entre os dados (`sample-content.ts`) e a escrita (`seed-sample.ts`), com os três testes do exemplo.
- **`mise.toml`:** só fixa as versões.

## Critérios de pronto

O processo abaixo incorpora a simplificação aprovada pelo usuário; as tabelas das ondas conservam o planejamento original.

- [x] As seis ondas obrigatórias concluídas, com commits por assunto; `check` por commit de código e `test:db` nas mudanças de backend. Build e E2E completos por lote.
- [x] Esquema, contrato RPC e nomes de operação preservados nesta retomada; os testes dos retratos passaram.
- [x] Os 220 cenários anteriores preservados, mais sete casos das correções finais: 227 aprovados, sem pulados ou intermitentes.
- [x] Revisão integrada do resultado, com reteste dos achados; sem revisão adversarial separada por onda, conforme a decisão de processo.
- [x] Passagens no Chrome real do Herdr registradas, incluindo a matriz dos incorporados com pausas de 150 ms. Seleção por outro meio foi verificada via DOM; não houve ensaio com VoiceOver físico.
- [x] `deps` cobre `src`, `scripts` e `e2e`, sem violações; exceções de CSS conservam motivos.
- [x] E2E isolado e em paralelo, com tempos registrados; 40 retratos visuais aprovados.
- [x] Todas as correções decididas implementadas em commits separados dos movimentos, com testes de regressão; as quatro restantes da onda 6 falharam antes e passaram depois.

## Documentação ao concluir

| Documento | Atualização |
| --- | --- |
| `banco.md` | Os gatilhos, o que cada um garante e qual teste o cobre; as convenções de migração e o retrato do esquema |
| `arquitetura.md` | A raiz de composição, `infra/sql/`, o item arquivado (`FiledItem`), o catálogo de erros e os códigos alinhados, a leitura da lixeira também para documentos, as camadas da web e as regras do dependency-cruiser, e o "Modelo de teclado" (WF-8) |
| `produto.md` | O documento excluído com texto local mantém o editor, e o desenho de um projeto arquivado só lê |
| `processo.md` e `AGENTS.md` | `e2e:smoke`, `e2e:visual`, os workers, `@timing`, a recusa do bundle velho e as fixtures |
| `decisoes.md` | As decisões já estão registradas; ao concluir, o que a implementação mudar |
| `src/workspace/README.md` | Os tipos de item, os erros e a paginação dos agentes |
| `validacao.md` | Os portões de cada onda, as revisões, as passagens no Chrome e os tempos do E2E antes e depois |
| `etapas/README.md` e esta página | O estado, o Resultado e os Desvios |

## Resultado

O fechamento partiu de `main` em `5ead3a3`, no ramo `refactor/complete-stage12` e no worktree `../tinyfold-refactor`. A implementação anterior e as retomadas dos helpers de E2E foram preservadas. Esta retomada concluiu as pendências obrigatórias das seis ondas, incluindo a onda 6 inteira. As evidências estão em [validação](../validacao.md#fechamento-da-etapa-12).

| Área | Entrega final |
| --- | --- |
| Guardas e testes | Caracterização do ciclo de vida, leitura de tarefas e recusas de conteúdo; fixtures automáticas de projeto; specs agrupados; helpers de banco, servidor e backup; relógio controlado onde aplicável; ritmos reais nomeados; suíte visual de 40 capturas; teste de todas as rotas de projeto |
| Domínio e aplicação | Modelos e portas por agregado, `FiledItem`, acks compactos, texto e ordem compartilhados, catálogos de erros, ciclo de vida de documento/desenho, casos de uso por arquivo, coleções nomeadas, paginação e validadores compartilhados com políticas preservadas; auth com porta dos segredos |
| Infraestrutura | Uma composição `createWorkspace`, fronteiras HTTP separadas, sessão por cookie compartilhada, `infra/sql/`, hidratação de tarefas com políticas explícitas, predicados com teste de paridade, UPDATE versionado, selects estreitos, argumentos nomeados e transações sequenciais; seed por projeto |
| Shell | Estado por assunto, regiões do layout, criação no projeto, registro comum de comandos, descritores do item aberto, comandos com publicação passiva e handlers atuais; navegação fora de rotas; bibliotecas por assunto e entradas públicas verificadas |
| Funcionalidades | Callbacks e comandos de documento extraídos; criação ao lado; rascunho, guarda, criação e comandos de tarefa separados; propriedades compartilhadas; menu, filtro e endereço do quadro; foco e nova etiqueta; confirmação/lixeira comum; tipos, nomes e vistas auxiliares compartilhados |
| CSS e primitivas | `ui-medium`, tokens equivalentes, tipo do editor por host, CSS por componente, `SearchableMenu`, `InlineNameField`, regras comuns das linhas da lateral, `LabelSquare`, larguras nomeadas e estados em `data-*` |

As últimas diferenças aprovadas entraram isoladas: descrição escura com peso 400 (`a2f342d`), filtro de projeto por todas as palavras (`109978e`), medidas comuns dos quatro filtros (`c5993d6`) e campos de renomear com peso 500 e erro `--danger` (`5110e1a`). Somam-se às correções de backend e web já entregues e às respostas do usuário ao fim da etapa anterior.

O último portão funcional aprovou 745 unitários, 287 testes de banco e 227 E2E em 8 min 1,6 s, sem falhas, intermitentes, pulados ou retries. Os 40 retratos passaram nos dois temas e tamanhos. O Chrome do Content Viewer do Herdr foi usado em uma instalação SQLite temporária, incluindo rede, conflito entre abas, teclado e foco. Não houve deploy nesta retomada.

### Complemento: quatro opcionais

Depois do fechamento obrigatório, o usuário pediu também os quatro opcionais. O complemento parte de `704978d`, no ramo `refactor/stage12-optionals`, no mesmo worktree. As tabelas acima preservam a classificação opcional do plano original.

| Item | Implementação |
| --- | --- |
| **W2.12** | `d245bfd`: CI com dois shards dos projetos desktop/celular, timing separado em um worker e relatório HTML unificado dos três blobs. Cada runner constrói seu próprio bundle. |
| **B3.34** | `f4d17b1`: `afterKeyset` parametrizado, com direção por chave; projetos, busca, tarefas e concluídas compartilham o predicado. SQLite temporário cobre empates, ranks constantes e todas as posições do cursor. |
| **B3.35** | `b714e5d`: marcas `CivilDate` e `IsoInstant`, propagadas por domínio, portas, tabelas e interface. Relógios e validadores estabelecem os tipos; JSON, SQLite, mensagens e contratos mantêm suas representações. |
| **B3.36** | `ee95dea`: 24 arquivos de domínio e testes agrupados em `markdown/` e `canvas/`, com imports atualizados e exports públicos preservados. |

O Orbis foi consultado para datas civis e CI; seu alias de data virou uma marca nominal no Tinyfold, mantendo o cálculo existente por `Intl`. Migrações aplicadas e snapshots de contratos não foram alterados. Os portões deste complemento estão em [validação](../validacao.md#complemento-da-etapa-12).

A conferência no Chrome do Herdr revelou ainda texto branco sobre fundo branco nos blocos de código. A regra já estava na base; `77c5503` corrige a cor com o token do tema, em commit próprio, com regressão que falhou antes e passou depois em desktop/celular e claro/escuro.

A execução hospedada do workflow depende de um remoto ainda não configurado. Backups remotos automáticos e teste em dispositivos físicos continuam nas [pendências de operação](README.md#pendências-de-operação).

## Desvios do plano

- **Processo aprovado:** depois da primeira onda, o usuário autorizou commits por assunto, movimentos agrupados, `check` por commit de código, `test:db` no backend e build/E2E por lote. Uma revisão integrada substituiu revisões adversariais independentes por onda. As correções de comportamento mantiveram commits próprios e testes de regressão. O fechamento foi realizado sem subagentes.
- **Ordem e caracterização:** as entregas anteriores corrigiram comportamentos antes de todas as extrações. A retomada caracterizou os contratos já corrigidos antes de mover sua implementação. W4.0a–W4.0c são cobertos pelas tabelas de `watchPage`, `runUndoableChange` e pelos E2E de foco, lixeira e pastas, sem snapshots redundantes.
- **Exports e contratos:** `folderName`, `folderNameKey`, `documentLead` e `EmbedBlockType` permanecem públicos pelos consumidores existentes. Os retratos de contrato incluem a entrada enviada e a transformada, e o teste de reenvio fixa a impressão digital. O esquema do workspace não inclui o auth, respeitando o limite entre módulos.
- **Slots:** a primeira tentativa de `useStableHandlers`/`useCommandSlot` foi retirada na revisão anterior. A implementação final mantém presença real de comandos opcionais, leitura atual das funções e publicação passiva, com teste de identidade/ausência e E2E de timing.
- **E2E:** portas são atribuídas pelo sistema; cada worker possui banco, processo e conta. A adoção gradual de fixtures terminou: cenários comuns recebem um projeto automaticamente; o exemplo usa `isolatedTest`. O teste que criava outro documento agora espera sua URL antes de editar. As cinco rodadas de estabilidade do isolamento já haviam sido executadas; o fechamento fez um portão completo por lote.
- **Intermitência anterior da gaveta:** a corrida ao mudar uma tarefa de projeto foi corrigida antes desta retomada, seguindo a tarefa assim que a resposta chega. O fechamento preservou a correção e passou o cenário no E2E completo.
- **Seed:** a revisão detectou que uma chamada extra ao relógio avançável alterava datas do exemplo. O relógio de recibos idempotentes foi separado do relógio de edição do seed (`e5655e0`), preservando as datas esperadas sem alterar o relógio normal do serviço.
- **CSS:** movimentos preservaram os pixels, incluindo tracking de inputs e a cor original do risco de checklist, sensível à ordem dos imports. Só as quatro mudanças aprovadas atualizaram a referência. Medidas sem equivalência exata ficaram nas exceções documentadas; nenhum `@layer` ou utilitário de tipografia foi introduzido.
- **Capturas visuais:** o horário real atravessava a data relativa do exemplo. A suíte fixa navegador, seed e servidor no mesmo instante, com timers reais. O retrato móvel de etiquetas inicialmente capturava um popover ainda com opacidade zero; a espera foi corrigida e apenas essas duas referências foram recapturadas após inspeção. Isso corrigiu a cobertura do teste, sem mudança de produto.
- **Validação assistida:** o agente operou o Chrome já aberto no Herdr por `herdr-preview` e CDP da sessão confirmada, incluindo digitação com pausas. A seleção fora do teclado foi exercitada via DOM, sem afirmar validação de um leitor de tela real. Não houve ensaio em aparelho físico nem deploy.

As decisões de comportamento e as escolhas mantidas pelo usuário estão abaixo; nenhuma foi reaberta nesta retomada.

## Decisões do usuário

Respostas de 2026-11-02, registradas em [decisões](../decisoes.md). O usuário aceitou as seis ondas e todas as recomendações:

1. **Documento excluído com texto não salvo:** o documento faz como o desenho. `getDocument` lê a lixeira, como `getCanvas`, e a página mantém o editor, com a faixa, enquanto houver texto local; gravar num documento excluído continua recusado (B3.14a e W5.7a). Manter a diferença foi descartado.
2. **Desenho num projeto arquivado:** só lê, com a faixa de projeto arquivado, como o documento e a tarefa (W5.7b). Manter o desenho editável foi descartado.
3. **Códigos de erro alinhados:** `DOMAIN_RULE` para projeto arquivado, `VERSION_CONFLICT` para a referência de ordem que sumiu e `VALIDATION` para o cursor inválido, o que muda o status HTTP desses casos (B3.16a). Manter os códigos de hoje foi descartado.
4. **Mensagem de validação pelo `/rpc`:** a frase do domínio quando houver uma, e o texto genérico nos outros casos (B3.6a). Isso revê a limitação aceita na etapa 11.
5. **`query` e `deleted` saem de `listDocuments` e `listCanvases`** (B3.14b). Um cliente que os envie recebe a lista sem filtro.
6. **Toda sessão tenta salvar de novo ao esconder a aba,** inclusive a gaveta e os editores abertos depois de uma falha (W4.6a). Conflitos e recusas definitivas continuam sem nova tentativa.
7. **As diferenças pequenas de consistência se alinham,** cada uma num commit próprio:
   - uma frase só para o conflito de versão (B3.29a);
   - a lixeira pela gaveta reenvia uma vez a resposta perdida (W5.11a);
   - a importação do documento ganha a guarda e o aviso de falha da sessão do desenho (W5.8a);
   - o rascunho baixado tem o mesmo toast e o mesmo padrão de nome nos três itens (W5.8b);
   - na cópia de documento e de desenho, `NOT_FOUND` encerra a tentativa (W5.8c), e o título perde os espaços das pontas (W5.8d);
   - o campo de arquivo escondido do desenho sai da ordem do Tab (W5.7c);
   - o checkbox com foco deixa de contar como campo no quadro e na gaveta (W4.16a);
   - o seletor de projetos exige todas as palavras (W6.7a);
   - os filtros dos menus ganham as mesmas medidas (W6.7b), e os campos de renomear a mesma cor de erro e o mesmo peso (W6.8a);
   - a descrição da tarefa no escuro passa a 400, revendo a diferença aceita na validação da etapa 10 (W6.2a);
   - os resumos de itens são cortados por ponto de código (B3.31a);
   - o nome do dono passa pela regra de nomes, com `visibleText` no `core` (B3.22a e B3.22b). Este item e o anterior foram acrescentados pelo plano às diferenças achadas pelas revisões.

As escolhas que o plano fez sem perguntar foram aceitas como estão: o arnês de testes adiantado para a onda 2, o que ficou [fora da etapa](#fora-da-etapa) e os commits opcionais da onda 3.

### Respostas ao fim da etapa

Em 2026-11-02, o usuário respondeu os oito pontos que as levas levantaram. Quatro mudam o comportamento, cada um num commit `fix` com teste:

- **Decisão 4, alargada:** toda frase que um esquema escreve para a pessoa aparece pelo `/rpc` (`domainMessage`), não só as dos validadores de conteúdo.
- **Rascunho baixado:** o nome é `tinyfold-rascunho-<documento|desenho|tarefa>-<id>.json` nos três itens, também pela página de item que não existe mais.
- **Item na lixeira com texto local:**
  - o documento ou o desenho para de tentar salvar e mostra só a faixa da lixeira, com "Salvar meu rascunho como cópia" e "Baixar cópia", sem a faixa de falha;
  - o rascunho fica no aparelho.
- **Rede que volta:** quando a rede volta, uma recusa definitiva do mesmo texto não é reenviada, como ao esconder a aba. Um texto editado sai.

Os outros quatro confirmam o comportamento de hoje:

- o desenho de um projeto arquivado só lê, mas mantém Exportar e "Importar desenho";
- a referência de ordem de outro projeto responde `VERSION_CONFLICT`;
- a regra de nomes vale para o nome do dono só na criação;
- um botão dentro do editor da descrição conta como editor.
