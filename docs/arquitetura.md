# Tinyfold — Arquitetura

**Estado:** implementada, com operação local validada. A hospedagem pública permanece pendente.

## Base e módulos

O Orbis serviu de referência para o workspace pnpm, TypeScript, SPA React/Vite, Hono, oRPC, módulos em camadas, autenticação, migrações com checksum e escritas idempotentes. Seu PostgreSQL foi substituído por SQLite; transações, migrações e backups foram adaptados.

```text
src/
├── core/          erros, banco, transações, migrações e idempotência
├── auth/          conta pessoal, senha, sessões e tokens de acesso
├── workspace/     projetos, documentos, desenhos, tarefas, vínculos e leitura por agentes
├── server/        Hono, oRPC, MCP, composição, configuração e comandos
└── web/           React: shell do projeto (lateral, ⌘K e teclado), páginas, editores, quadro e Perfil
```

Cada pasta é um pacote `@tinyfold/<nome>`. Auth e workspace seguem domínio, aplicação e infraestrutura. O domínio é puro; casos de uso dependem de portas; a infraestrutura implementa SQL e transporte. O servidor compõe os módulos e a web importa tipos e regras puras. Dependency-cruiser verifica os limites:

- o domínio e a aplicação não importam infraestrutura, e os módulos não se conhecem;
- servidor e web chegam a um módulo só pelos arquivos que o `package.json` dele exporta, e a web leva ao navegador só código próprio e domínio puro;
- só `src/server/mcp/` importa o SDK MCP;
- as pastas `testing/`, com auxiliares de teste, nunca entram no código de execução.

A exclusão do build cobre só `src/*/dist`, então as regras também enxergam os pacotes npm.

Projetos, documentos, desenhos e tarefas pertencem ao mesmo módulo para preservar as regras de atribuição e gravar a criação de uma tarefa e seu vínculo documental na mesma transação. Desenhos têm contrato próprio; cenas não são blocos do editor de documentos.

## Execução e SQLite

Em produção, um processo Node serve a SPA, `/rpc` e `/mcp` pela mesma origem HTTPS. O navegador consulta `/rpc`, o Claude Code consulta `/mcp`, e o SQLite fica no servidor, em volume persistente. A configuração rejeita origem HTTP e força cookie Secure em produção.

Kysely usa better-sqlite3 com um dialeto que inicia transações com `BEGIN IMMEDIATE`, reservando a escrita antes de consultar versões e pedidos anteriores. SQLite usa `foreign_keys=ON`, WAL, `busy_timeout=5000` e `synchronous=FULL`. Escritas são curtas; o cálculo de senha ocorre fora da transação.

Migrações SQL numeradas são executadas atomicamente e registradas com checksum. Alterar uma migração já aplicada impede a subida. A execução usa scripts SQL nativos, preservando strings com ponto e vírgula.

A implantação prevê uma instância e um volume local ao processo. Não há réplica nem banco compartilhado por múltiplos hosts.

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
| `auth_owner` | Conta única, hash de senha e identidade da instalação |
| `auth_sessions` | Hash do token, aparelho e validade |
| `auth_access_tokens` | Nome, SHA-256 e prefixo do token pessoal, escopo `read`, criação e último uso |
| `workspace_projects` | Nome, cor (`color`), posição no seletor (`position`, nula nos arquivados), versão, datas e arquivamento |
| `workspace_folders` | Pastas de um nível: projeto, nome, chave do nome sem caixa nem acentos (`name_key`, única entre as ativas do projeto), posição, versão, datas e exclusão lógica |
| `workspace_documents` | Projeto obrigatório, pasta (`folder_id`, nula na raiz), título, JSON, texto de busca, formato, versão, fixado (`pinned_at`) e exclusão lógica |
| `workspace_canvases` | Projeto obrigatório, pasta (`folder_id`, nula na raiz), título, cena vetorial JSON, texto de busca, formato, versão, fixado (`pinned_at`) e exclusão lógica |
| `workspace_canvas_previews` | Uma prévia PNG por desenho: versão e impressão digital da cena, largura, altura e bytes; apagada com o desenho |
| `workspace_tasks` | Projeto obrigatório, título, estado, posição na coluna do projeto, versão e exclusão lógica |
| `workspace_task_sources` | Uma origem por tarefa: documento (nulo depois de excluído de vez), título guardado do documento, bloco opcional e trecho capturado |
| `workspace_state` | Revisão do quadro para validar movimentos concorrentes |
| `core_mutations` | ID do pedido, operação, fingerprint, resposta compacta e data |
| `core_schema_migrations` | Migrações aplicadas e checksums |

As relações têm chaves estrangeiras, e gatilhos recusam `project_id` nulo em documentos, desenhos e tarefas. Desde a migração `006_folders.sql`, gatilhos também garantem que um item vivo só fica numa pasta ativa do próprio projeto, que a pasta não muda de projeto e que não é excluída com itens vivos dentro; um item na lixeira guarda a pasta excluída como origem. A lixeira preserva documentos e vínculos; tarefas continuam disponíveis mesmo com a origem excluída, e excluir o documento de vez deixa na origem o título que ele tinha. Trechos removidos ou modificados apresentam estado de origem indisponível e o contexto capturado permanece.

## Projetos, navegação e lixeira

Todo documento, desenho e tarefa pertence a um projeto ativo na criação. A migração `005_projects_required.sql` levou os itens soltos, inclusive os da lixeira, ao projeto Geral (ID fixo, criado só quando havia itens soltos), sem mudar versões nem datas. As regras completas estão no [README do workspace](../src/workspace/README.md).

- **Projetos:** cor de quatro chaves e ordem manual no seletor (`moveProject`), sem mudar versão. Qualquer projeto pode ser arquivado, inclusive o último ativo; sem projeto ativo, a interface mostra o estado vazio e o MCP devolve `list_projects` vazio.
- **Fixados por escopo:** até 8 documentos e desenhos na raiz do projeto e até 8 em cada pasta, contados juntos. `pinItem` e `unpinItem` não passam pelo registro de pedidos nem mudam versão ou data, então não conflitam com o autosave de uma página aberta.
- **Pastas:** um nível, só para documentos e desenhos, até 200 ativas por projeto, com o nome único sem caixa nem acentos e só leitura num projeto arquivado. Criar põe a pasta no topo; renomear sobe a versão; reordenar e mudar um item de pasta não mudam versão nem datas, então nunca conflitam com o autosave. `deleteFolder` leva os itens à raiz ou, com `withItems`, à lixeira, e responde as listas que `restoreFolder` usa para desfazer.
- **Mover:** só por `moveItem`, que não leva conteúdo nem conta como edição (`updatedAt` fica). Para outro projeto, exige a versão, sobe a versão, para que um editor com a anterior saiba da mudança, e leva o item à raiz, sem fixado. Para outra pasta do mesmo projeto ou para a raiz (`folderId`), não pede nem muda a versão, e o item mantém o fixado se o destino tiver vaga. `saveDocument` e `saveCanvas` não têm `projectId`.
- **Consultas da interface:** `projectNavigation` (a árvore Itens, `tree`: fixados da raiz, pastas com os fixados e os primeiros itens, e soltos da raiz, até 8 por nível com os totais; mais tarefas abertas e itens na lixeira), `listFolders` (as pastas ativas, para o ⌘K e os menus), `projectOverview` (Agora e Editados recentemente, com o trecho cortado pelo domínio) e `search`, o mesmo caso de uso das ferramentas MCP, numa porta `NavigationReader` com SQL em `infra/navigation/`.
- **Lixeira por projeto:** `listTrash` traz até 1.000 itens, do excluído mais recentemente, com a pasta de origem de cada documento e desenho, mesmo excluída; a contagem da lateral e da Visão geral é sempre exata. Restaurar devolve o item à pasta, ou à raiz se ela foi excluída (`folderGone`). Excluir de vez (`purgeDocument`, `purgeCanvas`, `purgeTask`) só vale para item na lixeira, e `emptyTrash` recebe exatamente os itens mostrados (até 1.000) e responde `{ purged, skipped }`.
- **Respostas de escrita:** de documentos, desenhos e tarefas são compactas, sem título, conteúdo nem trecho, para que excluir de vez não deixe o texto no registro de pedidos.
- **Texto que não se desenha:** nomes de pasta, nomes de projeto e títulos perdem os pontos de código ignoráveis (`visibleText`) e ficam em NFC, com exceções para emoji e escritas que precisam deles; o MCP aplica a mesma função ao que devolve.

### Desfazer

Excluir uma pasta, com ou sem os itens, e mover um item entre pastas ou projetos têm "Desfazer" no toast. A exclusão é lógica e a restauração é versionada: `restoreFolder` recebe as listas que `deleteFolder` respondeu, devolve a pasta à posição guardada e só traz de volta o que continua como a exclusão deixou, contando os outros em `skipped`. Desfazer um movimento é outro `moveItem`. Uma pasta com mais de 1.000 itens sai sem Desfazer.

No cliente, o ⌘Z desfaz a ação do toast na tela (`ToastProvider`, com a guarda `acceptsUndo`): só fora de campos editáveis, do editor, do Excalidraw e de menus e diálogos, e nunca a de um toast que já saiu. Cada Desfazer pertence à sua mudança (`lib/item-changes.ts`): uma mudança mais nova do mesmo item tira o Desfazer do toast anterior. As escritas passam uma de cada vez (`lib/write-queue.ts`), cada intenção guarda o seu ID de pedido, e uma resposta perdida é reenviada uma vez com o mesmo ID (`lib/lost-answer.ts`), que devolve a resposta guardada.

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

## Rotas e shell

A SPA usa TanStack Router com endereços em português, sempre dentro de um projeto:

| Endereço | Tela |
| --- | --- |
| `/projetos/$id` | Visão geral |
| `/projetos/$id/quadro` (`?tarefa=`) | Quadro, com o diálogo de uma tarefa |
| `/projetos/$id/indice` (`?tipo=documentos\|desenhos`, `?pasta=<id>\|raiz`) | Índice de documentos e desenhos, agrupado por pasta |
| `/projetos/$id/lixeira` | Lixeira do projeto |
| `/projetos/$id/documentos/$docId` (`?bloco=`) e `/projetos/$id/desenhos/$canvasId` | Editores |
| `/projetos` | Estado vazio, sem projeto ativo |
| `/perfil` e `/entrar` | Perfil e login |

`/` reabre o último lugar do último projeto, com a rolagem, guardado no dispositivo por instalação; o caminho guardado só é usado se for um endereço interno conhecido. Os endereços anteriores (`/documentos/$id`, `/desenhos/$id`, listas e `/login`) redirecionam, e um item aberto no endereço de outro projeto passa ao endereço certo. Uma codificação quebrada ou um endereço desconhecido mostram uma página em português dentro do shell.

O shell (`src/web/shell/`) tem a lateral de 256 px a partir de 1.100 px, com a árvore Itens (o `Tree` do React Aria, `treegrid`), em que os atalhos N, P, M e G ganham do typeahead e um arrastar leva itens entre pastas e reordena pastas, a faixa de 52 px (⌘\\) e a lateral sobre a página entre 720 e 1.100 px, e abaixo de 720 px uma barra de 44 px que recebe as ações da página. Buscar filtra na lateral; o ⌘K busca em todos os projetos e lista as ações do item aberto e os comandos. Atalhos de uma tecla não valem em campos editáveis, durante uma composição de IME nem no Excalidraw, e o Esc fecha só a camada mais recente, sem navegar. Toasts mostram um por vez, o mais novo no lugar do anterior, em regiões vivas que um modal não esconde.

## Tema, tokens e fontes

`src/web/styles/tokens/` (`palette.ts` e `scale.ts`) é a fonte das cores, sombras, tipos, raios, alturas e durações; `pnpm tokens` grava `tokens.css`, e o `check` falha quando o arquivo diverge, quando um valor difere de `docs/interface/prototipo/tokens.py` ou quando um par de contraste fica abaixo do exigido. O tema Sistema, Claro ou Escuro fica no dispositivo (`tinyfold:theme`); `public/theme.js` aplica `data-theme`, `color-scheme` e a cor da barra antes da primeira pintura, e `useTheme` mantém isso enquanto o aplicativo roda, inclusive entre abas. BlockNote e Excalidraw seguem o tema; a prévia guardada do desenho continua clara.

Inter vem completa de `inter-ui` (com `cv05`, `ss03`, `case` e `tnum`) e JetBrains Mono da Fontsource, ambas emitidas pelo Vite na própria origem, com o arquivo regular da Inter pré-carregado.

## Editor e limites

BlockNote armazena JSON no formato versão 1. O esquema permite parágrafos, títulos, listas, checklist, citações, código e equações LaTeX em linha ou em bloco. A validação verifica hierarquia, IDs, estilos, links, propriedades e blocos aceitos pelo editor. O texto extraído, incluindo a fonte LaTeX, alimenta a busca sem diferenciação de acentos.

Equações usam o esquema e o renderizador KaTeX de `@blocknote/math-block`, na mesma versão do editor. A edição em linha usa um diálogo com textarea nativo e prévia: a janela contenteditable da versão 0.56 perdia o primeiro caractere ao substituir uma fórmula existente. Fórmulas incompletas continuam salvas e editáveis. Não foi necessária migração do banco. Fontes KaTeX são emitidas como arquivos locais, mantendo a política CSP de mesma origem.

O conteúdo persistido tem limite de 1 MiB e 5.000 blocos; pedidos HTTP têm limite de 2 MiB. A recuperação local admite, de forma limitada, até 5 MiB e 20.000 blocos válidos para permitir reabrir e exportar uma edição que ultrapassou o limite do servidor. Isso não aumenta o limite de persistência.

Importar Markdown cria outro documento e preserva o documento aberto. Exportar usa o conteúdo atual do editor. Propriedades que Markdown não representa podem ser perdidas; projetos, tarefas, vínculos e sessões não fazem parte do arquivo `.md`.

O intercâmbio de equações usa a árvore sintática Markdown para reconhecer delimitadores fora de código, links e HTML. As demais estruturas continuam sendo processadas pelo BlockNote. A exportação preserva a fonte LaTeX sem depender da renderização, inclusive quando inválida, e verifica se todas as fórmulas foram restituídas. Ver [equações](equacoes.md) para sintaxe e limites.

Criar tarefa é uma ação explícita sobre a seleção. Um trecho de um único bloco usa sua âncora; uma seleção que atravessa blocos usa o documento como origem. Checklists continuam locais ao texto.

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

As ferramentas do workspace são objetos simples (`createWorkspaceTools(db, { logError })`), sem dependência do SDK. Casos de uso em `application/reading/` usam a porta `WorkspaceReader`, implementada em `infra/reader/`. Os limites ficam em `domain/reading-limits.ts`.

- **Busca:** exige todas as palavras da consulta, normalizadas sem caixa e acentos, e ordena por palavras no título e depois pela edição mais recente. O trecho de 240 caracteres vem de uma janela do texto em volta da primeira ocorrência, numa linha só, com os blocos do documento ou os textos do desenho separados por vírgula.
- **Listas:** são paginadas por chave (`s~…`, `t~…`, `p~…`). O cursor do quadro fixa a revisão do quadro e é recusado depois de qualquer mudança nas tarefas.
- **Documentos:** saem em Markdown do serializador puro do domínio (`documentToMarkdown`), em páginas de 36.000 caracteres com cursor `<impressão>:<deslocamento>`, presas ao texto paginado, e não à versão, para que mover ou renomear não as invalide; a primeira reserva 9.000 para cabeçalho e rodapé. Um bloco cortado pela página é fechado e reaberto.
- **Desenhos:** saem como estrutura textual da cena atual (`outlineCanvasScene`) e a prévia PNG guardada.
- **Projetos e origens:** `list_projects` traz cor, posição, `folderCount` e até 50 pastas por projeto, com a contagem de itens, sem `withoutProject`; a busca diz se o item está fixado e em que pasta está (`folder`), e aceita `folderId`; `read_document` e `read_drawing` trazem a linha da pasta no cabeçalho; uma origem de tarefa cujo documento foi excluído de vez vem com `documentId: null` e o título guardado.
- **Respostas:** têm até 45.000 caracteres de texto, rodapés e erros incluídos, só em `content`, sem `structuredContent`. O Claude Code 2.1.310 grava num arquivo o resultado que passa de 50.000 e mostra ao modelo só uma prévia. Cada ferramenta cabe no teto pelo próprio orçamento, e `withTextCeiling` corta, com aviso, o que ainda passasse.

O [README do workspace](../src/workspace/README.md) descreve as regras e as perdas conhecidas do Markdown no parser do BlockNote.

### Prévias de desenho

O navegador renderiza a prévia com o próprio Excalidraw, em tema claro, 1,5 s depois de um salvamento e com o navegador ocioso. Tenta lados de 1.568 px para baixo até o arquivo caber em 200 KiB, ou 256 KiB no menor lado, e envia por `workspace.saveCanvasPreview` com a impressão digital da cena que ela mostra: uma prévia ainda em geração quando o desenho é movido, renomeado ou vai para a lixeira continua valendo. A gravação não usa o registro de pedidos nem muda versão, datas ou revisão do quadro.

O servidor só aceita um PNG completo, cujos dados de imagem descomprimem exatamente no tamanho do cabeçalho, em linhas com tipos de filtro válidos, até 1.568 px e 256 KiB. A prévia guarda a impressão digital da cena (`sceneFingerprint`): renomear, mover ou passar pela lixeira não a torna defasada. `getCanvas` devolve `previewVersion` e `previewCurrent`.

O editor gera a prévia ao abrir um desenho sem prévia atual, ao adotar uma versão salva em outro dispositivo e depois de cada salvamento que muda a cena. Uma cena que nenhum tamanho comporta não é renderizada de novo até mudar.

### Módulos e portas

- **auth:** `domain/access-token.ts`, os casos de uso em `application/access-tokens/` e, na infraestrutura, o repositório, os segredos e `createAccessTokens`.
- **workspace:** no domínio, o serializador Markdown, as páginas, a estrutura da cena, `png.ts`, `scene-fingerprint.ts` e os limites; na aplicação, `reading/` e `canvas-previews.ts`, que valida a prévia pela porta `PngImageData`; na infraestrutura, `reader/`, `mcp/` (ferramentas e formatação) e `png-image-data.ts`.
- **server:** compõe tudo em `src/server/mcp/`, com `bearer.ts`, `request-body.ts`, `mcp-server.ts` (registro das ferramentas no SDK) e `endpoint.ts` (`mountMcp`), e o IP do cliente em `client-ip.ts`.
- **Migrações:** `auth/002_access_tokens.sql`, `workspace/003_canvas_previews.sql` e `workspace/004_canvas_preview_fingerprint.sql`.

## Operação

Docker serve SPA e API, executa como usuário sem privilégios e mantém o banco em `/data`. `/health` verifica o processo; `/ready` consulta o banco. O backup usa a API do SQLite, verifica integridade e não substitui arquivos existentes; inclui tokens e prévias de desenho. Restauração cria outro arquivo.

Veja [operação](implantacao.md) e [validação](validacao.md). Provedor, domínio, HTTPS público, agendamento e armazenamento externo de backups ainda precisam ser configurados.
