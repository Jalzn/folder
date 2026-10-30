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
