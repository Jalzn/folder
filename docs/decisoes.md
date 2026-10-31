# Tinyfold — Decisões

Acrescentar novas decisões ao histórico e atualizar os documentos afetados. Uma proposta técnica registrada não equivale a uma escolha explícita do usuário.

| Data | Origem | Decisão |
| --- | --- | --- |
| 2026-10-29 | Conversa com o usuário | Nome do aplicativo e repositório: tinyfold. |
| 2026-10-29 | Conversa com o usuário | Uso pessoal primeiro, pelo navegador, com dados na nuvem e acesso por vários dispositivos. |
| 2026-10-29 | Conversa com o usuário | Editor visual semelhante ao Notion, atalhos Markdown e importação/exportação `.md`. |
| 2026-10-29 | Conversa com o usuário | Projetos com documentos e tarefas em Kanban; seguir a direção Documento primeiro. |
| 2026-10-29 | Conversa com o usuário | Interface escura, grafite, cinzas frios e azul discreto. Artefatos de design gerados no sistema nativo do Claude. |
| 2026-10-29 | Conversa com o usuário | Usar SQLite e autenticação simples, seguindo a implementação do Orbis. Substitui a proposta anterior de Supabase. |
| 2026-10-29 | Conversa com o usuário | Adicionar renderização de equações ao editor. |
| 2026-10-29 | Inspeção do Orbis | A versão local usa PostgreSQL. Estrutura, contratos e autenticação servem de referência; persistência, migrações, transações e backup precisam de adaptação. |
| 2026-10-29 | Proposta técnica | Um processo Node com SPA React/Vite, Hono e oRPC; SQLite central no servidor com volume persistente. |
| 2026-10-29 | Proposta técnica | Workspace pnpm com core, auth, workspace, server e web. Projetos, documentos e tarefas ficam juntos no módulo workspace. |
| 2026-10-29 | Proposta técnica | Kysely com better-sqlite3; BlockNote sujeito à prova do editor. Validar versões na fundação. |
| 2026-10-29 | Proposta técnica | Autosave com controle de versão, pedido idempotente e recuperação de rascunho. Conflito mantém a cópia local para resolução explícita. |
| 2026-10-29 | Proposta técnica | Backup e restauração verificados antes do uso diário em produção. Hospedagem, domínio e destino do backup permanecem pendentes. |
| 2026-10-29 | Conversa com o usuário | Abrir um worktree no Tinyfold para explorar uma feature de canvas semelhante ao Excalidraw. |
| 2026-10-29 | Proposta técnica | [Etapa 06](etapas/06-canvas.md): desenhos independentes, com projeto opcional, Excalidraw incorporado e salvamento com versão e recuperação. |
| 2026-10-29 | Conversa com o usuário | Implementar a feature de canvas no worktree com subagentes. |
| 2026-10-30 | Conversa com o usuário | Tinyfold é um espaço pessoal e minimalista para projetos de software e outros. Reúne o que antes ficava em Notion, Trello e Excalidraw. |
| 2026-10-30 | Conversa com o usuário | O projeto é o centro da experiência e sua página passa a ser a tela principal. Substitui a direção Documento primeiro. |
| 2026-10-30 | Conversa com o usuário | Uso apenas pessoal. Nenhuma ferramenta além de documentos, desenhos e Kanban está prevista. |
| 2026-10-30 | Conversa com o usuário | Peso do projeto: cerca de 60% laboratório de arquitetura para os próximos aplicativos e 40% ferramenta de uso diário. |
| 2026-10-30 | Conversa com o usuário | Markdown é a sintaxe de digitação dos documentos; não há exigência de arquivos `.md` como armazenamento. |
| 2026-10-30 | Conversa com o usuário | Tarefas ganham descrição, checklist, datas, etiquetas e colunas próprias. |
| 2026-10-30 | Conversa com o usuário | Servidor MCP para o Claude Code acessar documentos, desenhos e tarefas. |
| 2026-10-30 | Proposta de produto | Fora do escopo: bancos de dados, modelos, hierarquias profundas, campos personalizados, automações, colaboração e outras contas. Discutida na conversa; o usuário incluiu os campos de tarefa. |
| 2026-10-30 | Proposta de produto | Descrição da tarefa com o editor de documentos e links internos genéricos entre documentos, desenhos e tarefas. Pendentes de confirmação. |
| 2026-10-30 | Conversa com o usuário | MCP somente leitura. Desenhos chegam ao Claude como imagem PNG e como textos e estrutura da cena. |
| 2026-10-30 | Conversa com o usuário | A descrição da tarefa usa o editor de documentos. |
| 2026-10-30 | Conversa com o usuário | Ligações existem apenas nos documentos: um documento incorpora tarefas, exibidas como card, e desenhos, exibidos renderizados. Substitui a proposta de links genéricos. |
| 2026-10-30 | Conversa com o usuário | Detalhes dos campos e colunas do Kanban delegados à proposta de produto. |
| 2026-10-30 | Proposta de produto | Colunas únicas para todo o espaço, com uma coluna de conclusão; prazo opcional sem hora, sem início nem lembretes; etiquetas globais com paleta curta; checklist da tarefa vem dos blocos de checklist da descrição. |
| 2026-10-30 | Proposta de produto | Itens incorporados excluídos aparecem como indisponíveis. Na exportação `.md`, viram links com o título. |
| 2026-10-30 | Proposta técnica | Autenticação do MCP por token pessoal somente leitura, criado e revogado no Perfil. Pendente de confirmação. |
| 2026-10-30 | Conversa com o usuário | Confirma a autenticação do MCP por token pessoal somente leitura, criado e revogado no Perfil. |
| 2026-10-30 | Conversa com o usuário | Explorar três alternativas de interface com subagentes, identidade visual livre e protótipos navegáveis. Entre Bancada, Sanfona e Lente, a Bancada ficou mais próxima da ideia. Ver [interface](interface/README.md). |
| 2026-10-30 | Conversa com o usuário | Visual limpo e tipográfico, com tema claro e escuro, iterando sobre uma única proposta. |
| 2026-10-30 | Conversa com o usuário | Experiência só de projeto: sem Início e sem caixa de entrada, com uma lateral do projeto que organiza os itens. Visual menos parecido com o Notion. |
| 2026-10-30 | Conversa com o usuário | Tudo sem serifa e sem coluna de margem. |
| 2026-10-30 | Proposta de produto | Todo item pertence a um projeto, com um projeto geral para o que é avulso; sem quadro geral nem prazos entre projetos; tarefa em gaveta inferior não modal; coluna de conclusão com 14 dias; Lixeira por projeto. Aprovada com o protótipo em 2026-10-31. |
| 2026-10-31 | Conversa com o usuário | Manter a organização do Sumário e refazer o visual inspirado no Linear: design, cores e tipografia. "Manter o design" se refere à organização, não ao visual. |
| 2026-10-31 | Conversa com o usuário | Lateral na variante A, Coluna de ícones. |
| 2026-10-31 | Conversa com o usuário | Pastas mistas para documentos e desenhos, com um único nível; tarefas não entram em pastas. |
| 2026-10-31 | Conversa com o usuário | Direção Sumário aprovada. Especificações em `docs/interface/`. |
| 2026-10-31 | Proposta de produto | Cores geradas em OKLCH; destaque `#86A5FB` no escuro e `#3856C8` no claro, fundo escuro `#13161C` e conclusão `#6AD18A` substituem a paleta de 2026-10-29. Inter e JetBrains Mono. Aprovada com o protótipo. |
| 2026-10-31 | Proposta técnica | [Etapa 07](etapas/07-mcp.md): endpoint `/mcp` na mesma origem, Streamable HTTP sem sessão e respostas JSON, com o SDK oficial v2 (`@modelcontextprotocol/server` 2.4.0). Atende também clientes da revisão 2025 sem sessão. |
| 2026-10-31 | Proposta técnica | Tokens MCP no módulo auth: `tf_mcp_` mais 256 bits, só o SHA-256 guardado, prefixo para exibição, último uso gravado no máximo a cada minuto, revogação que apaga a linha, até 10 ativos e sem validade. A criação não passa pelo registro idempotente, para o segredo não ficar guardado. `reset-password` revoga todos os tokens; trocar a senha no Perfil, não. |
| 2026-10-31 | Proposta técnica | `/mcp` aceita só `Authorization: Bearer` e ignora cookies; `/rpc` ignora o bearer. `Origin`, quando presente, precisa ser igual a `APP_ORIGIN`. Corpo de até 64 KiB, 10 falhas de autenticação por minuto por IP e 240 requisições por minuto por token. `/.well-known/*` responde 404 antes do fallback da SPA. |
| 2026-10-31 | Proposta técnica | Ferramentas `list_projects`, `search`, `read_document`, `read_drawing`, `list_tasks` e `read_task`. Ficam no workspace como definições sem o SDK; o servidor registra as ferramentas e compõe autenticação e limites. A leitura usa uma porta própria (`WorkspaceReader`). |
| 2026-10-31 | Proposta técnica | Saídas MCP só em `content`, sem `structuredContent`: o Claude Code prioriza `structuredContent` e descartaria a imagem. Documentos em páginas de até 60.000 caracteres, com cursor ligado à versão. Listas com até 50 ou 100 itens por página. |
| 2026-10-31 | Proposta técnica | PNG do desenho: prévia gerada no navegador pelo próprio Excalidraw depois de salvar, guardada por versão em `workspace_canvas_previews` (até 1.568 px e 256 KiB, tema claro), com a defasagem informada na resposta. A estrutura textual é derivada no servidor da cena atual. A renderização no servidor foi descartada. |
| 2026-10-31 | Proposta técnica | Markdown do MCP por serializador puro no domínio para o subconjunto validado, com as regras de cerca das equações compartilhadas com a web e um teste de ida e volta pelo parser real do BlockNote. |
| 2026-10-31 | Proposta técnica | A etapa 07 divide `workspace/infra/repository.ts` por agregado e o Perfil em seções. As divisões de `shell.tsx`, `Library.tsx`, `styles.css`, `Board.tsx`, `DocumentEditor.tsx` e `CanvasEditor.tsx` ficam nas etapas 08, 10 e 11, conforme cada plano. |
| 2026-10-31 | Proposta técnica | Validações em Chrome real usam banco temporário e portas 3471/5271, nunca `data/tinyfold.sqlite`. O servidor passa a registrar na subida o caminho do banco aberto. |

## Decisões de implementação

- A prova confirmou BlockNote para os blocos textuais e intercâmbio Markdown. JSON permanece como fonte do conteúdo.
- Equações usam LaTeX e KaTeX, em linha ou em bloco. A fonte inválida é preservada para continuar a edição; importar/exportar Markdown também mantém essa fonte. A edição em linha usa diálogo nativo para evitar uma falha de substituição de texto da extensão 0.56.
- SQLite usa WAL, synchronous FULL e transações BEGIN IMMEDIATE, com testes de duas conexões.
- Limites de persistência: 1 MiB/5.000 blocos por documento e 2 MiB por pedido. Recuperação local usa limites maiores, sem elevar o teto da API.
- Escritas idempotentes mantêm respostas compactas por 30 dias. Conflitos exigem resolução explícita.
- CSS com tokens substituiu a proposta de Tailwind; React Aria foi mantido para diálogos e menus.
- Editor carrega sob demanda. A navegação e o Kanban funcionam em viewport estreito, com menu como alternativa ao arrastar.
- Docker e backup/restauração foram implementados. A entrega é local: remoto Git, provedor, domínio e backup externo continuam pendentes.
- Desenhos usam Excalidraw 0.18.1 sob demanda, em tabela própria no módulo workspace. O recorte inicial é vetorial, com importação/exportação editável e PNG; mídia e colaboração ficam para depois.
- Fontes do canvas são locais, com patch versionado para respeitar a configuração sem incluir CDN. Rascunhos de documentos mantêm compatibilidade após a extração do controlador de autosave compartilhado.
- A leitura autenticada de desenhos inclui itens na lixeira para permitir recuperação após exclusão remota. Gravação em desenho excluído continua recusada; salvar como cópia em projeto arquivado usa destino sem projeto e informa a mudança.
- Etapa 07: o SDK MCP v2 (`@modelcontextprotocol/server` 2.4.0) atendeu sem o plano B. O handler sem sessão responde JSON só na revisão 2026-07-28; clientes da revisão 2025 recebem um evento SSE, e o proxy precisa encaminhá-lo sem buffer. O endpoint lê o corpo antes do SDK para recusar lotes JSON-RPC, conta falhas por IP só depois da autenticação e recusa assinaturas.
- Etapa 07: a busca do MCP exige todas as palavras da consulta e ordena pelo título primeiro, e todas as listas paginam por chave, no lugar do trecho contíguo e dos cursores de deslocamento propostos. O cursor do quadro fixa a revisão, e `list_projects` também pagina.
- Etapa 07: a prévia do desenho continua gerada no navegador (opção A), mas o servidor decide se ela está atual pela impressão digital da cena (migração 004), não pela versão, e só aceita um PNG cujos dados descomprimem no tamanho do cabeçalho. O editor não renderiza de novo uma cena já mostrada nem uma que não cabe em nenhum tamanho.
- Etapa 07: o serializador Markdown segue o flanqueamento do CommonMark, com `<strong>`, `<em>` e `<del>` onde nenhum delimitador serve, e `<br>` nas quebras de itens de lista. As perdas do parser do BlockNote que nenhuma forma Markdown evita ficam declaradas no teste de ida e volta. A importação `.md` da web passou a resolver `\$`.
- Etapa 07: a redefinição de senha revoga os tokens na mesma transação da nova senha, e o limite de login passou para a janela deslizante do core. O dependency-cruiser ganhou três regras (pontos de entrada dos módulos, SDK MCP só em `server/mcp` e auxiliares `testing/` fora do código de execução), ao contrário do "sem regra nova" do plano.
- Etapa 07: a validação real registrou o servidor por um `--mcp-config` temporário com `--strict-mcp-config`, e não por `claude mcp add --scope local`, para não alterar a configuração do Claude Code do usuário.
