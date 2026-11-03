# Etapa 13 — Módulos de negócio e contratos públicos

**Estado:** concluída em `refactor/stage13-modules` e integrada por fast-forward na `main`, a pedido do usuário. Código em `59f6306`; validação automática, comparação visual e passagem assistida no Chrome do Herdr aprovadas. O registro abaixo distingue o plano original da execução.

**Referência para o inventário:** `2090dea`, em 2026-11-03. A [etapa 12](12-refatoracao.md) está concluída. Esta etapa amplia a separação arquitetural, preservando o comportamento do produto.

## Objetivo e escopo

Dividir o atual `workspace` em módulos com responsabilidades explícitas, uma classe de entrada por módulo e contratos de comandos, consultas e eventos. As classes compõem e delegam; as regras continuam em `domain/` e `application/`, e a persistência fica em `infra/`.

O resultado precisa permitir alterar documentos, desenhos, quadro ou projetos sem conhecer todos os repositórios do aplicativo. Operações que atravessam essas áreas continuam atômicas, com a mesma proteção de versões e retentativas.

Entram nesta etapa a separação dos pacotes, a composição transacional, eventos internos após commit, a migração dos consumidores, as regras automáticas de dependência e a documentação. A interface, as regras do produto e os contratos externos permanecem equivalentes. Auth conserva seus serviços atuais; adaptar sua API a uma classe própria pode ser outra etapa.

Outbox persistente, filas externas, event sourcing, serviços separados, injeção por decorators, descoberta automática de módulos e alterações visuais ficam fora deste escopo. Nenhuma migração nova é necessária para a entrega definida aqui.

## Evidências e restrições do ponto de partida

- `workspace/infra/operations/` registra **57 operações públicas**, inventariadas adiante.
- `application/ports/context.ts` reúne 12 interfaces no `WorkspaceRepository`. Os casos de uso que recebem esse contexto alcançam responsabilidades alheias à sua operação.
- As descrições de tarefa usam `DocumentContent`, validação de blocos, geração de IDs, texto simples, checklist e serialização Markdown. A biblioteca compartilhada precisa incluir o serializador usado em `application/reading/read-task.ts`.
- `createTask` valida documento e trecho antes de gravar tarefa e origem; `purgeDocument` preserva o título nas origens antes de excluir o documento.
- Pastas, fixados, movimentos e lixeira operam sobre documentos e desenhos na mesma transação.
- Leitores fazem joins, contagens, hidratação em lote e paginação entre áreas. Separar os repositórios de escrita exige manter um lugar explícito para essas consultas.
- `core/infra/write.ts` usa o nome da operação e a entrada completa para calcular o fingerprint. Uma resposta confirmada é guardada em `core_mutations` e reutilizada por 30 dias.
- Migrações são identificadas por módulo, versão e checksum. Os arquivos `workspace/infra/migrations/001` a `007` e a função SQL `workspace_search_text` continuam necessários em instalações novas e existentes.
- O SQLite usa `BEGIN IMMEDIATE` também nas leituras transacionais. O comportamento de locks e o acesso sequencial dentro de uma transação serão preservados.

Referências locais: [arquitetura atual](../arquitetura.md), [modelo e gatilhos](../banco.md), [produto](../produto.md), `src/core/infra/{module,write,db,migrate}.ts`, `src/server/{app,modules,rpc-contract.db.test}.ts` e `src/workspace/infra/{runtime,context,operations/index}.ts`.

O Orbis foi consultado em `../orbis/src/core/application/module-context.ts`, `../orbis/src/core/infra/module.ts` e `../orbis/src/todo/infra/module.ts`. A referência útil é o contexto parametrizado por repositórios e a composição explícita. Transações, SQL e migrações continuam usando a implementação SQLite do Tinyfold.

## Decisões de arquitetura

### Pacotes e propriedade dos dados

| Pacote | Responsabilidade | Tabelas sob responsabilidade de escrita |
| --- | --- | --- |
| `projects` | Projetos, pastas, nomes, cores, arquivamento e ordenação dessas entidades | `workspace_projects`, `workspace_folders` |
| `documents` | Conteúdo, título, versões e ciclo de vida de documentos | `workspace_documents` |
| `drawings` | Cenas, títulos, versões, ciclo de vida, PNG e prévias | `workspace_canvases`, `workspace_canvas_previews` |
| `board` | Tarefas, texto, prazos, colunas, etiquetas, origens e revisão do quadro | `workspace_tasks`, `workspace_columns`, `workspace_labels`, `workspace_task_labels`, `workspace_task_sources`, `workspace_state` |
| `workspace` | Fluxos entre módulos, políticas de fixados, navegação, busca, lixeira agregada e resolução de incorporados | Nenhuma nova tabela; escritas de negócio por participantes dos módulos donos |
| `rich-text` | Formato de blocos, validação, texto simples, IDs, checklist e serialização Markdown compartilhados | Nenhuma |
| `core` | Datas, erros, transações, idempotência, eventos internos e mecanismos genéricos | Tabelas `core_*` existentes |
| `auth` | Conta, sessões, tokens e fuso do dono, com a API existente | Tabelas `auth_*` existentes |
| `server` | Instanciação, ligação de portas, registro de migrações e adaptadores de entrada | Nenhuma regra própria de escrita de negócio |
| `web` | Interface e seus estados locais | Nenhuma tabela de servidor |

Os nomes físicos das tabelas permanecem. A propriedade inclui atualizações de localização e fixados: `workspace` decide a operação conjunta, enquanto `documents` e `drawings` executam as alterações em suas próprias linhas. As cascatas e os gatilhos atuais continuam ativos e documentados; são relações do esquema, mesmo quando atravessam módulos.

Projetos e pastas não escrevem diretamente no conteúdo. Excluir/restaurar pasta com itens é uma operação de `workspace`, que usa participantes de `projects`, `documents` e `drawings`. O limite de oito fixados combina documentos e desenhos no mesmo escopo e também pertence a essa coordenação.

### Classes e entradas públicas

Classes previstas: `ProjectsModule`, `DocumentsModule`, `DrawingsModule`, `BoardModule` e `WorkspaceModule`. Cada instância pertence a uma composição do aplicativo; não há singleton global. Construtores recebem dependências e montam funções, sem abrir transações ou executar migrações.

O contrato comum será pequeno: `id`, `commands`, `queries` e `events`, com tipos concretos inferidos para cada módulo. Ele pode ser expresso por uma interface `RuntimeModule`; as classes usam composição, sem uma classe-base que acumule regras ou acesso a todos os serviços.

```ts
const documents = new DocumentsModule(dependencies);

await documents.commands.save(input);
const document = await documents.queries.get({ id });
const unsubscribe = documents.events.on('document.saved', handler);
```

Esse trecho apresenta o contrato de destino; os símbolos ainda não estão implementados. Métodos são funções vinculadas ao contexto, seguras para passar como callback. Entradas de escrita não adquirem nomes ou defaults diferentes só porque passam a ser chamadas por uma classe.

| Entrada do pacote | Consumidores | Conteúdo |
| --- | --- | --- |
| `.` | Composição do servidor e testes de integração | Classe e tipos de sua API |
| `./domain` | Próprio módulo, web e testes | Regras puras e tipos de domínio selecionados |
| `./contracts` | Servidor; web apenas com `import type` | Entradas, resultados, erros e schemas das operações |
| `./composition` | Somente composição do servidor e testes de integração | Construção de participantes vinculados a uma transação e portas para ligar dependências |

Aplicação e domínio acessam seus próprios arquivos diretamente. Um módulo de negócio não importa outro módulo de negócio, nem mesmo apenas seus tipos: define as portas e projeções de que precisa, e o servidor adapta os contratos. As exceções compartilhadas são entradas explícitas de `core` e da biblioteca pura `rich-text`.

As regras de dependency-cruiser precisam cobrir o alcance das entradas, inclusive impedir `./composition` em web, scripts comuns e outros módulos. Scripts de seed e QA usam a composição pública do servidor. Testes integrados que conectam vários módulos ficam em `server`; testes internos de uma área acompanham seu módulo.

### Organização de um módulo

```text
src/documents/
├── index.ts
├── package.json
├── tsconfig.json
├── README.md
├── domain/                 modelos e regras puras
├── application/
│   ├── contracts/          schemas, entradas, resultados e eventos
│   ├── ports/              dependências específicas
│   ├── commands/           casos de uso de escrita
│   └── queries/            casos de uso de leitura
├── infra/
│   ├── module.ts           DocumentsModule
│   ├── composition.ts      participantes transacionais
│   ├── repository/         escrita e leitura do agregado
│   └── sql/                mapeamento da persistência desse módulo
└── testing/                auxiliares exclusivos de testes
```

O padrão é a separação das responsabilidades; pastas vazias não precisam ser criadas. O registro de uma operação mantém schema e execução juntos, aproveitando a ideia de `Operation` já existente. A chamada interna e o RPC usam a mesma validação. A composição do servidor faz um mapeamento explícito entre nomes externos antigos e os novos métodos, sem reflexão que publique métodos acidentalmente.

### Biblioteca de texto e código compartilhado

`rich-text` será um pacote puro, sem classe de módulo, banco, HTTP, React ou dependências de módulos de negócio. Sua API pública fica em `domain/index.ts`, compatível com as regras de importação do navegador.

Entram nele o formato JSON dos blocos, travessia, geração de IDs por função recebida, leitura de texto, checklist, validador estrutural e serialização Markdown. O formato dos blocos incorporados também é compartilhado, mas a resolução de tarefas/desenhos vivos ocorre por dados recebidos, fora da biblioteca. Os documentos habilitam incorporados; descrições de tarefa continuam recusando-os. Limites, mensagens, tratamento de links, equações e saída Markdown permanecem equivalentes.

O serializador permite receber a resolução de incorporados, como já acontece hoje. Consultas, regras de acesso, existência de entidades e contagem de tarefas de origem não entram em `rich-text`.

Auxiliares realmente independentes de negócio, como `afterKeyset`, `versionedUpdate` e primitivas de conteúdo JSON, podem ir a entradas explícitas de `core/infra` ou `core/domain`. Modelos como `Project`, `Task`, `FiledItem`, `CanvasScene` e tabelas do workspace não vão para `core`. Regras de nome/ordem compartilhadas devem conservar uma interface pequena; sem transformar `core` em um repositório de regras de funcionalidades.

### Transações e idempotência

A composição cria uma unidade de trabalho SQLite. Sua interface de aplicação entrega portas vinculadas à transação; o objeto Kysely e a conexão real ficam na infraestrutura. Um identificador opaco de escopo, quando necessário para construir participantes, não expõe operações SQL e deixa de ser válido ao término da transação.

Uma entrada pública de escrita faz a validação, abre uma única escrita idempotente e chama o corpo transacional do caso de uso. Participantes usados por outro fluxo executam esse corpo na transação recebida, sem abrir uma segunda transação ou gravar outro pedido. Somente o servidor consegue construir os conjuntos de participantes de diferentes módulos.

Regras obrigatórias:

1. O nome legado, como `workspace.createTask`, e a entrada completa já validada continuam chegando ao cálculo de fingerprint externo. Dividir a entrada para os participantes acontece depois disso.
2. O registro do pedido, suas alterações e sua resposta compacta são confirmados juntos. IDs de pedido usados com outra entrada continuam respondendo `REQUEST_REUSED`.
3. Repetir um pedido confirmado não executa participantes nem gera eventos novamente.
4. Leituras que compõem uma resposta usam a mesma transação de leitura quando já exigiam uma visão consistente. Não introduzir chamadas com transações independentes no meio dessa composição.
5. Participantes não escapam do callback transacional. Reutilização posterior deve ser recusada ou impedida por construção e verificada em teste.
6. Operações dentro de uma transação permanecem sequenciais. Sem estado global ou contexto transacional implícito.
7. Pins e prévias mantêm sua política atual de escrita repetível sem registro de pedido. O novo contrato distingue essas operações das que exigem `requestId`.
8. Calendário, relógio e fonte de IDs são injetados. O fuso continua sendo obtido do auth pela composição, com a mesma política de atualização por chamada.

| Fluxo conjunto | Dono da coordenação | Participantes e invariantes |
| --- | --- | --- |
| Tarefa a partir de documento | `workspace` | Documento e trecho válidos, projeto ativo, tarefa e origem gravadas juntas pelo `board`; ramos com/sem origem mantêm o mesmo contrato externo |
| Excluir/restaurar pasta | `workspace` | Pasta em `projects`, itens em seus donos, limite de fixados, versões e listas de Desfazer preservados |
| Mover/fixar item | `workspace` | Validação do projeto/pasta e escopo combinado; atualizações feitas pelo dono do item, com a política atual de versões/datas |
| Restaurar documento/desenho | Módulo dono, com portas vinculadas | Projeto e pasta de destino consultados na mesma transação; pasta ausente e vaga de fixados tratadas como hoje |
| Apagar documento definitivamente | `workspace` | `board` guarda o título nas origens antes de `documents` excluir a linha; falha em qualquer passo desfaz tudo |
| Esvaziar lixeira | `workspace` | Mesmos filtros de projeto/versão; itens alterados contam como ignorados; remoções elegíveis atômicas |
| Alterar coluna de conclusão/excluir coluna | `board` | Tarefas e colunas ficam juntas no módulo; preservar gatilhos, conclusão, revisão e limites do Desfazer |

Criar uma tarefa e inserir posteriormente seu bloco incorporado no editor não será transformado em uma nova operação atômica de salvamento documental. Esta etapa mantém o protocolo existente de edição e autosave.

### Consultas e transportes

Cada módulo mantém a leitura de seus agregados. A leitura agregada de navegação, contagens, busca, lixeira e incorporados fica em adaptadores SQL explícitos de `workspace`, atrás de portas com DTOs próprios. Esses adaptadores podem ler tabelas de vários módulos, com essa dependência de esquema documentada, e não podem escrever nelas ou importar seus repositórios.

Hidratação de origem de tarefa passa a obter fatos documentais em lote por uma porta, ligada pelo servidor, em vez de importar domínio/repositório de documentos. Nas consultas globais que já usam joins, preservar joins ou lotes limitados; não substituir uma página por uma consulta por item. O catálogo de tabelas de escrita deixa de ser universal; projeções de leitura declaram somente os campos usados.

Limites, desempates, comparação textual, cursores, ranks da busca e regras de visibilidade permanecem. A leitura paginada de documento inclui origens e incorporados na mesma visão consistente, e seu cursor continua preso ao texto final renderizado, inclusive mudanças nos incorporados.

Os adaptadores MCP passam a ficar na composição de `server/mcp/`, consumindo consultas públicas. Formatação, limites de saída, filtros de caracteres ocultos e tradução de erros preservam os testes atuais. O SDK continua restrito a essa pasta. RPC e `/arquivos` também são ligados pelo servidor; o parser multipart das prévias mantém o limite e a conversão atuais.

### Eventos internos

Eventos descrevem alterações confirmadas e servem a observadores. Regras que precisam de atomicidade usam os participantes explícitos, incluindo a preservação de origens na exclusão documental. Nenhum fluxo existente de consistência dependerá de assinantes.

O envelope contém `eventId`, `type`, `occurredAt`, `entityId`, `requestId` quando existir e payload tipado com metadados mínimos. A geração de IDs de evento usa uma fonte separada da geração de IDs das entidades. Conteúdo completo, trechos, cenas e PNG não são incluídos. Versão da entidade, `textVersion` e revisão do quadro são campos distintos, presentes conforme o evento.

Catálogo inicial:

| Módulo | Eventos | Semântica |
| --- | --- | --- |
| `projects` | `project.created`, `project.updated`, `project.reordered`; `folder.created`, `folder.renamed`, `folder.reordered`, `folder.trashed`, `folder.restored` | Metadados de projeto/pasta, emitidos pelo participante que efetua a alteração |
| `documents` | `document.created`, `document.saved`, `document.trashed`, `document.restored`, `document.purged`, `document.placementChanged` | Conteúdo/versionamento separado de localização/fixado; payload de placement identifica o motivo |
| `drawings` | `drawing.created`, `drawing.saved`, `drawing.trashed`, `drawing.restored`, `drawing.purged`, `drawing.placementChanged`, `drawing.previewStored` | Prévia ignorada por estar obsoleta não publica `previewStored` |
| `board` | `task.created`, `task.updated`, `task.textSaved`, `task.trashed`, `task.restored`, `task.purged`, `board.changed` | `task.updated` informa os campos alterados, inclusive conclusão quando aplicável; `board.changed` identifica operação, revisão e escopo afetado por colunas/etiquetas |
| `workspace` | `workspace.changed` | Conclusão de um fluxo conjunto, com motivo e escopo; os eventos das entidades continuam pertencendo aos donos |

Mudanças em lote por gatilhos de colunas geram `board.changed`, sem fingir que cada tarefa recebeu uma nova versão. O catálogo inicial não promete `task.completed` individual para esse caso. Consumidores de conclusão devem tratar o evento de escopo e consultar os dados atuais. Esse contrato cobre explicitamente a diferença entre mover uma tarefa e trocar a coluna de conclusão de todo o quadro.

A publicação segue este protocolo:

1. Participantes acumulam eventos na escrita externa. Não notificam assinantes durante a transação.
2. Rollback ou falha no commit descarta o lote. A resposta guardada em `core_mutations` continua sem eventos.
3. Após o commit, o lote é entregue à distribuição em memória da instância. A entrega não é aguardada para decidir sucesso da gravação; rejeições de assinantes são capturadas e registradas separadamente.
4. Eventos de um lote são agendados na ordem de produção. A conclusão de handlers assíncronos não oferece ordem global entre transações ou processos.
5. `on` devolve uma função de remoção. Só a infraestrutura recebe o publicador; consumidores recebem uma interface de assinatura.
6. Repetir `requestId` não produz novo lote. Escritas sem registro só publicam quando a operação aplica uma mudança; saves que hoje incrementam a versão continuam sendo mudanças.
7. Testes podem esperar a drenagem por um auxiliar de teste. Instâncias e assinaturas ficam isoladas, e o encerramento libera as assinaturas.

A entrega em memória é de melhor esforço: o processo pode encerrar depois do commit e antes da notificação. Outbox será uma extensão separada se surgir um consumidor durável, com migração própria, reentrega e idempotência do consumidor. Não alterar o sucesso de uma gravação para tentar simular essa garantia.

### Migrações e compatibilidade

`core/infra/module.ts` continua atendendo ao catálogo de migrações existente. O novo `RuntimeModule` é um contrato distinto. O servidor mantém um registro explícito para migrações e outro para instâncias; extrair uma classe não cria obrigação de registrar uma pasta de migração vazia.

Os arquivos `workspace/infra/migrations/001_workspace.sql` a `007_board.sql` permanecem no local e com o ID `workspace`. O módulo `workspaceModule` que hoje descreve migrações pode permanecer como descritor histórico. A função `workspace_search_text` mantém seu nome e sua implementação equivalente, mesmo se o helper puro mudar para uma entrada compartilhada. Instalação do zero e abertura de um banco já migrado precisam produzir o mesmo esquema e histórico.

Os nomes RPC, schemas de entrada nos dois lados das transformações, respostas, erros, URLs e identificadores de mutação permanecem. Os snapshots em `src/server/contract/` e `workspace/infra/schema/current.sql` não serão regenerados apenas para aceitar diferenças.

A API TypeScript interna será atualizada junto com todos os consumidores do repositório. `workspace` não reexportará classes de outros módulos. A compatibilidade com os nomes externos antigos ficará no servidor. Pontes de composição temporárias terão caminho e tarefa de remoção registrados; não haverá liberação ampla de imports entre módulos durante a transição.

## Inventário das operações e destinos

Os nomes abaixo são os 57 nomes atuais de `infra/operations/`. O RPC mantém esses nomes sob o caminho atual. O caminho de classe é interno.

| Operações externas atuais | Entrada de destino | Observação |
| --- | --- | --- |
| `listProjects` | `projects.queries.projects.list` | Lista simples |
| `createProject`, `updateProject`, `moveProject` | `projects.commands.projects.create/update/move` | Arquivamento permanece em update |
| `listFolders` | `projects.queries.folders.list` | Contagens de itens por porta de leitura quando necessárias |
| `createFolder`, `renameFolder`, `moveFolder` | `projects.commands.folders.create/rename/move` | Escrita somente de pasta |
| `deleteFolder`, `restoreFolder` | `workspace.commands.deleteFolder/restoreFolder` | Fluxos conjuntos |
| `listDocuments`, `getDocument` | `documents.queries.list/get` | Visibilidade de lixeira preservada por consulta |
| `createDocument`, `saveDocument`, `deleteDocument`, `restoreDocument` | `documents.commands.create/save/trash/restore` | Portas de projeto/pasta na transação |
| `listCanvases`, `getCanvas` | `drawings.queries.list/get` | Nome externo continua canvas |
| `createCanvas`, `saveCanvas`, `deleteCanvas`, `restoreCanvas` | `drawings.commands.create/save/trash/restore` | Nome interno drawing, armazenamento canvas |
| `saveCanvasPreview` | `drawings.commands.storePreview` | Escrita repetível, sem `requestId` |
| `listTasks`, `getTask`, `projectBoard`, `listCompletedTasks` | `board.queries.tasks.list/get/projectBoard/completed` | Origens documentais hidratadas em lote |
| `createTask` | `board.commands.tasks.create` ou `workspace.commands.createTaskFromDocument` | Despacho explícito conforme `source`; fingerprint usa a entrada original completa |
| `updateTask`, `saveTaskText`, `deleteTask`, `restoreTask`, `moveTask` | `board.commands.tasks.update/saveText/trash/restore/move` | Versão de texto separada da versão dos campos |
| `listColumns` | `board.queries.columns.list` | Colunas globais |
| `createColumn`, `renameColumn`, `moveColumn`, `deleteColumn`, `restoreColumn`, `setDoneColumn` | `board.commands.columns.create/rename/move/trash/restore/setDone` | Tarefas afetadas ficam na mesma transação |
| `listLabels` | `board.queries.labels.list` | Etiquetas globais |
| `createLabel`, `updateLabel`, `deleteLabel`, `restoreLabel` | `board.commands.labels.create/update/trash/restore` | Vínculos preservados como hoje |
| `moveItem`, `pinItem`, `unpinItem` | `workspace.commands.moveItem/pinItem/unpinItem` | Escopos combinam documentos e desenhos |
| `projectNavigation`, `projectOverview`, `search`, `resolveEmbeds`, `listTrash` | `workspace.queries.projectNavigation/projectOverview/search/resolveEmbeds/listTrash` | Consultas agregadas |
| `purgeDocument` | `workspace.commands.purgeDocument` | Preservação de origens em board |
| `purgeCanvas`, `purgeTask` | `drawings.commands.purge`, `board.commands.tasks.purge` | Remoção do agregado e cascatas atuais |
| `emptyTrash` | `workspace.commands.emptyTrash` | Participantes e critérios de ignorados |

| Entrada adicional | Destino da leitura | Compatibilidade |
| --- | --- | --- |
| MCP `list_projects`, `search` | `workspace.queries` | Contagens, limites, ranking e cursores atuais |
| MCP `read_document` | `workspace.queries.readDocument` | Coordena snapshot documental, origens e incorporados; Markdown por `rich-text` |
| MCP `read_drawing` | `drawings.queries.readForAgent` | Cena, estrutura e estado da prévia |
| MCP `list_tasks`, `read_task` | `board.queries` | Calendário, origens, descrição Markdown e paginação |
| `GET /arquivos/desenhos/:id/previa.png` | `drawings.queries.previewImage` | Cookie, autorização, ETag, 404 e limites atuais |
| Seeds, scripts e fixtures integradas | Composição de `server` | Imports públicos; mesmo registro de migrações |

## Mapa de movimentação do código

Os caminhos de origem abaixo são relativos a `src/workspace/`, salvo quando indicados. Mover testes junto com as regras que verificam; os que dependem da integração passam a montar o aplicativo pelo servidor.

| Origem atual | Destino planejado | Atenção na separação |
| --- | --- | --- |
| `domain/canvas/`, `application/canvases/`, `application/canvas-previews.ts`, repositórios de canvases/prévias | `src/drawings/` nas camadas correspondentes | Infra de inflação PNG fica fora do domínio; leitura para agente e imagem usam a mesma cena/versão |
| `domain/document-models.ts`, `domain/document.ts`, `domain/document-validation.ts` | Modelos de documento em `documents`; blocos e operações estruturais em `rich-text` | Separar entidade persistida de formato de conteúdo; IDs e limites permanecem |
| `domain/markdown/`, `domain/checklist.ts`, formato em `domain/embeds.ts` | `src/rich-text/domain/` | Serialização da descrição de tarefa também depende desses arquivos |
| `domain/embed-items.ts`, `domain/embed-resolver.ts`, `application/embeds/` | DTOs/resolução de estado em `workspace`; representação textual pura em `rich-text` | Formato do bloco não consulta a existência ou visibilidade da entidade |
| `domain/project*.ts`, `domain/folders.ts`, `application/projects/`, regras locais de `application/folders/` | `src/projects/` | Fluxos que alteram itens saem para `workspace/application/flows/`; política combinada de pins fica no workspace |
| `application/documents/` e persistência documental | `src/documents/` | Purge com preservação de origens é coordenado pelo workspace |
| `domain/task*.ts`, `domain/columns.ts`, `domain/labels.ts`, aplicações e repositórios correspondentes | `src/board/` | Validação do trecho documental é obtida por porta; formatação da descrição vem de rich-text |
| `application/items/`, `moves/`, `pins/`, `trash/` | Fluxos em `workspace`; primitivas de alteração nos módulos donos | Retirar o acesso ao repositório universal; manter efeitos de versão/data de cada operação |
| `application/reading/`, `navigation/`, `infra/reader/`, `infra/navigation/` | Consultas específicas nos donos; consultas agregadas em `workspace` | Remover dos modelos agregados as dependências em tipos internos de outras áreas |
| `infra/sql/tables.ts`, `mappers.ts`, hidratação de tarefas e referências | Tipos/mapeadores nos donos; projeções agregadas de leitura no workspace | Acesso documental da hidratação passa por porta em lote; nenhum catálogo universal de escrita |
| `infra/sql/keyset.ts`, atualização condicional e guardas genéricas | Entradas pequenas de `core`, quando independentes de negócio | Paridade de parametrização, direção, cursor e conflito de versão |
| `infra/operations/`, `infra/service.ts`, `infra/rpc.ts`, `infra/runtime.ts` | Registros de operações nas classes e composição em `src/server/workspace/` | Schemas únicos; mapa explícito preserva os nomes RPC e a entrada da idempotência |
| `infra/mcp/` | `src/server/mcp/workspace-tools/` | Preservar formatação, filtros, tetos de resposta, testes exatos e somente leitura |
| `infra/files.ts` | Consulta de prévia em drawings; adaptação HTTP em server | Autorização compartilhada com RPC, ETag e respostas atuais |
| `testing/` e testes que montam o workspace inteiro | Auxiliares por módulo e fixtures integradas em `src/server/testing/` | Uma fixture não pode reintroduzir imports internos cruzados |
| `src/web/lib/types.ts` e imports de `@tinyfold/workspace/domain` | Entradas públicas do dono ou `rich-text/domain` | Atualizar também imports em tempo de execução; não criar um barrel agregado no workspace |
| `infra/module.ts`, `infra/migrations/`, `infra/schema/current.sql` | Permanecem como histórico da persistência | Os testes de esquema podem migrar para a integração, mantendo o retrato e a localização das migrações |

Erros específicos acompanham seu caso de uso; `AppError` e códigos gerais continuam no core. Paginação/ordenação específica acompanha a consulta correspondente; só os mecanismos genéricos são compartilhados. O fechamento procura também imports antigos em scripts, fixtures, testes de contrato, seeds e exports de `package.json`.

## Sequência de execução

Cada ID é uma unidade revisável; pode ser dividido em commits menores que continuem verdes. Mensagens de commit em inglês, com o ID e indicação de preservação do comportamento quando aplicável. Nenhuma linha abaixo representa trabalho de código já executado.

### Onda 0 — Referência e proteção dos contratos

- [x] **M0.1** Registrar o SHA de início efetivo, estado do checkout e histórico de validação; trabalhar em branch/worktree próprio, preservando os existentes. Comparar com `2090dea` caso a base tenha avançado.
- [x] **M0.2** Conferir este inventário contra os registros RPC, MCP, arquivos e scripts; listar os consumidores de exports e fixtures integradas. Alterar o plano se uma operação nova tiver entrado na base.
- [x] **M0.3** Capturar a referência visual local do SHA inicial e executar o portão inicial. Reutilizar resultados confiáveis do mesmo SHA/ambiente, registrando quais; diferenças anteriores à etapa são descritas separadamente.
- [x] **M0.4** Complementar apenas as lacunas de caracterização: rollback conjunto, entrada completa da idempotência e leitura coerente. Manter asserções existentes em movimentos de arquivos/imports.

**Saída:** referência reproduzível, inventário fechado e verificações de compatibilidade disponíveis antes das extrações.

### Onda 1 — Contratos e texto compartilhado

- [x] **M1.1** Adicionar `RuntimeModule`, contratos de assinatura/publicação de eventos e escopo transacional opaco em entradas adequadas de `core`; manter o descritor de migrações existente.
- [x] **M1.2** Criar `@tinyfold/rich-text`, mover formatos, validação, texto, IDs, checklist e Markdown com testes equivalentes; atualizar consumidores atuais antes de extrair agregados.
- [x] **M1.3** Separar primitivas genéricas realmente compartilhadas, incluindo SQL parametrizado; eliminar dependências de `core` em modelos específicos. Preservar `workspace_search_text` e a semântica dos cursores.
- [x] **M1.4** Atualizar regras de dependência, pacotes e convenções do projeto para distinguir biblioteca pura e módulos de negócio. Testar que imports proibidos continuam falhando.

**Saída:** o quadro consegue usar texto/Markdown sem importar documentos; a biblioteca pura não alcança módulos de negócio ou infraestrutura.

### Onda 2 — Composição transacional e compatibilidade

- [x] **M2.1** Implementar unidade de trabalho com portas vinculadas, execução de participantes, coleta de eventos e publicação somente após commit. Preservar `BEGIN IMMEDIATE`, política de leitura e resposta JSON da idempotência.
- [x] **M2.2** Separar a entrada pública de escrita do corpo transacional nos casos conjuntos. Integrar a unidade de trabalho aos contextos atuais antes de mudar a localização das funcionalidades.
- [x] **M2.3** Criar a composição em `server/workspace/` e o mapeamento legado de operações. Montar RPC, MCP, arquivos e serviços de scripts a partir de uma mesma composição e dos mesmos relógios.
- [x] **M2.4** Criar adaptadores temporários somente na composição do servidor, com participantes do workspace atual. Registrar cada ponte na tabela de transição abaixo.

**Saída:** um fluxo com dois participantes confirma ou desfaz tudo junto, registra um pedido e entrega um único lote de eventos; RPC e schema continuam equivalentes.

### Onda 3 — Desenhos como primeira extração

- [x] **M3.1** Criar `@tinyfold/drawings`, `DrawingsModule` e entradas públicas; mover domínio de cena, PNG, preview, outline e testes.
- [x] **M3.2** Mover casos de uso, schemas, repositórios e consultas específicas, incluindo arquivo de prévia e leitura para agente. Implementar portas de organização e participantes de placement/ciclo de vida.
- [x] **M3.3** Ligar a classe na composição, migrar imports da web/scripts/testes e ativar seus eventos. Remover código de desenho duplicado do workspace; leitores agregados conservam suas projeções estreitas.

**Saída:** cena, rascunhos, conflito, PNG/ETag, MCP e importação/exportação funcionam pela nova classe. A primeira extração valida o desenho antes de replicá-lo.

### Onda 4 — Projetos e pastas

- [x] **M4.1** Criar `@tinyfold/projects`, modelos, contratos, classe, repositórios e leituras locais. Preservar limites, nomes sem caixa/acentos, cores e arquivamento.
- [x] **M4.2** Expor participantes específicos para organização, validação e alteração de pasta. Mover coordenação de exclusão/restauração de pasta para `workspace/application/flows/`, mantendo a entrada de Desfazer.
- [x] **M4.3** Substituir adaptadores temporários de organização, migrar imports e ativar eventos. Preservar contagens em lote por porta de leitura.

**Saída:** projetos e pastas têm um dono; excluir/restaurar pasta continua preservando seus itens, versões e limite combinado de pins.

### Onda 5 — Documentos

- [x] **M5.1** Criar `@tinyfold/documents`, modelos, contratos, classe, casos de uso, repositórios e participantes de conteúdo/ciclo de vida/localização.
- [x] **M5.2** Expor consulta documental e validação de origem em lote pelas portas necessárias. Ligar Markdown ao `rich-text` e manter a coordenação de origens/incorporados em `workspace`.
- [x] **M5.3** Migrar consumidores, ativar eventos e remover cópias antigas. Preservar IDs de blocos, versões, acks compactos e leitura de lixeira.

**Saída:** salvamento, conflitos, cópias, recuperação, Markdown e marcadores de origem equivalentes, incluindo referências entre documentos e tarefas ainda em transição.

### Onda 6 — Quadro

- [x] **M6.1** Criar `@tinyfold/board`, classe, contratos, tarefas, colunas, etiquetas, origens, revisão, calendário e persistência correspondente.
- [x] **M6.2** Separar criação direta de tarefa da coordenação por origem; hidratar fatos documentais por porta em lote e fornecer participante que preserva títulos na exclusão documental.
- [x] **M6.3** Migrar consumidores e MCP, ativar eventos de tarefa/quadro, remover código antigo e preservar efeitos em lote dos gatilhos e respostas de Desfazer.

**Saída:** tarefa e origem atômicas, versões de texto/campos independentes, datas civis, paginação, colunas globais e etiquetas equivalentes.

### Onda 7 — Workspace de integração e remoção das pontes

- [x] **M7.1** Consolidar `WorkspaceModule` com fluxos de pasta, movimentos, pins, origem documental, purge documental e lixeira; remover `WorkspaceRepository` e seu contexto universal.
- [x] **M7.2** Fechar portas de leitura e adaptadores agregados, preservando consultas em lote, ordenação e cursores. Reduzir os modelos de leitura aos DTOs de cada consulta.
- [x] **M7.3** Finalizar adaptadores RPC/MCP/arquivos no servidor, contratos de eventos e imports públicos na web, scripts e testes. Remover fábricas/exportações antigas sem consumidores.
- [x] **M7.4** Eliminar todas as pontes temporárias e exceções transitórias de dependência. Rever que nenhum módulo escreve tabelas alheias fora das cascatas/gatilhos preservados e que leitores agregados são somente leitura.

**Saída:** cinco classes de negócio compostas pelo servidor, nenhum import entre módulos de negócio e nenhuma implementação legada ativa em paralelo.

### Onda 8 — Verificação integrada e documentação

- [x] **M8.1** Executar matriz automática final e comparar contratos, migrações, esquema e cobertura de operações com a referência.
- [x] **M8.2** Executar a matriz manual no Chrome do Herdr com banco temporário, além das comparações visuais; registrar evidências e eventuais diferenças.
- [x] **M8.3** Atualizar `AGENTS.md`, README dos módulos, `docs/arquitetura.md`, `docs/banco.md`, índice de etapas e evidências em `docs/validacao.md`. A arquitetura atual só passa a descrever o destino depois de implementado.
- [x] **M8.4** Revisar o diff integrado, registrar SHAs e encerrar a etapa pelos critérios de pronto. A integração/publicação é uma ação posterior ao planejamento, seguindo a autorização da sessão e o CI.

**Saída:** resultado reproduzível e revisável, com validação executada distinguida de verificações previstas.

As dependências de execução são sequenciais: M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8. As pontes permitem que cada extração seja validada antes de a próxima existir. Cada tarefa concluída deve registrar commit, verificações e dependências ainda temporárias no registro de execução; o início de uma onda não significa que a anterior foi concluída.

## Transição e integração

| Ponte temporária | Introdução | Remoção obrigatória |
| --- | --- | --- |
| Participantes do workspace antigo para APIs novas | M2.4 | Por área em M3–M6; nenhuma sobra em M7.4 |
| Organização antiga usada pelos desenhos extraídos | M3.2 | M4.3 |
| Fatos documentais do workspace antigo usados pelo quadro/leitores | M2.4/M5.2 | M5.3/M6.2 |
| Origens de tarefa no workspace antigo usadas pelo purge documental | M5.2 | M6.2 |
| Serviço agregado antigo usado em scripts/fixtures | M2.3 | M7.3 |

O mapeamento dos **nomes RPC antigos** permanece definitivamente no servidor por compatibilidade externa; ele não é uma ponte a remover. O registro histórico de migrações também permanece.

Os movimentos ficam em commits pequenos com dependências sequenciais. Extração de arquivos e mudanças de mecanismo devem ser distinguíveis no diff. A introdução dos eventos é uma capacidade nova interna, com testes próprios, e não altera o protocolo de salvamento.

Trabalhar em branch separada permite revisar o conjunto antes da integração. `main` já tem deploy automático no Railway após CI: publicar nela é uma publicação do aplicativo. O planejamento não dispara push, merge ou deploy. Ao integrar código autorizado, usar o ciclo GitHub → CI → Railway existente, sem criar outro mecanismo de release.

Como não há mudança de esquema, a reversão operacional prevista é voltar ao código anterior. A verificação de compatibilidade deve incluir abrir um SQLite temporário usado pela versão nova com a versão anterior, além do caminho de atualização, sem sobrescrever o banco principal. Diferenças inesperadas de comportamento vão para uma correção separada e são discutidas quando exigirem uma decisão de produto.

## Matriz de validação

### Verificações automáticas

| Grupo | Verificações necessárias |
| --- | --- |
| Fronteiras | Domínio e `rich-text` puros; `./composition` restrito; módulos sem imports entre si; web sem infraestrutura; scripts pelas entradas permitidas |
| API | Mesmas 57 operações e seis ferramentas MCP; schemas enviados/validados; resultados, códigos e mensagens; prévia multipart e arquivo autenticado |
| Idempotência | Replay de registros anteriores à extração; entrada completa preservada; um registro por fluxo; mesmo ID com outra entrada recusado; resposta compacta idêntica |
| Atomicidade | Falha no segundo participante desfaz o primeiro; falha antes do registro/commit não deixa alterações; criar origem, excluir/restaurar pasta, purge e lixeira |
| Escopo | Participante não reutilizável após fim da transação; chamadas em sequência; duas instâncias não compartilham transações/assinantes |
| Eventos | Nenhuma entrega em rollback ou replay; entrega após commit; falha síncrona/assíncrona de handler isolada; unsubscribe; ordem do lote; IDs independentes; no-op de preview/pin |
| Efeitos em lote | Alterar coluna de conclusão e excluir/restaurar coluna preservam tarefas, revisões e Desfazer; evento de quadro representa efeitos de gatilhos |
| Texto e conteúdo | Paridade de validação e Markdown; equações, links, limites de profundidade/tamanho, IDs e checklist; incorporados aceitos só onde já eram aceitos |
| Persistência | Checksums e histórico iguais; esquema idêntico; banco novo e existente; FK/cascatas/locks; reabertura por versão anterior em banco temporário |
| Leituras | Mesmos resultados para owner/MCP, itens arquivados/excluídos e origens indisponíveis; empates e todos os sufixos de cursor; snapshot de incorporados; lotes sem crescimento por item |
| Interface | Editor, canvas, quadro, pastas, busca, lixeira, desfazer, datas, rascunhos e conflitos; equivalência visual |

A escrita inicial de testes se concentra nas lacunas de contrato e nos mecanismos novos. Movimentos mecânicos preservam asserções existentes, ajustando caminhos e montagem das fixtures. Não criar um teste por wrapper que apenas repita sua implementação.

Por commit de código, executar `mise exec -- pnpm check`. Para mudanças em SQL, transações ou composição, executar também `mise exec -- pnpm test:db`. Após cada extração, fazer build e os E2E pertinentes à área; se houver alteração transversal, ampliar o recorte conforme o risco encontrado.

O fechamento integrado executa:

```sh
mise exec -- pnpm check
mise exec -- pnpm test:db
mise exec -- pnpm build
mise exec -- pnpm e2e
```

Depois, executar `mise exec -- pnpm e2e:visual` com `VISUAL_BASELINE_DIR` apontando para a referência local capturada em M0.3, seguindo o procedimento existente. O E2E mantém os dois shards comuns e a execução separada de `@timing` no CI. Uma atualização visual exige explicar a diferença; mover módulos não justifica substituir a referência.

O último resultado local documentado da etapa 12 foi 747 unitários, 288 testes de banco, 227 E2E e 40 capturas. Esses números são uma referência histórica, não resultados da etapa 13 nem metas rígidas: novos testes devem aumentar a cobertura, e qualquer remoção/redistribuição precisa ser justificada.

### Validação manual no Herdr

Usar Chrome do Content Viewer com banco SQLite temporário e conta de teste. Antes da execução, consultar `/Users/standard/.agent-switch/docs/herdr-workspace.md` e `/Users/standard/.config/herdr-app/tools/content-viewer/USAGE.txt`, descobrir os IDs atuais e abrir uma sessão própria no espaço correto. Capturar referências atualizadas antes de operar a página e encerrar apenas o preview criado para a validação.

| Cenário | Resultado esperado |
| --- | --- |
| Documento com formatação, equação e código | Salvar/recarregar/importar/exportar preserva conteúdo; temas claro/escuro legíveis |
| Falha de rede e recarga | Rascunho recuperável, retentativa segura e conteúdo preservado |
| Edição em duas abas | Conflito explícito e possibilidade de salvar cópia, sem sobrescrita silenciosa |
| Desenho e prévia | Cena persiste; PNG/Excalidraw exportam; incorporado mostra a prévia correta após edição/movimento |
| Tarefa originada em trecho | Tarefa, origem e navegação para contexto funcionam; trecho alterado/excluído mantém o estado atual de indisponibilidade |
| Quadro | Prazos/fuso, etiquetas, descrição, conclusão, reordenação e Desfazer preservados |
| Pasta com documentos/desenhos | Excluir/restaurar, mover entre projetos e limite conjunto de fixados funcionam |
| Lixeira e purge documental | Itens concorrentes são ignorados como hoje; tarefa mantém título/trecho da origem removida |
| Busca, navegação e incorporados | Contagens, filtros, paginação, atalhos e links equivalentes |
| Tela estreita | Fluxos essenciais disponíveis, sem perda de rascunho ou overflow introduzido |

MCP é validado pelos testes de contrato e integração; a passagem visual não substitui essas verificações. Registrar comando, SHA, ambiente, resultado, evidência e limitações em `docs/validacao.md`.

## Critérios de pronto

- [x] Os cinco módulos de negócio previstos têm classes e contratos públicos explícitos, com casos de uso separados da montagem.
- [x] `rich-text` atende documentos e tarefas sem depender de módulos de negócio, React, HTTP ou banco.
- [x] `WorkspaceRepository` universal e implementações duplicadas em transição foram removidos; o workspace restante contém integração, consultas agregadas e o histórico de migrações.
- [x] Nenhum módulo importa outro módulo de negócio; o servidor liga as portas e o verificador impede acessos indevidos.
- [x] Escritas são feitas pelos donos dos dados, com fluxos conjuntos em uma transação e um registro de idempotência.
- [x] Eventos tipados são observáveis após commit, isolados por instância, sem republicação por replay e com limites de entrega documentados.
- [x] As 57 operações externas, seis ferramentas MCP e endpoint de prévia preservam seus contratos e políticas de acesso.
- [x] Migrações, função SQL histórica, esquema, dados existentes e formato dos rascunhos continuam compatíveis.
- [x] Todos os portões automáticos finais e a matriz manual aplicável foram executados; falhas/diferenças materiais estão resolvidas ou explicitamente decididas.
- [x] Não há pontes transitórias ou exceções de dependência sem remoção; documentação descreve o resultado real e referencia os SHAs/evidências.

## Registro de execução

A implementação partiu de `2090dea` e preservou os checkouts existentes. O plano foi registrado em `b084c1f` e o código integrado em `59f6306`. A branch `refactor/stage13-modules` contém o trabalho; `../tinyfold-stage13-baseline` mantém o ponto anterior para auditoria.

A pedido do usuário, três subagentes dividiram implementação e revisão. Foundation trabalhou em unidade de trabalho, eventos e Board; rich_text, em texto puro e Drawings; review_policy, em regras de importação e Documents. O agente principal implementou Projects, composição do servidor e migração dos consumidores. Houve revisão cruzada: proteção de escrita em transação de leitura, coordenação da tarefa com origem, metadados documentais em lote, portas estreitas e encerramento de ferramentas MCP foram corrigidos durante a integração.

**Organização da execução.** As extrações ocorreram em paralelo, em vez de manter pontes intermediárias publicadas por onda. Os portões por módulo foram executados durante o trabalho; o portão global valida o lote integrado. Os commits registram plano, implementação integrada e evidências, sem alegar 32 commits validados separadamente. Fluxos de pasta/movimento/pin/lixeira conservam suas pastas específicas em `application/`; `flows/source-task.ts` coordena a nova entrada da origem documental. Não resta ponte temporária nem exceção transitória no verificador.

| Itens | Resultado e evidência |
| --- | --- |
| M0.1–M0.4 | Base `2090dea`; 747 unitários, 288 testes SQLite e build repetidos no checkout de referência; 40 capturas novas. Os 227 E2E anteriores do mesmo SHA foram reutilizados como referência histórica, e a versão nova executa a suíte completa. |
| M1.1–M2.4 | Core transacional/eventos, `rich-text`, política com casos negativos e composição do servidor; testes de escopo, rollback, replay, clocks e observadores. |
| M3.1–M6.3 | Quatro donos extraídos, com classes/contratos/participantes; antigos consumidores e testes migrados. |
| M7.1–M7.4 | Workspace restrito a coordenação e leituras agregadas; repositório universal, adaptadores antigos e reexports de transição removidos. |
| M8.1–M8.4 | Código `59f6306` revisado; 776 unitários, 331 SQLite, build, 227 E2E finais e 40 capturas aprovados; passagem no Chrome do Herdr concluída. Comandos, artefatos e limites em [validação](../validacao.md#etapa-13-módulos-e-contratos-públicos). |
| Integração | Em 2026-11-03, autorização do usuário para juntar na `main`; fast-forward de `2090dea` até `39d5e33`, contendo o código validado `59f6306`. Publicação pelo pipeline GitHub → CI → Railway, sem deploy manual. |
