# Etapa 12 — Refatoração

**Estado:** proposta em 2026-11-02. Nada foi implementado.

O plano consolida cinco revisões somente leitura de `main` (`4c185b6`), cada uma com IDs próprios:

- backend core (BC-1 a BC-15): `core`, `auth` e o domínio e a aplicação do workspace;
- infraestrutura do backend (BI-1 a BI-16): SQL, MCP, servidor e migrações;
- fundações da web (WF-1 a WF-20): shell, `lib`, `ui`, estado e teclado;
- funcionalidades da web (WP-1 a WP-18): editor, documento, desenho, gaveta e quadro;
- testes, ferramentas e CSS (TT-1 a TT-19).

Os relatórios completos estão na pasta de rascunho da sessão que os produziu. Esta página guarda os IDs para que cada commit aponte a sua origem. As seções "Resultado" e "Desvios do plano" entram ao concluir.

## Objetivo

Deixar o código mais fácil de ler e de mudar **sem mudar o comportamento**:

- juntar o que está copiado entre partes paralelas: documento e desenho, pastas, colunas e etiquetas, e os três modelos de leitura;
- dar dono aos estados e às teclas da web;
- trocar as guardas que só existem na documentação por verificações automáticas;
- tornar o E2E isolado e paralelo.

As diferenças de comportamento que as revisões acharam não entram nos commits de refatoração. A refatoração as preserva, e cada uma vira uma [pergunta](#perguntas-para-o-usuário). Uma resposta que mude algo vira um commit `fix` separado, com teste próprio.

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
  - num commit `fix` decidido pelo usuário.
- **Sem migração nova.** O esquema que as migrações deixam fica idêntico do começo ao fim (o retrato de B1.3).
- **Sem renomear nomes de operação** (`'workspace.X'`), que entram na impressão digital de `core_mutations`. B1.2 os fixa.
- **Uma diferença de comportamento achada no meio do caminho** para e vira pergunta. Ela não é "corrigida de passagem".

## Achados consolidados

As duplicações entre os relatórios viraram uma linha só, com todos os IDs. A coluna "Onda" aponta os commits.

### Backend

| Tema | IDs | Mudança | Onda |
| --- | --- | --- | --- |
| Tipos de item | BC-3, WP-7, WF-16 (`itemKey`), BI-16 | `domain/items.ts` com `ITEM_TYPES`, `FILED_ITEM_TYPES`, `FiledItem`, `ItemAck` e `RestoreAck`, mais o mapeamento "drawing no contrato, canvas no armazenamento". `models.ts` se divide por agregado. O domínio passa a exportar `EMBED_*`, que a web usa num só módulo (`embed-blocks.ts`) | B3.1, B3.2, W5.1 |
| Ciclo de vida de documento e desenho | BC-1, BC-6 | `requireItem`, `trashItem`, `restoreItem` e `itemAck` por `FiledItemKind`. Os nomes de operação, os acks compactos e a leitura da lixeira só em `getCanvas` não mudam. `helpers.ts` se desfaz em buscas por agregado, com um caso de uso por arquivo | B3.12–B3.14 |
| Nomes e ordem de pastas, colunas e etiquetas | BC-2, BC-14, WF-10, TT-7 | Do backend à interface:<br>• `NamedCollection` e `ordering.ts` (`renumber`, `reorderById`);<br>• `nameTakenBy` e `columnDeletionBlocker` puros no domínio, que a web passa a usar;<br>• na web, `InlineNameField` com `ui/inline-field.css`. | B3.7–B3.9, W5.18, W6.8 |
| Catálogo de erros | BC-4 (passo 1), BC-11, BI-10, BI-9 | `application/errors.ts` no workspace e no auth, com frases inteiras e sem montar gênero. Os textos e códigos ficam os de hoje, inclusive as duas frases de conflito de versão. No `/rpc`, `originGuard`, `appErrors` e `httpStatusOf` se separam em `pub`. Alinhar os códigos é a pergunta 3 | B3.4–B3.6 |
| Código morto | BC-5, BI-11, WF-20, WP-18 | Saem `authed`, `backupDatabase`, `DomainError.conflict`, os apelidos de pasta, 17 exports do domínio, o apelido `searchableItems` e os exports usados só no próprio arquivo. `MAX_PINNED` passa a ser lido pela web. O ramo morto de `restore-column.ts` sai | B1.5–B1.7, W1.5, W1.8 |
| Raiz de composição e servidor | BI-1, BI-5 | `createWorkspace(db, { clock, timeZone, logError })` substitui quatro fábricas e leva o relógio ao `/rpc`. Do lado do servidor:<br>• `cookieSession` serve `/rpc` e `/arquivos`;<br>• `mountRpc`, `security-headers.ts` e `mountSpa` ficam em módulos próprios;<br>• `RequestContext` perde `db`, `now` e `session.token`. | B1.6, B3.23–B3.25 |
| SQL dos modelos de leitura | BI-2, BI-3, BI-6, BI-9, BI-13, BI-15, BI-16, BI-12 | `infra/sql/` (tabelas, item-tables, mappers, refs, quadro e pastas), com a regra `workspace-read-models-share-sql-only`. Mais:<br>• uma hidratação de tarefa só;<br>• `overdueOn` e `openTask` nomeados, com teste de paridade com `isOverdue`;<br>• `updateAtVersion` no lugar de 11 cópias;<br>• selects estreitos;<br>• leituras longas divididas.<br>O auxiliar de keyset (BI-12) é opcional | B3.26–B3.31, B3.34 |
| Paginação do Markdown para agentes | BC-8, BI-7 | Na aplicação, `pagedMarkdown` e `optionalCursor`, e `list-order.ts` vai para `domain/paging`. No MCP:<br>• `pagedMarkdownResult`, `keysetJsonResult` e `text-cut.ts`, com o `codePointPrefix` único;<br>• `format.ts` vira `headers.ts`, com `drawingHeader`.<br>Os limites continuam visíveis em cada ferramenta | B3.15–B3.18 |
| Portas e modelos de leitura | BC-7, BC-13 | `ports.ts` vira barril, dividido por agregado, e os modelos de leitura vão para `reading/read-models.ts`. `TaskDetail` vira `TaskForReading`. As portas com strings vizinhas usam argumentos nomeados, e `idempotentWrite` recebe `{ now }`. As datas com marca são opcionais | B3.10, B3.11, B3.32, B3.33, B3.35 |
| Validadores de conteúdo | BC-9 | `content-guards.ts`, `canvas-elements.ts`, `canvas-validation.ts` e `document-validation.ts`, preservando as diferenças entre cena e documento. É fronteira de segurança | B3.19, B3.20 |
| Texto, ordem e paleta no domínio | BC-10 | `domain/text.ts` (`UNTITLED`, `titleOrUntitled` e `collapseWhitespace`), mais `compareCodeUnits`, `byPosition` e `firstUnused` | B3.3 |
| Auth | BC-11 | Um caso de uso por arquivo e `read` → `store`. Mais:<br>• uma porta `TokenSecrets`;<br>• limites de senha nomeados;<br>• `isOffset`;<br>• a tabela de `deviceLabel`. | B3.5, B3.21, B3.22 |
| Esquema e gatilhos | BI-4 | O retrato do esquema por teste, em `schema/current.sql`, fora de `migrations/`. `docs/banco.md` cataloga os cerca de 24 gatilhos e as convenções de migração | B1.3, B1.4 |
| Transações | BI-14 | Um comentário diz que a leitura também reserva o escritor, os `Promise.all` em transação viram awaits em sequência, e `idempotentWrite` recebe o instante | B3.32 |
| Pastas de domínio | BC-15 | `domain/markdown/` e `domain/canvas/`, opcional | B3.36 |

### Web

| Tema | IDs | Mudança | Onda |
| --- | --- | --- | --- |
| Protocolo do Desfazer | WF-1 | Mover para pasta e para projeto passam por `useUndoableChange`, e o núcleo `runUndoableChange` ganha teste sem React. Excluir pasta e arquivar projeto ficam como estão | W4.1, W4.2 |
| Chaves e cache do TanStack Query | WF-2 | `keys.ts` com `itemQuery(type, id)`, mais `cache.ts` para aplicar e invalidar. A invalidação grossa fica | W1.6, W4.8 |
| Sessões e autosave | WF-5, WF-6, WP-4, WF-15 | Em `lib/autosave/`:<br>• um controlador sem padrão de documento;<br>• `status.ts` puro;<br>• `watchPage(…, { retryOnHide })`, que preserva a diferença da pergunta 6.<br>Documento e desenho saem de uma especificação de sessão (`item-session.ts`); a tarefa fica à parte. A sessão vencida só é detectada no link RPC, e há um `signOut()` só. `createStore` e `deviceValue` completam | W4.3–W4.7, W4.19 |
| Provedores do shell | WF-3, WF-4, WF-12 | `AppProvider` se divide em dono, itens novos e diálogo de projeto, com `useApp` como fachada e `useCreateInProject`. `ShellUiProvider` se divide por assunto. `AppLayout` ganha regiões, `useSidebarMode` e `ShellOverlays` | W4.11–W4.14 |
| Referências tardias e slots | WF-7, WP-11 | `useLatest`, `useStableHandlers` e um `useCommandSlot` substituem seis mecanismos de "componente empresta comandos a outro" | W4.9, W4.10 |
| Teclas, guardas e comandos | WF-8, WF-9, WF-14, WP-8, WP-15, WP-14 | A tabela `KEYS` e a API pública do teclado, com a seção "Modelo de teclado". Mais:<br>• as guardas do shell reaproveitadas no quadro, na gaveta, nos campos, no Índice e em Etiquetas;<br>• um registro de comandos para a paleta e os atalhos;<br>• os comandos do item aberto descritos uma vez. | W4.15–W4.18, W5.10, W5.16 |
| Camadas da web | WF-13, TT-14 | Regras do dependency-cruiser. `use-action.ts`, `use-undoable-change.ts` e `item-changes.tsx` vão para `shell/writes/`, o que tira a importação de `lib` → `ui`. `router/` se separa de `navigation/`. Os subbarris do shell se tornam explícitos | B1.1, W4.22 |
| Organização de `lib` e contrato do DOM | WF-16, WF-17, WF-18, WF-19 | `lib/` por assunto, com os `shortDate` renomeados. Mais:<br>• constantes do contrato do DOM;<br>• ajudantes de foco juntos;<br>• a importação da matemática em fases;<br>• um teste de que toda rota de projeto se lê. | W1.7, W4.20, W4.21, W4.23 |
| Teclado dos incorporados | WP-1, WP-2, WP-3 | `embed-keymap.ts`, do qual sai a lista de teclas seguradas. Os alvos ficam em `embed-selection.ts` e `embed-targets.ts`, puros e testados no esquema real. O contorno da deriva do Chrome fica em `selection-drift.ts`, com `driftDecision` puro. A política e os tempos da proteção não mudam | W5.0–W5.5 |
| Página do item aberto | WP-4, WP-5, WP-6, WP-17 | `useItemEditor`, `ItemEditorDialogs` e `HiddenFileInput`. `createBeside` serve a cópias e importações, e `downloadDraft` e `isFinalRefusal` ficam compartilhados. As vistas de carregamento dos incorporados também. As diferenças da tabela de derivas ficam como opção explícita até a pergunta 7 | W5.6–W5.8 |
| Gaveta e quadro | WP-9, WP-10, WP-12, WP-13, WP-16 | `NewTaskForm` e `TaskEditor` se dividem, e `task-property-rows.tsx` e `task-writes.ts` ficam compartilhados. `BoardPage` se divide em menu, filtro e endereço. Mais `useConfirmation` e `TrashDialog` | W5.11–W5.17 |
| Nomes | WP-18 | Os nomes passam a valer para a web:<br>• `CanvasEditor` → `DrawingEditor` e `canvas-session` → `drawing-session`, só na web;<br>• um tipo do editor de blocos;<br>• componentes importados pelo índice;<br>• `editableTitle`, `useOpenTaskId`, `useLabelMap`, `paths.permanent` e `renderLightPreview`;<br>• a nota de projeto arquivado como constante.<br>Os comentários perdem a narrativa e mantêm os IDs de revisão | W1.8, W5.19–W5.22 |

### Testes, ferramentas e CSS

| Tema | IDs | Mudança | Onda |
| --- | --- | --- | --- |
| Lint e configuração | TT-2, TT-10 | `noPlaywrightMissingAwait`, `noFocusedTests` (só em testes), `noDescendingSpecificity` e `forbidOnly` na CI. `noPlaywrightWaitForTimeout` entra como aviso, e `tailwindDirectives` sai. Um `serverEnv` só, e o E2E recusa um bundle mais velho que o código | W1.1, W1.2 |
| Arnês dos testes de banco | BC-12, BI-8, TT-13 | `core/testing/temp-database.ts` com `useTempDatabase` e `testClock`. `workspace/testing/database.ts` com `useWorkspaceDb({ clock, timeZone })`, e `testing/builders.ts` com `request`, `paragraph` e `check`. Mais:<br>• `server/testing/test-app.ts`;<br>• `testing/legacy/`;<br>• `backupRoundTrip` para os scripts.<br>Os arquivos temporários continuam isolados | B2.1–B2.4 |
| Ajudantes do E2E | TT-3, TT-11, TT-17 | `support/` por área: `shell`, `document`, `api`, `network`, `pointer` e `text`. A lateral abre pela largura, sem sondagem. Os atalhos têm nome: `appShortcut`, `hostShortcut` e `hostKey` | W2.1–W2.5 |
| Isolamento e paralelismo do E2E | TT-1, TT-4, TT-8, TT-9, TT-16, TT-12 | Fixtures `page` autenticado, `project` por RPC e `api` tipada pelo `AppRouter`. Mais:<br>• dispositivo por sufixo e tag;<br>• specs por área, com `@smoke`;<br>• um servidor por worker, com `@timing` em série;<br>• o relógio do Playwright nas asserções de "nada foi salvo". | W2.6–W2.13 |
| Exemplo | TT-18 | Uma função por projeto do exemplo, na mesma ordem de escrita, e as faixas da `--grande` por tabela | B2.5 |
| Tokens e convenções de CSS | TT-5, TT-6, TT-19 | O papel `500 13/20` na escala, e os tokens nos valores idênticos da gaveta, dos diálogos e dos chips. O editor recebe o tipo por `--editor-type`. Mais:<br>• larguras nomeadas;<br>• estado por `data-*`;<br>• um teste de convenções que começa como catraca na onda 1. | W1.3, W6.1–W6.3, W6.11 |
| Primitivas e arquivos de CSS | TT-7, TT-15, WF-11 | `SearchableMenu` com `ui/menu-filter.css`, e a árvore reaproveitando a linha da lateral. `LabelPicker` usa `LabelSquare`. `drawer.css` e `embeds.css` se dividem por componente, e `inline-math.css` passa aos tokens | W6.4–W6.10 |

### Fora da etapa

- **Migração 008 para os gatilhos** (BI-4, alternativa): o banco real ainda está na etapa 07 e vai aplicar 005 a 007 numa subida só.
- **Marca nos IDs** (BC-13): a própria revisão desaconselha.
- **Trocar para o UPDATE estreito do item** (BC-1, passo opcional): muda o SQL ao lado dos gatilhos sem ganho visível.
- **`item-changes` em excluir pasta e arquivar projeto** (WF-1): mudaria qual Desfazer some. Não é refatoração, e nenhuma revisão o pede.
- **Fora pelo "Não mexer" das revisões:** `@layer`, utilitários `.t-*` e `.truncate`, Page Objects, `features/`, banco `:memory:`, biblioteca de estado e `useMutation`.

## Ondas

Seis ondas. A ordem de partida (guardas, backend, fundações da web, funcionalidades da web, testes e CSS) mudou num ponto: **o arnês de testes sobe para a onda 2**. Cada commit da etapa roda o E2E completo. Hoje ele leva 13–22 min, e depois do isolamento e de um servidor por worker deve levar cerca de 5–8 min. Com cerca de 170 commits, adiantar isso economiza mais de um dia de máquina. As fixtures também barateiam os testes de caracterização das ondas 4 e 5. O CSS fica por último, porque depende das divisões da gaveta e dos seletores juntos.

| Onda | Assunto | Dono | Começa |
| --- | --- | --- | --- |
| 1 | Guardas e limpeza | Backend e web, em paralelo | Na aprovação |
| 2 | Arnês de testes | Backend (banco) e web (E2E) | Depois da onda 1 |
| 3 | Consolidação do backend | Backend | Depois da parte do backend da onda 2. Corre junto das ondas 2 a 5 da web, pois as árvores são disjuntas |
| 4 | Fundações da web | Web | Depois da onda 2 |
| 5 | Funcionalidades da web | Web | Depois da onda 4 e de B3.1 e B3.7 |
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
| B3.7 | `refactor(workspace): move the pure name and column rules to the domain` | BC-14 | Backend |
| B3.8 | `refactor(workspace): share the named-collection rules of folders, columns and labels` | BC-2 | Backend |
| B3.9 | `refactor(workspace): renumber and reorder through one helper` | BC-2 | Backend |
| B3.10 | `refactor(workspace): split application ports by aggregate` | BC-7 | Backend |
| B3.11 | `refactor(workspace): split reading ports from read models and rename TaskForReading` | BC-7 | Backend |
| B3.12 | `refactor(workspace): move project, document and canvas lookups out of helpers` | BC-6 | Backend |
| B3.13 | `refactor(workspace): trash and restore documents and drawings through one item kind` | BC-1 | Backend |
| B3.14 | `refactor(workspace): one use case per file for projects, documents, canvases and pins` | BC-6 | Backend |
| B3.15 | `refactor(workspace): share markdown paging and optional cursors in reading` | BC-8 | Backend |
| B3.16 | `refactor(workspace): move list order keys to the domain` | BC-8 | Backend |
| B3.17 | `refactor(mcp): share the code point cut and the text helpers` | BI-7 | Backend |
| B3.18 | `refactor(mcp): one paged Markdown result for read_document and read_task` | BI-7 | Backend |
| B3.19 | `refactor(workspace): share content guards between the scene and document validators` | BC-9 | Backend |
| B3.20 | `refactor(workspace): split scene and document validation from their models` | BC-9 | Backend |
| B3.21 | `refactor(auth): one token secrets port and a named autocommit store` | BC-11 | Backend |
| B3.22 | `refactor(auth): split the auth service by use case` | BC-11 | Backend |
| B3.23 | `refactor(server): read the cookie session in one place for /rpc and /arquivos` | BI-5 | Backend |
| B3.24 | `refactor(server): mount /rpc, the security headers and the SPA from their own modules` | BI-5 | Backend |
| B3.25 | `refactor(workspace): build the router, service, tools and files from one runtime` | BI-1 | Backend |
| B3.26 | `refactor(workspace): move the SQL the read models share to infra/sql` | BI-2, BI-16 | Backend |
| B3.27 | `refactor(workspace): one task hydration for the board, the drawer and the agents` | BI-3 | Backend |
| B3.28 | `refactor(workspace): name the open and overdue task predicates once` | BI-6 | Backend |
| B3.29 | `refactor(workspace): run versioned updates through one helper` | BI-9 | Backend |
| B3.30 | `refactor(workspace): split the long reads in search, embeds and trash` | BI-15 | Backend |
| B3.31 | `perf(workspace): select only the columns hydration and lists use` | BI-13 | Backend |
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
- **B3.4:** as duas frases de conflito ficam até a pergunta 7.
- **B3.6:** `originGuard`, `appErrors`, `httpStatusOf`, `publicProcedure` e `fileUpload`. O texto genérico de `VALIDATION` fica até a pergunta 4.
- **B3.20:** os validadores são fronteira de segurança. As diferenças entre cena e documento ficam explícitas.
- **B3.25:** a mudança é só de fiação. Em produção, o relógio já é o do sistema.
- **B3.26:** traz a regra `workspace-read-models-share-sql-only`, e `infra/db.ts` vira `infra/sql/tables.ts`.
- **B3.28:** inclui o teste de paridade com `isOverdue`.
- **B3.32:** troca os `Promise.all` dentro de transação por awaits em sequência, e `idempotentWrite` recebe `{ now }`.

**Portões:** os quatro comandos em cada commit, mais estas conferências:

- **Retratos:** o do esquema (B1.3) e o do contrato RPC e dos nomes de operação (B1.2) não mudam em nenhum commit.
- **Textos exatos:** os testes do MCP passam sem edição.
- **Testes de banco:** os de hoje passam sem mudar de asserção; os de caracterização (B3.0a a B3.0c) são novos.
- **Fronteiras:** `deps` com 0 violações, inclusive a regra nova de B3.26.

**Chrome:** nenhum commit pede a passagem manual, porque a interface não muda. A revisão adversarial cobre a equivalência.

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
- **W4.6:** `watchPage(…, { retryOnHide })` mantém a diferença até a pergunta 6.
- **W4.7:** os E2E `draft-isolation`, `open-item-move`, `canvas` e `adversarial` passam sem mudança.
- **W4.8:** feito em conjunto com as sessões de W4.7.
- **W4.13:** um commit por provedor (sobreposições, pedidos da lateral, slot da página e filtros do quadro), num ramo curto com W4.11 a W4.14.
- **W4.16:** a regra antiga do checkbox fica como `isFieldTarget` até a pergunta 7.
- **W4.22:** move `use-action.ts`, `use-undoable-change.ts` e `item-changes.tsx` para `shell/writes/` e separa `navigation/` de `router/`. `web-lib-is-a-leaf` vira erro.

**Portões:** os quatro comandos em cada commit, mais estas conferências:

- **E2E:** a mesma lista executada, mais os testes de caracterização.
- **Retratos da onda:** W4.0a e W4.0b não mudam até a resposta da pergunta correspondente.
- **Fronteiras:** `deps` sem `warn` no fim da onda.

**Chrome:** a passagem manual cobre os commits marcados:

- **Desfazer:** de mover, pelo toast e pelo ⌘Z.
- **Esc:** em camadas, com a paleta, a lateral sobreposta e a gaveta.
- **Atalhos:** os de uma letra, e os modificadores com o foco em cada tipo de alvo.
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
| W5.8 | `refactor(web): one way to create an item beside the open one, for copies and imports` | WP-6 | Web | — |
| W5.9 | `refactor(web): give the document editor's late-bound callbacks one home` | WP-8 | Web | — |
| W5.10 | `refactor(web): move the document page commands and the task-from-excerpt choice to hooks` | WP-8, WF-14 | Web | Chrome |
| W5.11 | `refactor(web): share the task writes that move a task back and trash it` | WP-13 | Web | — |
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
- **W5.7:** cada diferença da tabela de derivas vira opção explícita, com o valor de hoje.
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

### Onda 6 — CSS e primitivas de interface

Antes de cada commit, a rede visual de W1.4 compara as capturas com as referências do commit-base da onda.

| # | Commit | IDs | Dono | Chrome |
| --- | --- | --- | --- | --- |
| W6.1 | `refactor(web): add the medium UI text role to the type scale` | TT-5 | Web | — |
| W6.2 | `style(web): use the type and height tokens in the drawer, dialogs and chips` | TT-5 | Web | — |
| W6.3 | `style(web): let each host set the block editor's type through variables` | TT-6 | Web | — |
| W6.4 | `style(web): split drawer.css by component and give the label chip its own rules` | TT-15 | Web | — |
| W6.5 | `style(web): move the embed picker and origin marker styles next to their components` | TT-15 | Web | — |
| W6.6 | `style(web): align inline-math.css with the tokens and the field focus ring` | TT-15 | Web | — |
| W6.7 | `refactor(ui): add SearchableMenu with the menu filter styles`, um consumidor por commit | WF-11, TT-7 | Web | Chrome |
| W6.8 | `refactor(ui): add InlineNameField with the inline field styles`, um consumidor por commit | WF-10, TT-7 | Web | Chrome |
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

- **Pixels:** a comparação dá zero diferença nos dois temas, em 1440 px e no Pixel 7.
- **Catraca de CSS:** a lista de exceções do teste de W1.3 encolhe e, no fim, só tem exceções com motivo escrito.

**Chrome:** nos filtros, digitar, as setas, ↵, Esc e o filtro vazio. Nos campos de nome, ↵, Esc, sair do campo, o nome repetido com o erro, e o celular.

### Correções que dependem das perguntas

Nenhuma entra antes da resposta. Cada uma é um commit próprio, com um teste que falha antes e passa depois, e com uma linha em `docs/decisoes.md`.

| Pergunta | Commit | Dono | Depois de |
| --- | --- | --- | --- |
| 1 | `fix(workspace): read trashed documents for their owner, as drawings`, seguido de `fix(web): keep a trashed document's editor while it holds unsaved text` | Backend e web | B3.13, W4.7 |
| 2 | `fix(web): make drawings read-only in archived projects` | Web | W5.7 |
| 3 | `fix(workspace): answer the same situations with the same error codes` | Backend, com a conferência da web | B3.4, B3.15 |
| 4 | `fix(core): keep the domain's message on an RPC validation error` | Backend | B3.6 |
| 5 | `refactor(workspace)!: drop query and deleted from the document and drawing lists` | Backend | B3.14 |
| 6 | `fix(web): retry a failed save when the tab hides, in open editors too` | Web | W4.6 |
| 7 | Um commit por item: a frase de conflito (B3.29), a importação do documento, o toast do rascunho, `NOT_FOUND` e o título da cópia (W5.8), o campo de arquivo (W5.7), a lixeira pela gaveta (W5.11), o checkbox (W4.16), o filtro de projetos e as medidas dos filtros (W6.7), os campos de nome (W6.8), o peso da descrição (W6.2), os resumos (B3.31) e o nome do dono (B3.22) | Conforme o item | Conforme o item |

## Verificação

### Em todo commit

```sh
mise exec -- pnpm check
mise exec -- pnpm test:db
mise exec -- pnpm build
E2E_PORT=<porta do agente> mise exec -- pnpm e2e   # desktop e Pixel 7
```

Cada agente usa uma faixa de portas própria. As portas do uso real (3370 e 5170) e as de qualquer servidor de teste do usuário ficam de fora. Depois de W2.11, cada worker usa `E2E_PORT + 2 × índice`.

A equivalência se prova por quatro evidências:

- **Testes intactos:** nenhum teste existente muda de asserção (ver [Regras](#regras-da-etapa)).
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
| 3 — Backend | 36, mais 3 opcionais | ~26 | 0 |
| 4 — Fundações da web | ~29, com W4.13 em até quatro | ~24 | 2 |
| 5 — Funcionalidades da web | 23 | ~22 | 2 (uma só para os incorporados) |
| 6 — CSS e primitivas | ~16, com um consumidor por commit em W6.7 e W6.8 | ~12 | 1 |
| Correções decididas | até 21 | ~8 | 1 |
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
- **Correção de passagem.** Uma diferença achada no meio vira pergunta, não um ajuste dentro de um `refactor`. A revisão confere isso.
- **Aba antiga.** Nenhum contrato muda, salvo a pergunta 5, e a web não envia `query` nem `deleted`.

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
  - `getCanvas` lê a lixeira e `getDocument` não, salvo a pergunta 1.
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

- [ ] Cada commit das seis ondas entrou na `main` com `check`, `test:db`, `build` e `e2e` verdes.
- [ ] O retrato do esquema e o do contrato RPC e dos nomes de operação são os de B1.2 e B1.3.
- [ ] A lista de E2E executados é a do começo da etapa, mais os testes de caracterização.
- [ ] Cada onda passou pela revisão adversarial, e o que foi corrigido passou pelo reteste.
- [ ] As passagens no Chrome real estão registradas, com a sessão dos incorporados ao ritmo de uma pessoa.
- [ ] O `deps` cobre `src`, `scripts` e `e2e`, sem `warn`. O teste de convenções de CSS só tem exceções com motivo.
- [ ] O E2E roda isolado e em paralelo, e o tempo medido está na validação.
- [ ] As correções respondidas pelo usuário entraram como commits próprios, com teste e com a linha em `decisoes.md`.

## Documentação ao concluir

| Documento | Atualização |
| --- | --- |
| `banco.md` (novo) | Os gatilhos, o que cada um garante e qual teste o cobre; as convenções de migração e o retrato do esquema |
| `arquitetura.md` | A raiz de composição, `infra/sql/`, o item arquivado (`FiledItem`), o catálogo de erros, as camadas da web e as regras do dependency-cruiser, e o "Modelo de teclado" (WF-8) |
| `processo.md` e `AGENTS.md` | `e2e:smoke`, `e2e:visual`, os workers, `@timing`, a recusa do bundle velho e as fixtures |
| `decisoes.md` | As respostas às perguntas e o `refactor!` da pergunta 5, se for o caso |
| `src/workspace/README.md` | Os tipos de item, os erros e a paginação dos agentes |
| `validacao.md` | Os portões de cada onda, as revisões, as passagens no Chrome e os tempos do E2E antes e depois |
| `etapas/README.md` e esta página | O estado, o Resultado e os Desvios |

## Perguntas para o usuário

As revisões acharam diferenças de comportamento entre partes paralelas do código. A refatoração as preserva. Cada resposta que mude algo vira um commit próprio, com teste (ver [Correções que dependem das perguntas](#correções-que-dependem-das-perguntas)).

1. **Documento excluído em outro lugar com texto não salvo.** O desenho mantém o editor enquanto há algo local, para que a pessoa baixe o rascunho ou salve uma cópia (etapa 06). O documento troca na hora pelo aviso "Este documento está na lixeira", e o texto fica só guardado no dispositivo.
   - **A — O documento faz como o desenho (recomendado).** `getDocument` passa a ler a lixeira, como `getCanvas`, e gravar num documento excluído continua recusado.
   - **B — Manter a diferença.**
2. **Desenho num projeto arquivado.** O documento e a tarefa só leem, com a faixa "Projeto arquivado". O desenho continua editável, sem a faixa.
   - **A — O desenho também só lê, com a mesma faixa (recomendado).**
   - **B — Manter o desenho editável.**
3. **Códigos de erro.** A mesma situação recebe códigos diferentes:

   | Situação | Códigos de hoje |
   | --- | --- |
   | Projeto arquivado | `VALIDATION` nos itens e nas pastas, `DOMAIN_RULE` ao reordenar projetos |
   | Referência de ordem que sumiu | `VERSION_CONFLICT` em projetos e tarefas, `NOT_FOUND` em pastas e colunas |
   | Cursor inválido | `VALIDATION` nas Concluídas, `DOMAIN_RULE` na busca |

   A web decide pelo código se mostra um erro final ou "mudou em outro lugar".
   - **A — Alinhar (recomendado).**
     - `DOMAIN_RULE` para projeto arquivado.
     - `VERSION_CONFLICT` para a referência que sumiu: a web passa a dizer que a lista mudou, em vez de mostrar um erro.
     - `VALIDATION` para o cursor inválido.

     Muda o status HTTP desses casos.
   - **B — Manter os códigos de hoje,** só reunidos no catálogo.
4. **Mensagem de validação pelo `/rpc`.** Quando o esquema recusa um documento ou um desenho, o `/rpc` responde "Revise os dados enviados e tente de novo.", e não a frase do domínio, que já está em português. Isso foi aceito na etapa 11.
   - **A — Responder a frase do domínio quando houver uma, e o texto genérico nos outros casos (recomendado).**
   - **B — Manter o texto genérico.**
5. **Filtros `query` e `deleted` de `listDocuments` e `listCanvases`.** A web não os envia, e `query` é uma segunda busca, por trecho, diferente de `search`.
   - **A — Tirar do contrato (recomendado).** Um cliente que os envie recebe a lista sem filtro. A mudança fica em `decisoes.md`.
   - **B — Manter.**
6. **Tentar de novo ao esconder a aba.** Uma sessão em segundo plano, como a descrição de uma tarefa cuja gaveta fechou sem salvar, tenta salvar de novo quando a aba é escondida, mesmo depois de uma falha. A gaveta e os editores abertos não tentam de novo nesse caso.
   - **A — Todos tentam de novo ao esconder a aba (recomendado).** No celular, esconder a aba costuma ser a última chance antes de o navegador descartá-la. Conflitos e recusas definitivas continuam sem nova tentativa.
   - **B — Manter a diferença,** com nome no código (`retryOnHide`).
7. **Diferenças pequenas de consistência.** Aplicar todas as recomendações abaixo, cada uma num commit próprio?
   - **A — Aplicar todas (recomendado).**
   - **B — Escolher item a item:** diga quais ficam como estão.

   **Erros e escritas:**
   - **Conflito de versão:** uma frase só, "Este item mudou em outro dispositivo. Atualize os dados antes de continuar.". Hoje, conforme o momento, sai "Atualize antes de continuar.".
   - **Lixeira da tarefa pela gaveta:** reenvia uma vez a resposta perdida, como a lixeira pelo card.

   **Documento, desenho e tarefa:**
   - **Importar no documento:** a mesma guarda contra duas importações seguidas e o mesmo aviso de falha da sessão que o desenho tem.
   - **Baixar o rascunho:** o desenho e a tarefa mostram o toast do documento ("Uma cópia do rascunho foi baixada.") e seguem o mesmo padrão de nome de arquivo.
   - **Cópia de documento e de desenho:** `NOT_FOUND` encerra a tentativa, e o título perde os espaços das pontas, como na tarefa.
   - **Campo de arquivo escondido do desenho:** sai da ordem do Tab, como o do documento.

   **Teclado e filtros:**
   - **Checkbox com foco:** o quadro e a gaveta tratam o checkbox como o resto do app, como algo que só recebe o toque. Assim, F (filtro de etiquetas), P (que na gaveta não faz nada) e ⌥↑/⌥↓ (altura da gaveta) valem com o foco em "Incorporar no documento". Hoje, ali, o checkbox conta como campo de texto.
   - **Seletor de projetos:** filtra exigindo todas as palavras, como os outros filtros e a busca. Hoje procura o trecho contíguo.

   **Visual:**
   - **Campos de renomear pasta, coluna e etiqueta:** a mesma cor de erro (`--danger`) e o mesmo peso. As alturas seguem a linha de cada lugar.
   - **Filtros dos menus** (projetos, mover para pasta, etiquetas e incorporados): as mesmas medidas de margem, altura do campo, espaçamento das letras e placeholder, conferidas contra o protótipo.
   - **Descrição da tarefa no tema escuro:** peso 400, como pedem o [visual](../interface/visual.md) e o protótipo, e como o corpo do documento. Hoje é 450, uma diferença aceita na validação da etapa 10.

   **Texto:**
   - **Resumos de itens:** cortados no SQL por ponto de código, sem partir um emoji no fim.
   - **Nome do dono:** passa pela regra dos nomes de pasta e projeto, que tira o invisível e não parte um emoji. Para isso, `visibleText` vai do workspace para o `core`.
