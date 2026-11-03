# Tinyfold — Arquitetura

**Estado:** a [etapa 14](etapas/14-definicoes.md) centraliza configuração e definições de composição; está concluída, validada localmente e integrada na `main`. A [etapa 13](etapas/13-modulos.md) está integrada na `main`. Resultados executados e versão publicada ficam em [validação](validacao.md); a publicação segue o CI e o deploy automático do Railway.

## Base e módulos

O Orbis serviu de referência para o workspace pnpm, TypeScript, SPA React/Vite, Hono, oRPC, módulos em camadas, autenticação, migrações com checksum e escritas idempotentes. Seu PostgreSQL foi substituído por SQLite; transações, migrações e backups foram adaptados.

```text
src/
├── core/          datas, erros, transações, migrações, idempotência e eventos
├── auth/          conta pessoal, senha, sessões, tokens e fuso
├── rich-text/     formato de blocos, validação, trechos e Markdown puros
├── projects/      projetos e pastas
├── documents/     conteúdo, versões e ciclo de vida documental
├── drawings/      cenas, versões e prévias PNG
├── board/         tarefas, descrições, colunas, etiquetas, origens e revisão
├── workspace/     fluxos conjuntos, consultas agregadas e migrações históricas
├── server/        composição, Hono, oRPC, MCP, arquivos e comandos
└── web/           React: shell, páginas, editores, quadro e Perfil
```

As pastas são módulos arquiteturais de um único pacote na raiz. `package.json` reúne dependências, scripts e o mapa `imports`, com entradas exatas e sem curingas. Os módulos de negócio separam `domain/`, `application/` e `infra/`. O domínio é puro; a aplicação usa portas locais; a infraestrutura implementa persistência e montagem. `rich-text` é uma biblioteca pura, sem classe, SQL, HTTP ou React. Auth conserva sua API existente.

`ProjectsModule`, `DocumentsModule`, `DrawingsModule`, `BoardModule` e `WorkspaceModule` expõem `id`, `commands`, `queries` e `events`. Cada classe estende a classe `.Module` produzida por uma definição privada `defineModule({ id, setup, api })`. A base `Module` mantém a API pública; a definição guarda o estado de cada instância e só o próprio módulo usa `stateOf(instance)`. `RuntimeModule` descreve o contrato, sem acrescentar SQL ou migrações ao construtor.

| Entrada pública | Uso |
| --- | --- |
| `#<módulo>` | Classe do módulo e tipos da API |
| `#<módulo>/domain` | Regras puras e tipos selecionados; permitidos no navegador |
| `#<módulo>/contracts` | Schemas, entradas, resultados e eventos; a web importa somente tipos |
| `#<módulo>/composition` | Participantes e montagem, acessíveis ao próprio módulo e ao servidor |

Essas quatro entradas pertencem aos cinco módulos de negócio. `rich-text` possui somente `#rich-text/domain`; `core` e `auth` têm suas entradas explícitas no mesmo mapa da raiz. Imports entre módulos usam esses aliases; caminhos privados continuam proibidos mesmo sem manifests separados.

`tsconfig.base.json` guarda as opções comuns. `tsconfig.json` verifica Node, backend, scripts, `.railway` e `project.ts`; `tsconfig.web.json` usa DOM, JSX e resolução Bundler; `tsconfig.e2e.json` cobre os testes de navegador. `pnpm typecheck` executa os três. O `pnpm-workspace.yaml` mantém apenas o pacote raiz e as políticas de build/patch do pnpm, incluindo a correção do Excalidraw.

Dependency-cruiser lê o mapa `imports` da raiz e verifica estas regras em `project.ts`, `src`, `scripts` e `e2e`:

- módulos de negócio não importam outros módulos de negócio, nem por `import type` ou reexportação; definem suas próprias portas e projeções, ligadas pelo servidor;
- domínio e aplicação não importam infraestrutura; as dependências compartilhadas usam apenas entradas públicas de `core` e `rich-text`;
- servidor e web alcançam módulos por entradas declaradas; `#<módulo>/composition` não pode ser consumido pela web, por scripts ou por outro módulo;
- o navegador executa somente código próprio e domínio puro; contratos e APIs do servidor entram somente como tipos;
- só `src/server/mcp/` importa o SDK MCP; auxiliares `testing/` ficam nos testes, e o E2E importa de `src` somente tipos;
- scripts reutilizam a composição de `server` e entradas permitidas; testes que ligam vários módulos ficam no servidor;
- `project.ts` declara aplicações por entradas públicas; somente servidor e scripts podem importá-lo, e módulos de negócio, web e E2E não podem acessá-lo nem como tipo;
- na web, `ui/` e `lib/` permanecem nas camadas inferiores, `pages/` é consumida pelas rotas/outras páginas, o shell usa entradas públicas e rotas não concentram lógica de navegação.

A exclusão do grafo cobre apenas `src/*/dist`; dependências npm continuam visíveis. A configuração recusa pastas de módulo sem entradas declaradas. `scripts/module-policy.test.ts` verifica importações permitidas e proibidas em fixtures isoladas, incluindo aliases, caminhos relativos, tipos, reexports, acesso ao catálogo do projeto, entradas privadas e a pureza de `rich-text`.

## Propriedade dos dados

| Dono da escrita | Tabelas |
| --- | --- |
| `projects` | `workspace_projects`, `workspace_folders` |
| `documents` | `workspace_documents` |
| `drawings` | `workspace_canvases`, `workspace_canvas_previews` |
| `board` | `workspace_tasks`, `workspace_columns`, `workspace_labels`, `workspace_task_labels`, `workspace_task_sources`, `workspace_state` |
| `auth` | Tabelas `auth_*` |
| `core` | `core_mutations`, `core_schema_migrations` |

`workspace` coordena escritas pelos participantes dos donos, inclusive localização e fixados. Seus leitores agregados consultam tabelas de várias áreas, com DTOs locais e dependência explícita do esquema; não escrevem nem importam repositórios dos outros módulos. Cascatas e gatilhos SQLite continuam relacionando essas tabelas, com as mesmas regras.

Os arquivos `workspace/infra/migrations/001_workspace.sql` a `007_board.sql` permanecem registrados sob o ID `workspace`, junto da função SQL `workspace_search_text`. Os descritores `coreModule`, `authModule` e `workspaceModule` usam `MigrationModuleDefinition`/`defineMigrationModule`, de `#core/infra`; o servidor os registra em `server/modules.ts`. Esse histórico é separado de `ModuleDefinition`/`defineModule`, de `#core/application`, que tratam das instâncias de execução.

## Execução e SQLite

Em produção, um processo Node serve a SPA, `/rpc`, `/mcp` e as prévias das figuras (`/arquivos`) pela mesma origem HTTPS. O navegador consulta `/rpc`, o Claude Code consulta `/mcp`, e o SQLite fica no servidor, em volume persistente. A configuração rejeita origem HTTP e força cookie Secure em produção.

Kysely usa better-sqlite3 com um dialeto que inicia transações com `BEGIN IMMEDIATE`, reservando a escrita antes de consultar versões e pedidos anteriores. SQLite usa `foreign_keys=ON`, WAL, `busy_timeout=5000` e `synchronous=FULL`. Escritas são curtas; o cálculo de senha ocorre fora da transação.

Migrações SQL numeradas são executadas atomicamente e registradas com checksum. Alterar uma migração já aplicada impede a subida. A execução usa scripts SQL nativos, preservando strings com ponto e vírgula.

As migrações pendentes rodam numa só transação. Desde a etapa 10, o executor (`src/core/infra/migrate.ts`) desliga as chaves estrangeiras antes dela, já que o SQLite não muda essa opção dentro de uma transação, para que uma tabela referenciada possa ser reconstruída sem apagar em cascata as linhas que apontam para ela. Antes do `COMMIT`, `foreign_key_check` recusa toda violação que não existia no começo, com a tabela e o `rowid`; as anteriores, deixadas por SQL manual, vão para um aviso no log. As chaves voltam a ser ligadas também em falha. Em troca, nenhuma cascata dispara dentro de uma migração: uma migração que apague um pai precisa apagar os filhos. Um módulo registra as funções SQL que as migrações usam (`sqlFunctions`; o workspace, `workspace_search_text`, o `searchText` do domínio).

A implantação prevê uma instância e um volume local ao processo. Não há réplica nem banco compartilhado por múltiplos hosts.

## Composição e contratos internos

`project.ts` chama `defineProject({ id: 'tinyfold', applications: { server: serverApplication } })`. Esse `Project` representa o software, não os projetos criados pelo usuário. O catálogo contém receitas de aplicação; importá-lo não abre banco, executa migrações nem cria módulos.

`serverApplication`, em `server/application.ts`, usa `defineApplication({ id, setup })`. A chamada `project.applications.server.create(context)` cria uma `Application` com mapas de módulos e serviços tipados. Chaves dos mapas de módulos/aplicações devem coincidir com os IDs das definições. O mapa de serviços pode conter instâncias de classes como valores; não substitui a API dessas instâncias.

`Application.dispose()` é síncrono e idempotente, dedicado à liberação das assinaturas em memória. Seu callback retorna `undefined`, recusando descarte assíncrono no contrato de tipos. O host HTTP continua responsável por aguardar requisições/ferramentas aceitas e por fechar o banco. As definições atuais de módulo montam closures e canais em memória; recursos assíncronos pertencem ao host.

`composeWorkspace`, em `server/workspace/operations.ts`, cria uma unidade de trabalho e as cinco instâncias, liga portas e monta o registro de operações. `createWorkspace(db, { clock, timeZone, logError })`, em `server/workspace/index.ts`, acrescenta `router`, `service`, `tools` e `files`. A mesma instância atende RPC, MCP e prévias; scripts e fixtures usam `createWorkspaceService` do servidor. O encerramento aguarda requisições aceitas e ferramentas MCP em execução, mesmo após desconexão ou resposta SSE, libera assinaturas dos módulos e só então fecha o banco; novas requisições são recusadas durante essa liberação. Os nomes externos `workspace.*` continuam no RPC e no registro idempotente.

Os registros `Operation` associam schema e execução. Métodos públicos são funções vinculadas e validam a entrada; adaptadores que já a validaram executam a operação com o valor resultante. O servidor encaminha `createTask` com origem documental para o fluxo do workspace e o ramo sem origem para o board, conservando schema, entrada completa e nome da mutação.

`WorkspaceFlowPorts` contém somente capacidades de coordenação. Pastas, movimentos, pins e lixeira usam subconjuntos próprios (`FolderLifecyclePorts`, `MovePorts`, `PinPorts`, `TrashPorts`); não recebem métodos de criação ou salvamento de conteúdo. Projetos e documentos fornecem fatos por portas locais: o board obtém origens em lote, e o servidor resolve as regras de prévia de desenhos para os leitores agregados.

### Transações e idempotência

`createUnitOfWork`, em `core/infra`, usa o protocolo existente de `idempotentWrite`. A entrada externa validada, o nome histórico da operação e `requestId` determinam o fingerprint. Alterações, resposta compacta e registro do pedido ficam na mesma transação. Reenvio idêntico devolve a resposta guardada sem executar participantes; outra entrada com o mesmo ID responde `REQUEST_REUSED`.

`ModuleContext<Ports>` oferece aos casos de uso apenas as portas declaradas. A infraestrutura recebe um `TransactionScope` opaco para construir participantes vinculados à conexão; chamadas de escrita nesses participantes executam no escopo recebido, sem outra transação ou registro. Portas e métodos capturados deixam de funcionar depois do callback; um escopo de leitura não permite mutações. Kysely e a conexão ficam na infraestrutura. O trabalho dentro de uma transação é sequencial.

| Fluxo coordenado por workspace | Participação |
| --- | --- |
| Tarefa originada em documento | Documents valida versão, bloco e trecho; board grava tarefa e origem juntas |
| Excluir/restaurar pasta | Projects altera a pasta; documents/drawings alteram seus itens e preservam as listas de Desfazer |
| Mover/fixar item | Fatos de organização e contagem combinada definem a mudança; o dono persiste sua linha |
| Purge documental | Board conserva o título nas origens antes da remoção pelo documents |
| Esvaziar lixeira | Itens elegíveis dos três donos são removidos juntos; versões/projetos alterados são ignorados |

Falha em qualquer participante desfaz todos os passos e o registro do pedido. Pins e prévias mantêm escritas repetíveis sem `core_mutations`. Relógio, fuso e IDs são dependências da composição; a geração de IDs e instantes dos eventos é independente dos IDs e relógios de negócio. Criar a tarefa e inserir seu bloco no editor continuam sendo ações distintas do protocolo de autosave.

### Eventos

`events.on(type, handler)` devolve a função de remoção da assinatura. Só a infraestrutura publica; consumidores não recebem o canal publicador. Os envelopes contêm `eventId`, `type`, `occurredAt`, `entityId`, `requestId` quando houver e metadados tipados, sem documento, descrição, trecho, cena ou PNG completos.

| Módulo | Notificações |
| --- | --- |
| Projects | Criação, edição, ordem e ciclo de vida das pastas/projetos |
| Documents | `document.created/saved/trashed/restored/purged/placementChanged` |
| Drawings | `drawing.created/saved/trashed/restored/purged/placementChanged/previewStored` |
| Board | `task.created/updated/textSaved/trashed/restored/purged` e `board.changed` |
| Workspace | `workspace.changed`, com motivo e escopo do fluxo conjunto |

A unidade de trabalho acumula o lote e só o publica depois do commit. Rollback, falha de serialização ou falha no commit descartam as notificações; replay não as repete. Pins e movimentos sem mudança, lixeira sem exclusões e prévias ignoradas não geram evento de alteração. Efeitos em lote dos gatilhos de coluna usam `board.changed`, sem atribuir versões novas a cada tarefa; `task.updated` informa os campos alterados, incluindo etiquetas.

Eventos são snapshots imutáveis e locais à instância. O lote é agendado na ordem de produção; a conclusão de handlers assíncronos não tem ordem global. Falhas síncronas/assíncronas de assinantes são registradas sem mudar o resultado persistido, e o encerramento remove as assinaturas. A entrega é de melhor esforço, em memória: o processo pode encerrar entre commit e notificação. Não há outbox, replay durável ou regra de consistência dependente de assinante.

### Consultas e código compartilhado

Leituras agregadas do workspace ficam em `infra/reader/`, `infra/navigation/` e `infra/flow-reader.ts`. Documento, origens e incorporados de uma resposta compartilham uma transação de leitura; leituras MCP de tarefas e desenhos pertencem aos respectivos módulos. A formatação e os adaptadores MCP ficam em `server/mcp/workspace-tools/`. `readTransaction` continua usando `BEGIN IMMEDIATE`, sem mudança da reserva do escritor nesta etapa.

`versionedUpdate` e `afterKeyset`, em `core/infra`, preservam UPDATE condicional e comparação lexicográfica de chaves parametrizadas. Os módulos possuem seus mapeadores e tabelas tipadas; os leitores agregados conservam projeções SQL próprias. Cursores, desempates e consultas em lote permanecem contratos das consultas.

`CivilDate` e `IsoInstant`, de `core/domain`, distinguem dias de instantes UTC sem mudar JSON ou SQLite. `rich-text/domain` reúne validação de blocos, texto simples, IDs, checklist, trechos, incorporados e Markdown. O chamador resolve entidades para o serializador; a biblioteca não consulta persistência. `drawings/domain` mantém cena, PNG, estrutura e fingerprint, sem runtime do Excalidraw.

## Erros e contrato do RPC

- **Códigos:** `VALIDATION` (400), `UNAUTHENTICATED` (401), `FORBIDDEN_ORIGIN` (403), `NOT_FOUND` (404), `VERSION_CONFLICT` e `REQUEST_REUSED` (409), `DOMAIN_RULE` (422) e `RATE_LIMITED` (429). A web decide pelo código, e desde a etapa 12 a mesma situação tem o mesmo: projeto arquivado é `DOMAIN_RULE`; a referência de ordem que não está mais entre as ativas (pasta, coluna, projeto ou tarefa, inclusive a de outro projeto) é `VERSION_CONFLICT`; um cursor que o servidor não deu é `VALIDATION` (`readClientCursor`).
- **Conflito de versão:** uma frase só, "Este item mudou em outro dispositivo. Atualize os dados antes de continuar.", vista antes ou durante o UPDATE (`versionConflict`).
- **Validação:** um erro de esquema responde a primeira frase escrita para a pessoa: as dos validadores de conteúdo, que variam com o conteúdo (`domainIssue`), e as que os esquemas marcam com `domainMessage`, como o título, o prazo e o projeto da tarefa e os IDs incorporados. Sem nenhuma, responde "Revise os dados enviados e tente de novo.": as mensagens do próprio Zod, inclusive as do locale português das ferramentas dos agentes, são para quem desenvolve.
- **Contexto:** cada chamada recebe a origem permitida, a sessão (dono e ID, sem o token), o cliente e os cookies. O banco e o relógio chegam aos casos de uso pela composição, não pelo contexto.
- **Guardas:** `src/server/rpc-contract.db.test.ts` fixa os procedimentos e o JSON Schema de cada entrada, como o cliente envia e como o caso de uso recebe (`contract/rpc-inputs.snap`), e o nome de operação de cada escrita (`contract/write-operations.snap`). O nome entra na impressão digital de `core_mutations`: o teste reenvia cada escrita contra um registro de pedido calculado com uma cópia de `canonical()`, e um nome ou uma entrada que mude responderia `REQUEST_REUSED` aos reenvios de até 30 dias.

## Autenticação

- Uma conta criada na primeira subida com `OWNER_PASSWORD` e `OWNER_NAME`, sem cadastro público.
- Hash de senha com scrypt e salt aleatório.
- Tokens aleatórios de sessão; apenas os hashes são persistidos.
- Cookie `tinyfold_session` HttpOnly, SameSite=Strict e Secure em produção.
- Sessões renováveis de 30 dias, logout, troca de senha e revogação de sessões no Perfil.
- Login limitado a 10 tentativas por minuto por IP, numa janela deslizante. Com a tabela cheia, os IPs menos recentes são descartados.
- Recuperação de senha por comando no servidor encerra todas as sessões e revoga todos os tokens de acesso na mesma transação da nova senha.
- Tokens pessoais somente leitura para o Claude Code, gerados e revogados no Perfil. Trocar a senha no Perfil não os revoga. Ver [Acesso pelo Claude Code](#acesso-pelo-claude-code-mcp).
- Toda operação de conteúdo exige sessão; chamadas RPC verificam a origem configurada.
- Consulta/renovação de sessão e redefinição/revogação respeitam transações para evitar corridas.

## Modelo

| Tabela | Responsabilidade |
| --- | --- |
| `auth_owner` | Conta única, hash de senha, identidade da instalação e fuso do dono (`time_zone`, pelo nome canônico do Intl) |
| `auth_sessions` | Hash do token, aparelho e validade |
| `auth_access_tokens` | Nome, SHA-256 e prefixo do token pessoal, escopo `read`, criação e último uso |
| `workspace_projects` | Nome, cor (`color`), posição no seletor (`position`, nula nos arquivados), versão, datas e arquivamento |
| `workspace_folders` | Pastas de um nível: projeto, nome, chave do nome sem caixa nem acentos (`name_key`, única entre as ativas do projeto), posição, versão, datas e exclusão lógica |
| `workspace_documents` | Projeto obrigatório, pasta (`folder_id`, nula na raiz), título, JSON, texto de busca, formato, versão, fixado (`pinned_at`) e exclusão lógica |
| `workspace_canvases` | Projeto obrigatório, pasta (`folder_id`, nula na raiz), título, cena vetorial JSON, texto de busca, formato, versão, fixado (`pinned_at`) e exclusão lógica |
| `workspace_canvas_previews` | Uma prévia PNG por desenho: versão e impressão digital da cena, largura, altura e bytes; apagada com o desenho |
| `workspace_columns` | Colunas do quadro, as mesmas para todos os projetos: nome, chave do nome (única entre as ativas), posição, conclusão (`is_done`, exatamente uma ativa), versão, datas e exclusão lógica |
| `workspace_tasks` | Projeto obrigatório, coluna (`column_id`), posição na coluna do projeto, prazo (`due_on`, data civil), conclusão (`completed_at`), título e descrição com versão própria (`text_version`), texto de busca e checklist derivados, versão e exclusão lógica |
| `workspace_labels` | Etiquetas do espaço: nome, chave do nome (única entre as ativas), cor de uma paleta de sete, versão, datas e exclusão lógica |
| `workspace_task_labels` | Ligações entre tarefas e etiquetas, guardadas quando a etiqueta é excluída |
| `workspace_task_sources` | Uma origem por tarefa: documento (nulo depois de excluído de vez), título guardado do documento, bloco opcional e trecho capturado |
| `workspace_state` | Revisão do quadro, que sobe com o que muda a ordem, para validar movimentos concorrentes |
| `core_mutations` | ID do pedido, operação, fingerprint, resposta compacta e data |
| `core_schema_migrations` | Migrações aplicadas e checksums |

As relações têm chaves estrangeiras, e gatilhos recusam `project_id` nulo em documentos, desenhos e tarefas. Desde a migração `006_folders.sql`, gatilhos também garantem que um item vivo só fica numa pasta ativa do próprio projeto, que a pasta não muda de projeto e que não é excluída com itens vivos dentro; um item na lixeira guarda a pasta excluída como origem. Desde a migração `007_board.sql`, gatilhos garantem que toda tarefa, viva ou na lixeira, está numa coluna ativa, que há exatamente uma coluna de conclusão e que `completed_at` existe exatamente nela; também recusam um `id` já em uso em pastas, colunas e etiquetas, o que fecha o `INSERT OR REPLACE`. A lixeira preserva documentos e vínculos; tarefas continuam disponíveis mesmo com a origem excluída, e excluir o documento de vez deixa na origem o título que ele tinha. Trechos removidos ou modificados apresentam estado de origem indisponível e o contexto capturado permanece.

As convenções das migrações e o catálogo dos gatilhos, com o que cada um garante e o teste que o dispara, estão em [banco](banco.md). O esquema que as migrações deixam fica legível em `src/workspace/infra/schema/current.sql`, que o teste `schema.db.test.ts` confere.

## Projetos, navegação e lixeira

Todo documento, desenho e tarefa pertence a um projeto ativo na criação. A migração `005_projects_required.sql` levou os itens soltos, inclusive os da lixeira, ao projeto Geral (ID fixo, criado só quando havia itens soltos), sem mudar versões nem datas. As regras completas estão no [README do workspace](../src/workspace/README.md).

- **Projetos:** cor de quatro chaves e ordem manual no seletor (`moveProject`), sem mudar versão. Qualquer projeto pode ser arquivado, inclusive o último ativo; sem projeto ativo, a interface mostra o estado vazio e o MCP devolve `list_projects` vazio.
- **Fixados por escopo:** até 8 documentos e desenhos na raiz do projeto e até 8 em cada pasta, contados juntos. `pinItem` e `unpinItem` não passam pelo registro de pedidos nem mudam versão ou data, então não conflitam com o autosave de uma página aberta.
- **Pastas:** um nível, só para documentos e desenhos, até 200 ativas por projeto, com o nome único sem caixa nem acentos e só leitura num projeto arquivado. Criar põe a pasta no topo; renomear sobe a versão; reordenar e mudar um item de pasta não mudam versão nem datas, então nunca conflitam com o autosave. `deleteFolder` leva os itens à raiz ou, com `withItems`, à lixeira, e responde as listas que `restoreFolder` usa para desfazer.
- **Mover:** só por `moveItem`, que não leva conteúdo nem conta como edição (`updatedAt` fica). Para outro projeto, exige a versão, sobe a versão, para que um editor com a anterior saiba da mudança, e leva o item à raiz, sem fixado. Para outra pasta do mesmo projeto ou para a raiz (`folderId`), não pede nem muda a versão, e o item mantém o fixado se o destino tiver vaga. `saveDocument` e `saveCanvas` não têm `projectId`.
- **Consultas da interface:** `projectNavigation` (a árvore Itens, `tree`: fixados da raiz, pastas com os fixados e os primeiros itens, e soltos da raiz, até 8 por nível com os totais; mais tarefas abertas e itens na lixeira), `listFolders` (as pastas ativas, para o ⌘K e os menus), `projectOverview` (Agora e Editados recentemente, com o trecho cortado pelo domínio) e `search`, o mesmo caso de uso das ferramentas MCP, numa porta `NavigationReader` com SQL em `infra/navigation/`.
- **Lixeira por projeto:** `listTrash` traz até 1.000 itens, do excluído mais recentemente, com a pasta de origem de cada documento e desenho, mesmo excluída; a contagem da lateral e da Visão geral é sempre exata. Restaurar devolve o item à pasta, ou à raiz se ela foi excluída (`folderGone`). Excluir de vez (`purgeDocument`, `purgeCanvas`, `purgeTask`) só vale para item na lixeira, e `emptyTrash` recebe exatamente os itens mostrados (até 1.000) e responde `{ purged, skipped }`.
- **Leitura da lixeira:** `getDocument` e `getCanvas` respondem também o item na lixeira, com `deletedAt`, para que o editor aberto guarde um rascunho local ou o salve como cópia; gravar num item excluído continua recusado. `listDocuments` e `listCanvases` só listam os vivos, por projeto; a busca por texto é `search`. O resumo de cada item são os primeiros 280 pontos de código do texto, cortados pelo SQLite.
- **Respostas de escrita:** de documentos, desenhos e tarefas são compactas, sem título, conteúdo nem trecho, para que excluir de vez não deixe o texto no registro de pedidos.
- **Texto que não se desenha:** nomes de pasta, nomes de projeto e títulos perdem os pontos de código ignoráveis (`visibleText`, no domínio do `core`) e ficam em NFC, com exceções para emoji e escritas que precisam deles; o MCP aplica a mesma função ao que devolve. O nome do dono passa pela mesma regra na criação da conta, cortado em 100 pontos de código.

### Desfazer

Excluir uma pasta, com ou sem os itens, e mover um item entre pastas ou projetos têm "Desfazer" no toast, assim como, desde a etapa 10, excluir uma coluna ou trocar a de conclusão, excluir uma etiqueta e concluir, reabrir ou mudar o projeto de uma tarefa. A exclusão é lógica e a restauração é versionada: `restoreFolder` recebe as listas que `deleteFolder` respondeu, devolve a pasta à posição guardada e só traz de volta o que continua como a exclusão deixou, contando os outros em `skipped`. Desfazer um movimento é outro `moveItem`. Uma pasta com mais de 1.000 itens, ou uma coluna excluída ou trocada com mais de 1.000 tarefas, sai sem Desfazer. As colunas e etiquetas seguem o mesmo padrão em `restoreColumn`, `setDoneColumn` (com a lista `restore`) e `restoreLabel`.

No cliente, o ⌘Z desfaz a ação do toast na tela (`ToastProvider`, com a guarda `undoKeyAction`): só fora de campos editáveis, do editor, do Excalidraw e de menus e diálogos, e nunca a de um toast que já saiu. Fora de campos e editores, ⌘Z, ⇧⌘Z e Ctrl+Y nunca chegam ao navegador, cujo desfazer reverteria a última edição de um editor já sem foco. Cada Desfazer pertence à sua mudança (`lib/item-changes.ts`): uma mudança mais nova do mesmo item tira o Desfazer do toast anterior. As escritas passam uma de cada vez (`lib/write-queue.ts`), cada intenção guarda o seu ID de pedido, e uma resposta perdida é reenviada uma vez com o mesmo ID (`lib/lost-answer.ts`), que devolve a resposta guardada.

Desde a etapa 12, esse protocolo tem um núcleo só, `runUndoableChange` (`lib/writes/undoable-change.ts`), puro e testado sem React. A mudança começa quando a fila a aceita; o toast oferece o Desfazer; uma mudança mais nova o retira; e o Desfazer espera a escrita em curso e confere que ainda é a mais recente antes de rodar. `useUndoableChange` o liga ao toast, ao anunciador e às mudanças dos itens. Passam por ele as mudanças de tarefa, coluna e etiqueta e os movimentos entre pastas e projetos. Excluir pasta e arquivar projeto guardam o próprio Desfazer, que uma mudança mais nova não retira. Os ganchos de escrita da web (`useAction`, `useUndoableChange` e o provedor das mudanças) ficam em `shell/writes/`.

## Quadro e tarefas

As regras completas estão no [README do board](../src/board/README.md); o plano e os desvios, na [etapa 10](etapas/10-quadro-tarefa.md).

- **Colunas:** um conjunto para todo o espaço, até 20 ativas, com nome único pela chave das pastas e sempre uma de conclusão e uma aberta. Excluir uma coluna leva todas as tarefas dela, vivas e na lixeira, de todos os projetos, ao destino escolhido. Trocar a de conclusão conclui as tarefas da nova e reabre as da antiga, sem mudar versão nem data de edição.
- **Conclusão:** entrar na coluna de conclusão grava `completed_at`, e sair dela o apaga. Concluir põe a tarefa no topo da coluna de conclusão; Reabrir, no fim da primeira aberta.
- **Campos e texto:** `updateTask` grava coluna, projeto, prazo e etiquetas (até 20) com `version`; `saveTaskText` grava título e descrição juntos com `text_version`, então digitar nunca conflita com um campo mudado em outro aparelho. A descrição usa o validador e os limites do documento, e o servidor deriva o checklist, o texto e a busca. As escritas de tarefa recusam chaves desconhecidas.
- **Revisão do quadro:** sobe só com o que muda a ordem (criar, mover, mudar de coluna ou de projeto, lixeira e as escritas de coluna). Prazo, etiquetas e texto não a sobem. O Desfazer move sem revisão, conferindo o lugar pela vizinha.
- **Datas civis no fuso do dono:** `auth_owner.time_zone` recebe o fuso do navegador na primeira carga e muda no Perfil; até lá, ou se o valor gravado for inválido, vale UTC. O servidor injeta `timeZone()` no workspace e nas ferramentas MCP. Uma tarefa está atrasada a partir do dia seguinte ao prazo, fora da coluna de conclusão, e a coluna de conclusão mostra as concluídas desde o início de hoje − 13 dias.
- **Leituras:** `projectBoard` (as tarefas do quadro, com a janela de 14 dias, `today` e `olderDone`), `listCompletedTasks` (Concluídas, por cursor `c~<conclusão>~<id>`), `listColumns`, `listLabels` e `getTask` (com a descrição, também da lixeira). `listProjects`, `projectNavigation` e `projectOverview` contam as atrasadas, e a Visão geral traz o Agora e as concluídas recentes.
- **Gaveta da tarefa:** fica no shell (`TaskDrawerProvider` em `shell/task-drawer-state.tsx` e `DrawerRegion.tsx`), fora das páginas, então ela e o editor da descrição sobrevivem à navegação. Abaixo de 720 px, cobre a página. O texto salva por uma sessão de autosave por tarefa (`components/task-drawer/task-session.ts`), num conjunto (`lib/autosave/session-pool.ts`) que a guarda enquanto a gaveta mostra a tarefa ou enquanto o texto não está salvo; solta sem estar salva, ela tenta de novo quando a rede volta e avisa antes de sair da página.
- **Quadro na web:** um widget com uma parada de Tab (`pages/board/board-keys.ts`), em que as setas andam entre cards e colunas e ⇧ e setas movem; o arrastar é HTML nativo, com o alvo calculado por `board-drop.ts`. Os movimentos passam pela fila de escritas, e cada um tira o Desfazer do toast anterior da mesma tarefa.

## Documento e incorporados

O plano e os desvios estão na [etapa 11](etapas/11-documento-desenho.md); as regras do domínio, no [README do workspace](../src/workspace/README.md#incorporados).

- **Blocos:** `taskEmbed { taskId }` e `drawingEmbed { canvasId }` são nós sem conteúdo no JSON do documento. Existem só no esquema do documento (`documentSchema`); a descrição usa `descriptionSchema`, sem eles. O domínio só os aceita por `readDocumentContent(…, { embeds: true })`, com um UUID em minúsculas, sem filhos e até 200 por documento. Não há migração, chave estrangeira nem índice reverso. O texto de busca, o lead e o trecho ignoram os incorporados, e `format_version` continua 1.
- **Resolução:** `resolveEmbeds` responde um estado por ID (`live`, `trashed` ou `missing`), numa leitura sem registro de pedido, pelo SQL de `infra/reader/embeds.ts`, que o MCP também usa.
  - **Na web:** `DocumentEmbeds.tsx` manda os IDs do editor, salvos ou não, a uma consulta por documento (`['workspace', 'embeds']`). As escritas do workspace a invalidam, e ela é lida de novo ao voltar à aba. Os blocos leem o estado de um contexto (`embeds-context.tsx`).
  - **IDs recusados:** um ID que o servidor recusa nunca chega ao resolver, e o bloco aparece como excluído.
- **Prévias:** a figura mostra a prévia guardada por `GET /arquivos/desenhos/:id/previa.png` (`src/server/files/`).
  - **Rota:** exige a sessão (o cookie, nunca um bearer) e responde com `ETag` da impressão digital, `Cache-Control: private, no-cache` e `nosniff`. Com `If-None-Match`, responde 304; para desenho na lixeira, excluído ou sem prévia, 404.
  - **Regeneração:** o documento regenera a prévia defasada (`use-embed-preview.ts`), uma de cada vez e com o navegador ocioso. O módulo de exportação do Excalidraw só carrega nessa hora.
  - **Tema escuro:** a imagem recebe o filtro do modo escuro do Excalidraw.
- **Inserir e remover:**
  - **Inserir:** o menu `/` (`insert-menu.tsx`) e o ⌘K abrem o seletor (`EmbedPicker.tsx`). O bloco toma o lugar do parágrafo vazio do `/`, ou entra depois do bloco atual, e fica selecionado como nó.
  - **Remover:** é uma edição do documento, com toast e Desfazer. O Desfazer devolve o bloco ao lugar dele, com o mesmo ID (`embed-removal.ts`), e não faz nada se o ⌘Z do editor já o devolveu.
  - **Tarefa de um trecho:** com "Incorporar no documento", a criação chama o `insertEmbedAfter` do editor aberto, registrado no `save-registry`.
- **Teclado:** `embed-keys.ts` é uma extensão do BlockNote, uma por editor. Com um incorporado selecionado como nó:
  - as setas levam ao bloco seguinte ou ao anterior pela API do editor;
  - ↵ abre; ⌫ e Delete primeiro selecionam e depois removem;
  - ⇧↑ e ⇧↓ estendem a seleção ao bloco vizinho, e Page Up e Page Down não fazem nada;
  - digitar abre um parágrafo depois do incorporado (`embed-typing.ts`), e ⌘C escreve o link do item (`embed-clipboard.ts`).

  Em qualquer seleção, Tab não aninha blocos sob um incorporado. Desde a etapa 12, as teclas são uma tabela (`embed-keymap.ts`, `{ key, intent, holds, run }`), da qual saem o mapa e as teclas que a guarda segura. Para onde cada tecla leva a seleção é puro e testado no esquema do documento: `embed-selection.ts` lê a seleção e `embed-targets.ts` calcula o alvo. `embed-blocks.ts` nomeia cada bloco incorporado, com o tipo do item e a propriedade do ID. `selection-drift.ts` é o único módulo que conhece a deriva da seleção do Chrome para o primeiro texto do documento e o observador privado do ProseMirror, com a política da guarda numa função pura (`driftDecision`), como na [etapa 11](etapas/11-documento-desenho.md#desvios-do-plano). Colar deixa de fora um incorporado com ID recusado (`embed-paste.ts`), e os rascunhos e os salvamentos passam por `sanitizeEmbeds`.
- **Marcador de origem:** uma decoração do ProseMirror (`origin-markers.tsx`, com os lugares em `origin-places.ts`), feita das origens das tarefas do documento, sem tocar no JSON. É um botão no fim do trecho (`excerptEnd`), ou no fim do bloco quando o trecho mudou. Abre a gaveta e, no hover, sublinha o trecho por um destaque CSS. Fica fora da ordem do Tab, e o popover "Tarefas · n" leva às mesmas tarefas.
- **Markdown e endereço:** a exportação `.md` usa `documentToMarkdown` do domínio com `embedResolver` e os endereços do aplicativo (`/tarefas/<id>` e `/desenhos/<id>`). `/tarefas/$taskId` abre a tarefa na gaveta, no quadro do projeto dela.

## Salvamento e múltiplos dispositivos

1. O editor registra a edição local em localStorage, separada por instalação, documento e escritor da página.
2. Uma referência em sessionStorage permite recuperar o rascunho após recarga. Cada nova página ganha identidade própria, inclusive quando a aba foi duplicada.
3. O autosave agrupa mudanças e mantém no máximo uma chamada em voo por documento.
4. Cada envio tem `requestId`, `expectedVersion` e um snapshot imutável. Reenvios mantêm o mesmo pedido.
5. O servidor valida a versão, incrementa-a e grava a confirmação idempotente na mesma transação.
6. A resposta contém metadados compactos, sem duplicar o documento no histórico de pedidos. A retenção é de 30 dias, com limpeza na subida e diariamente.
7. Conflitos preservam a edição local e oferecem carregar a versão remota ou salvar como cópia. Não há mesclagem automática.
8. Atualizações das consultas respeitam rascunhos pendentes. Salvamento também atualiza o estado das origens de tarefas vinculadas.
9. Mover o item aberto de projeto passa pelo autosave: o que está pendente é salvo, `moveItem` vai com a versão salva, e o editor adota o projeto e a versão da resposta; o que foi digitado durante o movimento sai no próximo salvamento.

A recuperação depende do armazenamento disponível no navegador; não equivale a um cliente offline completo. Rascunhos inválidos não são carregados no editor.

O controlador de autosave aceita snapshots e validadores de rascunho específicos de documentos e desenhos. As chaves antigas dos documentos foram preservadas; desenhos usam outro namespace por instalação, recurso e escritor. Durante o desenho contínuo, as gravações locais são agrupadas em intervalos de até 100 ms, com persistência adicional ao soltar o ponteiro ou sair. O envio ao servidor aguarda 650 ms de pausa e mantém uma chamada em voo.

Desde a etapa 12, o autosave fica em `src/web/lib/autosave/`:

- **Controlador:** `AutosaveController`, sem formato de rascunho padrão: cada sessão dá o seu leitor.
- **Sessões de item:** `defineItemSession` (`item-session.ts`) faz as do documento e do desenho a partir de uma especificação: snapshot, armazenamento, rascunho, conferência, envio, cache, invalidações e o que vive ao lado, como as prévias do desenho. É uma sessão por instalação e item, pela vida da aba, registrada para o ponto "não salvo". A sessão do texto da tarefa fica à parte, no conjunto de `lib/autosave/session-pool.ts`.
- **Página:** `watchPage` (`page-listeners.ts`) dá os mesmos ouvintes a um editor aberto e a uma sessão que sobreviveu a ele.
  - Tenta de novo um salvamento que falhou quando a rede volta.
  - Avisa antes de sair com trabalho não salvo.
  - Salva quando a aba se esconde.
  - Nem a rede que volta nem a aba escondida reenviam uma recusa definitiva (`refused`, em `VALIDATION`, `DOMAIN_RULE`, `BAD_REQUEST`, `PAYLOAD_TOO_LARGE` ou `REFUSED`) enquanto o texto não muda. Uma edição a limpa. Esconder a aba também não reenvia um conflito, que a pessoa resolve.
- **Lixeira:** um documento ou desenho na lixeira com texto local segura os envios (`hold`). Nada sai, as edições continuam no rascunho do aparelho, e a página mostra só a faixa da lixeira, com a cópia e o download. Sem nada local, a página só leva à lixeira, sem editor, sem comandos no ⌘K e sem o título na aba.
- **Rascunho baixado:** o arquivo de um rascunho se chama `tinyfold-rascunho-<documento|desenho|tarefa>-<id>.json` (`lib/autosave/local-drafts.ts`).

A sessão vencida só se detecta no link RPC (`lib/api.ts`), em toda resposta 401. Os eventos da sessão têm nome em `lib/session-events.ts`, e sair passa por `signOut()` (`lib/session.ts`).

## Rotas e shell

A SPA usa TanStack Router com endereços em português, sempre dentro de um projeto:

| Endereço | Tela |
| --- | --- |
| `/projetos/$id` | Visão geral |
| `/projetos/$id/quadro` (`?tarefa=`) | Quadro; `?tarefa=` abre a tarefa na gaveta e sai do endereço |
| `/projetos/$id/concluidas` | Concluídas do projeto, por mês |
| `/projetos/$id/indice` (`?tipo=documentos\|desenhos`, `?pasta=<id>\|raiz`) | Índice de documentos e desenhos, agrupado por pasta |
| `/projetos/$id/lixeira` | Lixeira do projeto |
| `/projetos/$id/documentos/$docId` (`?bloco=`) e `/projetos/$id/desenhos/$canvasId` | Editores |
| `/projetos` | Estado vazio, sem projeto ativo |
| `/perfil` e `/entrar` | Perfil e login |

`/` reabre o último lugar do último projeto, com a rolagem, guardado no dispositivo por instalação; o caminho guardado só é usado se for um endereço interno conhecido. Os endereços anteriores (`/documentos/$id`, `/desenhos/$id`, listas e `/login`) redirecionam, e um item aberto no endereço de outro projeto passa ao endereço certo. `/tarefas/$taskId`, o endereço permanente de uma tarefa nos arquivos exportados, abre a tarefa na gaveta, no quadro do projeto dela. Uma codificação quebrada ou um endereço desconhecido mostram uma página em português dentro do shell.

O shell (`src/web/shell/`) tem a lateral de 256 px a partir de 1.100 px, com a árvore Itens (o `Tree` do React Aria, `treegrid`), em que os atalhos N, P, M e G ganham do typeahead e um arrastar leva itens entre pastas e reordena pastas, a faixa de 52 px (⌘\\) e a lateral sobre a página entre 720 e 1.100 px, e abaixo de 720 px uma barra de 44 px que recebe as ações da página. Buscar filtra na lateral; o ⌘K busca em todos os projetos e lista as ações do item aberto e os comandos. Atalhos de uma tecla não valem em campos editáveis, durante uma composição de IME nem no Excalidraw, e o Esc fecha só a camada mais recente, sem navegar. As teclas de cada atalho têm nome uma vez, em `KEYS` (`shell/keyboard/keys.ts`), que a tabela de Atalhos, a paleta, os menus e as dicas leem. Um teste confere que a tabela de Atalhos lista todas. O quadro, a gaveta e o shell usam a mesma regra de campo (`isTextTarget`): um checkbox, um rádio ou um botão só recebem um toque e deixam valer as teclas da página. Toasts mostram um por vez, o mais novo no lugar do anterior, em regiões vivas que um modal não esconde. A gaveta da tarefa fica abaixo da página, na mesma coluna de trabalho, que ela empurra para cima; é uma camada do Esc e uma região do F6, e a tarefa aberta fica no estado do shell, não no endereço.

O estado do shell é dividido entre sobreposições, pedidos da lateral, página e filtros do quadro; ações estáveis e hooks por assunto evitam assinaturas desnecessárias. `ShellUiProvider` mantém uma fachada para os poucos hosts que combinam assuntos. `SidebarRegion`, `ShellOverlays` e `useSidebarMode` compõem o layout. `useCreateInProject`, o registro de comandos e os descritores do item aberto são usados pela paleta e pelos menus. `router/` só monta rotas; `navigation/` contém caminhos e navegação. `lib/` agrupa React, datas, texto, arquivos, escritas, consultas e autosave. Consumidores chegam aos componentes e ao shell por entradas públicas; módulos puros de exibição não carregam RPC ou React.

## Modelo de teclado

Cada alvo possui suas teclas: primeiro o campo ou editor, depois o widget ou diálogo, e por fim o comando da página ou do shell. Um evento já tratado, uma composição de IME ou uma repetição indevida não dispara outro comando. `isTextTarget` distingue escrita de texto de checkbox, rádio e botão; dentro do BlockNote e do Excalidraw, o editor conserva as teclas que lhe pertencem. N e ⌘K não repetem criações enquanto segurados; durante a criação, o texto segue para o novo título.

Esc limpa primeiro a busca preenchida ou sai do campo, depois fecha uma única camada, da mais recente para a anterior. Rascunho de tarefa pede descarte; Esc na confirmação conserva o texto. Paleta, lateral sobreposta, menus e gaveta devolvem o foco ao alvo apropriado. A tabela `KEYS` fornece nomes de atalhos para execução, menus, dicas e Atalhos; funções de foco e o contrato do DOM ficam compartilhados.

Comandos emprestados por editores usam `useCommandSlot`, com publicação e limpeza em efeito passivo e conferência do dono. `useStableHandlers`/`lateHandlers` preservam identidade e consultam a função mais recente, mantendo a presença real dos comandos opcionais. Isso evita oferecer um comando ausente ou executar uma closure de outro item, sem antecipar a publicação do ⌘↵ da gaveta.

Nos incorporados, `embed-keymap` nomeia as teclas, `embed-selection` e `embed-targets` calculam seleção e destino, e `selection-drift` concentra o contorno do Chrome. A proteção conserva sua janela de 80 ms e só acompanha teclas confiáveis; seleção pelo ponteiro ou por outros meios fica livre. Setas, seleção estendida, remoção em duas etapas, digitação, colagem e Tab mantêm os percursos verificados no esquema e no navegador.

## Tema, tokens e fontes

`src/web/styles/tokens/` (`palette.ts` e `scale.ts`) é a fonte das cores, sombras, tipos, raios, alturas e durações; `pnpm tokens` grava `tokens.css`, e o `check` falha quando o arquivo diverge, quando um valor difere de `docs/interface/prototipo/tokens.py` ou quando um par de contraste fica abaixo do exigido. O tema Sistema, Claro ou Escuro fica no dispositivo (`tinyfold:theme`); `public/theme.js` aplica `data-theme`, `color-scheme` e a cor da barra antes da primeira pintura, e `useTheme` mantém isso enquanto o aplicativo roda, inclusive entre abas. BlockNote e Excalidraw seguem o tema; a prévia guardada do desenho continua clara, e a figura de um documento a mostra com o filtro do modo escuro do Excalidraw.

Inter vem completa de `inter-ui` (com `cv05`, `ss03`, `case` e `tnum`) e JetBrains Mono da Fontsource, ambas emitidas pelo Vite na própria origem, com o arquivo regular da Inter pré-carregado.

`SearchableMenu` compartilha a estrutura acessível e o campo de filtro entre projetos, pastas, etiquetas e incorporados: altura 28 px, padding interno horizontal de 6 px e externo de 6 px. A busca de projetos exige todas as palavras, sem depender da ordem. `InlineNameField` compartilha campo, erro e associação acessível; cada host conserva sua política de Enter, Esc, blur e foco. Os três campos usam peso 500 e `--danger` no erro. A descrição de tarefa usa peso 400 nos dois temas.

`ui-medium` nomeia o papel 500/13/20. O editor recebe tipo e tracking por variáveis do host; estilos da gaveta, etiquetas, seletor de incorporados e marcadores vivem junto aos componentes. Larguras do layout têm tokens próprios, e estados da árvore usam atributos `data-*`. Valores sem equivalência exata, inclusive a diferença histórica entre os limites 719 px e 719,98 px, permanecem documentados nas exceções das convenções de CSS.

## Editor e limites

BlockNote armazena JSON no formato versão 1. O esquema permite parágrafos, títulos, listas, checklist, citações, código e equações LaTeX em linha ou em bloco. A validação verifica hierarquia, IDs, estilos, links, propriedades e blocos aceitos pelo editor. O texto extraído, incluindo a fonte LaTeX, alimenta a busca sem diferenciação de acentos.

Equações usam o esquema e o renderizador KaTeX de `@blocknote/math-block`, na mesma versão do editor. A edição em linha usa um diálogo com textarea nativo e prévia: a janela contenteditable da versão 0.56 perdia o primeiro caractere ao substituir uma fórmula existente. Fórmulas incompletas continuam salvas e editáveis. Não foi necessária migração do banco. Fontes KaTeX são emitidas como arquivos locais, mantendo a política CSP de mesma origem.

O conteúdo persistido tem limite de 1 MiB e 5.000 blocos; pedidos HTTP têm limite de 2 MiB. A recuperação local admite, de forma limitada, até 5 MiB e 20.000 blocos válidos para permitir reabrir e exportar uma edição que ultrapassou o limite do servidor. Isso não aumenta o limite de persistência.

Importar Markdown cria outro documento e preserva o documento aberto. Exportar usa o conteúdo atual do editor e o serializador do domínio, o mesmo do MCP: tarefas e desenhos incorporados viram links para o aplicativo, que a importação traz de volta como links comuns. Propriedades que Markdown não representa podem ser perdidas; projetos, vínculos de origem e sessões não fazem parte do arquivo `.md`.

O intercâmbio de equações usa a árvore sintática Markdown para reconhecer delimitadores fora de código, links e HTML. As demais estruturas continuam sendo processadas pelo BlockNote. A exportação preserva a fonte LaTeX sem depender da renderização, inclusive quando inválida, e verifica se todas as fórmulas foram restituídas. Ver [equações](equacoes.md) para sintaxe e limites.

O editor em blocos fica em `src/web/editor/` e é o mesmo para documentos e para a descrição das tarefas, com dois esquemas: o do documento tem os incorporados, e o da descrição, não. A descrição ganha só o tamanho próprio (14/22) e não tem "Criar tarefa". Criar tarefa é uma ação explícita sobre a seleção. Um trecho de um único bloco usa sua âncora; uma seleção que atravessa blocos usa o documento como origem. Checklists continuam locais ao texto.

## Canvas e limites

O Excalidraw 0.18.1 carrega sob demanda em `/projetos/$id/desenhos/$canvasId`; os desenhos de um projeto aparecem na lateral e no Índice. O domínio valida JSON vetorial sem depender do runtime do editor. A cena persiste elementos e cor de fundo; viewport, seleção, menus, arquivos de mídia e histórico de desfazer não fazem parte do conteúdo no servidor.

Cada cena admite até 1 MiB e 5.000 elementos; a recuperação local admite até 5 MiB e 20.000 elementos válidos. A cena gravada remove elementos excluídos sem referências, preservando os necessários aos vínculos ativos. O histórico nativo em memória mantém os elementos para desfazer ações. Texto de busca é derivado apenas dos elementos de texto ativos.

Todas as mutações de canvas retornam confirmação compacta. A migração adicional `002_canvases.sql` mantém intactos documentos e tarefas existentes. A leitura autenticada também retorna desenhos na lixeira, permitindo recuperar um rascunho local após exclusão remota; gravar sobre um desenho excluído continua recusado.

Importar `.excalidraw` valida e compacta a cena antes de criar outro desenho. O arquivo tem limite de 2 MiB e a cena final respeita o teto persistido. PNG é gerado a partir do snapshot atual, com lado máximo de 4.096 pixels. Imagens e conteúdo incorporado são recusados em importação, colagem e arraste.

As fontes são copiadas pelo Vite para a própria origem no desenvolvimento e no build. Uma correção versionada pelo pnpm remove o fallback de CDN quando há caminho de fontes configurado, mantendo a política `font-src 'self'`; veja [stack](stack.md).

## Acesso pelo Claude Code (MCP)

O servidor expõe `/mcp` na mesma origem da SPA e de `/rpc`, por Streamable HTTP sem sessão, com o SDK oficial `@modelcontextprotocol/server` 2.4.0 (`createMcpHandler` com `legacy: 'stateless'` e `responseMode: 'json'`). Seis ferramentas somente leitura respondem: `list_projects`, `search`, `read_document`, `read_drawing`, `list_tasks` e `read_task`. Itens na lixeira ficam de fora de todas.

`responseMode: 'json'` vale para a revisão 2026-07-28 do protocolo. Um cliente que negocia uma revisão 2025 recebe a resposta como um único evento SSE. Assinaturas são recusadas (`maxSubscriptions: 0`), e as ferramentas declaram `listChanged: false`.

### Verificações em `/mcp`

1. `Origin`, quando presente, igual a `APP_ORIGIN` (403 `forbidden_origin`). Clientes de terminal não a enviam.
2. `Content-Length` declarado até 64 KiB (413).
3. `Authorization: Bearer <token>` válido e não revogado. Em falha, 401 `invalid_token` com `WWW-Authenticate`; só então o IP é contado, e 10 falhas por minuto dão 429 com `Retry-After`. Um token válido nunca é bloqueado pelo limite de IP.
4. No máximo 240 requisições por minuto por token (429).
5. O endpoint lê o corpo, limitado a 64 KiB mesmo sem tamanho declarado. JSON inválido responde 400 com `-32700`, e lotes JSON-RPC, 400 com `-32600`. O SDK recebe a mensagem já lida e nunca a interpreta de novo.

Respostas saem com `Cache-Control: no-store`, e os erros HTTP usam o formato OAuth em português. `/.well-known/*` responde sempre 404 em JSON, antes do fallback da SPA. O SDK recebe só o ID do token, nunca o segredo. Os limites de taxa ficam em memória, por processo, como prevê a instância única.

| Aspecto | `/rpc` (navegador) | `/mcp` (Claude Code) |
| --- | --- | --- |
| Credencial | Cookie de sessão; `Authorization` é ignorado | Só bearer; cookies são ignorados |
| Origem | Obrigatória e igual a `APP_ORIGIN` | Opcional; quando presente, igual a `APP_ORIGIN` |
| Corpo | 2 MiB | 64 KiB, uma mensagem por requisição |

### Tokens

`tf_mcp_` seguido de 43 caracteres base64url (256 bits). O banco guarda só o SHA-256, o prefixo de 13 caracteres para reconhecer o token, o nome (1 a 100 caracteres), a criação e o último uso, gravado no máximo uma vez por minuto. São até 10 tokens ativos, sem validade. A criação não passa pelo registro de pedidos, que guardaria o segredo, e revogar apaga a linha. No Perfil, o segredo só existe no estado do diálogo que o mostra uma vez.

### Leitura por agentes

As ferramentas do workspace são objetos simples (`createWorkspaceTools(db, { logError, clock, timeZone })`), sem dependência do SDK. Casos de uso em `application/reading/` usam a porta `WorkspaceReader`, implementada em `infra/reader/`. Os limites ficam em `domain/reading-limits.ts`.

- **Busca:** exige todas as palavras da consulta, normalizadas sem caixa e acentos, e ordena por palavras no título e depois pela edição mais recente. O trecho de 240 caracteres vem de uma janela do texto em volta da primeira ocorrência, numa linha só, com os blocos do documento ou os textos do desenho separados por vírgula.
- **Listas:** são paginadas por chave (`s~…`, `t~…`, `p~…`). O cursor do quadro fixa a revisão do quadro e a posição da coluna, e é recusado depois de qualquer mudança na ordem.
- **Tarefas:** `list_tasks` filtra pelos nomes das colunas e das etiquetas e traz, de cada tarefa, a coluna, o prazo, o atraso no fuso do dono, as etiquetas, o checklist e a conclusão; `read_task` responde em Markdown, como `read_document`, com a descrição em páginas de 36.000 caracteres; a busca acha tarefas também pela descrição.
- **Documentos:** saem em Markdown do serializador puro do domínio (`documentToMarkdown`), em páginas de 36.000 caracteres com cursor `<impressão>:<deslocamento>`, presas ao texto paginado, e não à versão, para que mover ou renomear não as invalide; a primeira reserva 9.000 para cabeçalho e rodapé. Um bloco cortado pela página é fechado e reaberto. Os incorporados saem como links `tinyfold:task/<id>` e `tinyfold:drawing/<id>`, que `read_task` e `read_drawing` recebem, ou como `[Item indisponível]`, resolvidos na mesma leitura; o cursor fica preso ao texto resolvido.
- **Desenhos:** saem como estrutura textual da cena atual (`outlineCanvasScene`) e a prévia PNG guardada.
- **Projetos e origens:** `list_projects` traz cor, posição, `folderCount` e até 50 pastas por projeto, com a contagem de itens, sem `withoutProject`; a busca diz se o item está fixado e em que pasta está (`folder`), e aceita `folderId`; `read_document` e `read_drawing` trazem a linha da pasta no cabeçalho; uma origem de tarefa cujo documento foi excluído de vez vem com `documentId: null` e o título guardado.
- **Respostas:** têm até 45.000 caracteres de texto, rodapés e erros incluídos, só em `content`, sem `structuredContent`. O Claude Code 2.1.310 grava num arquivo o resultado que passa de 50.000 e mostra ao modelo só uma prévia. Cada ferramenta cabe no teto pelo próprio orçamento, e `withTextCeiling` corta, com aviso, o que ainda passasse.

O [README de rich-text](../src/rich-text/README.md) descreve o Markdown e suas perdas conhecidas no parser do BlockNote; o [adaptador MCP](../src/server/mcp/workspace-tools/README.md) registra os limites das respostas.

### Prévias de desenho

O navegador renderiza a prévia com o próprio Excalidraw, em tema claro, 1,5 s depois de um salvamento e com o navegador ocioso. Tenta lados de 1.568 px para baixo até o arquivo caber em 200 KiB, ou 256 KiB no menor lado, e envia por `workspace.saveCanvasPreview` com a impressão digital da cena que ela mostra: uma prévia ainda em geração quando o desenho é movido, renomeado ou vai para a lixeira continua valendo. A gravação não usa o registro de pedidos nem muda versão, datas ou revisão do quadro.

O servidor só aceita um PNG completo, cujos dados de imagem descomprimem exatamente no tamanho do cabeçalho, em linhas com tipos de filtro válidos, até 1.568 px e 256 KiB. A prévia guarda a impressão digital da cena (`sceneFingerprint`): renomear, mover ou passar pela lixeira não a torna defasada. `getCanvas` devolve `previewVersion` e `previewCurrent`.

O editor gera a prévia ao abrir um desenho sem prévia atual, ao adotar uma versão salva em outro dispositivo e depois de cada salvamento que muda a cena. Um documento gera a de um desenho incorporado cuja prévia está defasada ou ausente, e a mostra pela rota da prévia ([Documento e incorporados](#documento-e-incorporados)). Uma cena que nenhum tamanho comporta não é renderizada de novo até mudar.

### Módulos e portas

- **auth:** `domain/access-token.ts`, os casos de uso em `application/access-tokens/` e, na infraestrutura, o repositório, os segredos e `createAccessTokens`.
- **rich-text:** validação e serialização/paginação Markdown puras.
- **drawings:** cena, PNG e fingerprint no domínio; aplicação de prévias pela porta `PngImageData`; leitura para agentes e adaptador de descompressão na infraestrutura.
- **board:** consultas de tarefas, origens, colunas e etiquetas para owner e agentes.
- **workspace:** leitura agregada de documentos com incorporados, projetos, navegação e busca.
- **server/mcp/workspace-tools:** formata as seis ferramentas a partir das consultas compostas pelo servidor.
- **server:** serve a prévia aos documentos em `src/server/files/canvas-preview-route.ts`, antes do fallback da SPA, e compõe o MCP em `src/server/mcp/`, com `bearer.ts`, `request-body.ts`, `mcp-server.ts` (registro das ferramentas no SDK) e `endpoint.ts` (`mountMcp`), e o IP do cliente em `client-ip.ts`.
- **Migrações:** `auth/002_access_tokens.sql`, `workspace/003_canvas_previews.sql` e `workspace/004_canvas_preview_fingerprint.sql`.

## Operação

Docker serve SPA e API e mantém o banco em `/data`. A inicialização ajusta o dono dos volumes montados como `root` e passa a execução do aplicativo para `node`, sem privilégios. `/health` verifica o processo; `/ready` consulta o banco. O backup usa a API do SQLite, verifica integridade e não substitui arquivos existentes; inclui tokens e prévias de desenho. Restauração cria outro arquivo.

`.railway/railway.ts` descreve uma instância, o volume em `/data` e o domínio `folder.jalzn.com`, usa `/ready` e dá 30 segundos para encerramento. A inicialização recusa o Railway sem a variável de volume apontando para `/data`. As migrações continuam na subida, com o volume montado. No Railway, `BACKUP_DIR=/data/backups` usa o mesmo volume. Os backups nativos exigiram plano Pro na tentativa desta conta; o agendamento e a cópia externa automática dos snapshots continuam pendentes. O subdomínio da Cloudflare usa a origem HTTPS exata de `APP_ORIGIN`.

Veja [operação](implantacao.md), [Railway e Cloudflare](railway.md) e [validação](validacao.md). Serviço, volume, variáveis, DNS e HTTPS estão configurados. Login pelo subdomínio, persistência de sessão entre deploys e snapshot remoto foram verificados. Agendamento e armazenamento externo automático de backups continuam pendentes.
