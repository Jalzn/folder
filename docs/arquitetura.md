# Tinyfold — Arquitetura

**Estado:** implementada, com operação local validada. A hospedagem pública permanece pendente.

## Base e módulos

O Orbis serviu de referência para o workspace pnpm, TypeScript, SPA React/Vite, Hono, oRPC, módulos em camadas, autenticação, migrações com checksum e escritas idempotentes. Seu PostgreSQL foi substituído por SQLite; transações, migrações e backups foram adaptados.

```text
src/
├── core/          erros, banco, transações, migrações e idempotência
├── auth/          conta pessoal, senha e sessões
├── workspace/     projetos, documentos, desenhos, tarefas e vínculos
├── server/        Hono, oRPC, composição, configuração e comandos
└── web/           React: navegação, editor, projetos e Kanban
```

Cada pasta é um pacote `@tinyfold/<nome>`. Auth e workspace seguem domínio, aplicação e infraestrutura. O domínio é puro; casos de uso dependem de portas; a infraestrutura implementa SQL e transporte. O servidor compõe os módulos e a web importa tipos e regras puras. Dependency-cruiser verifica os limites.

Projetos, documentos, desenhos e tarefas pertencem ao mesmo módulo para preservar as regras de atribuição e gravar a criação de uma tarefa e seu vínculo documental na mesma transação. Desenhos têm contrato próprio; cenas não são blocos do editor de documentos.

## Execução e SQLite

Em produção, um processo Node serve a SPA e `/rpc` pela mesma origem HTTPS. O navegador consulta essa API e o SQLite fica no servidor, em volume persistente. A configuração rejeita origem HTTP e força cookie Secure em produção.

Kysely usa better-sqlite3 com um dialeto que inicia transações com `BEGIN IMMEDIATE`, reservando a escrita antes de consultar versões e pedidos anteriores. SQLite usa `foreign_keys=ON`, WAL, `busy_timeout=5000` e `synchronous=FULL`. Escritas são curtas; o cálculo de senha ocorre fora da transação.

Migrações SQL numeradas são executadas atomicamente e registradas com checksum. Alterar uma migração já aplicada impede a subida. A execução usa scripts SQL nativos, preservando strings com ponto e vírgula.

A implantação prevê uma instância e um volume local ao processo. Não há réplica nem banco compartilhado por múltiplos hosts.

## Autenticação

- Uma conta criada na primeira subida com `OWNER_PASSWORD` e `OWNER_NAME`, sem cadastro público.
- Hash de senha com scrypt e salt aleatório.
- Tokens aleatórios de sessão; apenas os hashes são persistidos.
- Cookie `tinyfold_session` HttpOnly, SameSite=Strict e Secure em produção.
- Sessões renováveis de 30 dias, logout, troca de senha e revogação de sessões no Perfil.
- Login limitado por IP; recuperação de senha por comando no servidor encerra todas as sessões.
- Toda operação de conteúdo exige sessão; chamadas RPC verificam a origem configurada.
- Consulta/renovação de sessão e redefinição/revogação respeitam transações para evitar corridas.

## Modelo

| Tabela | Responsabilidade |
| --- | --- |
| `auth_owner` | Conta única, hash de senha e identidade da instalação |
| `auth_sessions` | Hash do token, aparelho e validade |
| `workspace_projects` | Nome, versão, datas e arquivamento |
| `workspace_documents` | Projeto opcional, título, JSON, texto de busca, formato, versão e exclusão lógica |
| `workspace_canvases` | Projeto opcional, título, cena vetorial JSON, texto de busca, formato, versão e exclusão lógica |
| `workspace_tasks` | Projeto opcional, título, estado, posição, versão e exclusão lógica |
| `workspace_task_sources` | Uma origem por tarefa: documento, bloco opcional e trecho capturado |
| `workspace_state` | Revisão do quadro para validar movimentos concorrentes |
| `core_mutations` | ID do pedido, operação, fingerprint, resposta compacta e data |
| `core_schema_migrations` | Migrações aplicadas e checksums |

As relações têm chaves estrangeiras. A lixeira preserva documentos e vínculos; tarefas continuam disponíveis mesmo com a origem excluída. Trechos removidos ou modificados apresentam estado de origem indisponível e o contexto capturado permanece.

## Salvamento e múltiplos dispositivos

1. O editor registra a edição local em localStorage, separada por instalação, documento e escritor da página.
2. Uma referência em sessionStorage permite recuperar o rascunho após recarga. Cada nova página ganha identidade própria, inclusive quando a aba foi duplicada.
3. O autosave agrupa mudanças e mantém no máximo uma chamada em voo por documento.
4. Cada envio tem `requestId`, `expectedVersion` e um snapshot imutável. Reenvios mantêm o mesmo pedido.
5. O servidor valida a versão, incrementa-a e grava a confirmação idempotente na mesma transação.
6. A resposta contém metadados compactos, sem duplicar o documento no histórico de pedidos. A retenção é de 30 dias, com limpeza na subida e diariamente.
7. Conflitos preservam a edição local e oferecem carregar a versão remota ou salvar como cópia. Não há mesclagem automática.
8. Atualizações das consultas respeitam rascunhos pendentes. Salvamento também atualiza o estado das origens de tarefas vinculadas.

A recuperação depende do armazenamento disponível no navegador; não equivale a um cliente offline completo. Rascunhos inválidos não são carregados no editor.

O controlador de autosave aceita snapshots e validadores de rascunho específicos de documentos e desenhos. As chaves antigas dos documentos foram preservadas; desenhos usam outro namespace por instalação, recurso e escritor. Durante o desenho contínuo, as gravações locais são agrupadas em intervalos de até 100 ms, com persistência adicional ao soltar o ponteiro ou sair. O envio ao servidor aguarda 650 ms de pausa e mantém uma chamada em voo.

## Editor e limites

BlockNote armazena JSON no formato versão 1. O esquema permite parágrafos, títulos, listas, checklist, citações, código e equações LaTeX em linha ou em bloco. A validação verifica hierarquia, IDs, estilos, links, propriedades e blocos aceitos pelo editor. O texto extraído, incluindo a fonte LaTeX, alimenta a busca sem diferenciação de acentos.

Equações usam o esquema e o renderizador KaTeX de `@blocknote/math-block`, na mesma versão do editor. A edição em linha usa um diálogo com textarea nativo e prévia: a janela contenteditable da versão 0.56 perdia o primeiro caractere ao substituir uma fórmula existente. Fórmulas incompletas continuam salvas e editáveis. Não foi necessária migração do banco. Fontes KaTeX são emitidas como arquivos locais, mantendo a política CSP de mesma origem.

O conteúdo persistido tem limite de 1 MiB e 5.000 blocos; pedidos HTTP têm limite de 2 MiB. A recuperação local admite, de forma limitada, até 5 MiB e 20.000 blocos válidos para permitir reabrir e exportar uma edição que ultrapassou o limite do servidor. Isso não aumenta o limite de persistência.

Importar Markdown cria outro documento e preserva o documento aberto. Exportar usa o conteúdo atual do editor. Propriedades que Markdown não representa podem ser perdidas; projetos, tarefas, vínculos e sessões não fazem parte do arquivo `.md`.

O intercâmbio de equações usa a árvore sintática Markdown para reconhecer delimitadores fora de código, links e HTML. As demais estruturas continuam sendo processadas pelo BlockNote. A exportação preserva a fonte LaTeX sem depender da renderização, inclusive quando inválida, e verifica se todas as fórmulas foram restituídas. Ver [equações](equacoes.md) para sintaxe e limites.

Criar tarefa é uma ação explícita sobre a seleção. Um trecho de um único bloco usa sua âncora; uma seleção que atravessa blocos usa o documento como origem. Checklists continuam locais ao texto.

## Canvas e limites

O Excalidraw 0.18.1 carrega sob demanda em `/desenhos/$canvasId`; a listagem fica em `/desenhos`. O domínio valida JSON vetorial sem depender do runtime do editor. A cena persiste elementos e cor de fundo; viewport, seleção, menus, arquivos de mídia e histórico de desfazer não fazem parte do conteúdo no servidor.

Cada cena admite até 1 MiB e 5.000 elementos; a recuperação local admite até 5 MiB e 20.000 elementos válidos. A cena gravada remove elementos excluídos sem referências, preservando os necessários aos vínculos ativos. O histórico nativo em memória mantém os elementos para desfazer ações. Texto de busca é derivado apenas dos elementos de texto ativos.

Todas as mutações de canvas retornam confirmação compacta. A migração adicional `002_canvases.sql` mantém intactos documentos e tarefas existentes. A leitura autenticada também retorna desenhos na lixeira, permitindo recuperar um rascunho local após exclusão remota; gravar sobre um desenho excluído continua recusado.

Importar `.excalidraw` valida e compacta a cena antes de criar outro desenho. O arquivo tem limite de 2 MiB e a cena final respeita o teto persistido. PNG é gerado a partir do snapshot atual, com lado máximo de 4.096 pixels. Imagens e conteúdo incorporado são recusados em importação, colagem e arraste.

As fontes são copiadas pelo Vite para a própria origem no desenvolvimento e no build. Uma correção versionada pelo pnpm remove o fallback de CDN quando há caminho de fontes configurado, mantendo a política `font-src 'self'`; veja [stack](stack.md).

## Operação

Docker serve SPA e API, executa como usuário sem privilégios e mantém o banco em `/data`. `/health` verifica o processo; `/ready` consulta o banco. O backup usa a API do SQLite, verifica integridade e não substitui arquivos existentes. Restauração cria outro arquivo.

Veja [operação](implantacao.md) e [validação](validacao.md). Provedor, domínio, HTTPS público, agendamento e armazenamento externo de backups ainda precisam ser configurados.
