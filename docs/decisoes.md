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

## Decisões de implementação

- A prova confirmou BlockNote para os blocos textuais e intercâmbio Markdown. JSON permanece como fonte do conteúdo.
- Equações usam LaTeX e KaTeX, em linha ou em bloco. A fonte inválida é preservada para continuar a edição; importar/exportar Markdown também mantém essa fonte. A edição em linha usa diálogo nativo para evitar uma falha de substituição de texto da extensão 0.56.
- SQLite usa WAL, synchronous FULL e transações BEGIN IMMEDIATE, com testes de duas conexões.
- Limites de persistência: 1 MiB/5.000 blocos por documento e 2 MiB por pedido. Recuperação local usa limites maiores, sem elevar o teto da API.
- Escritas idempotentes mantêm respostas compactas por 30 dias. Conflitos exigem resolução explícita.
- CSS com tokens substituiu a proposta de Tailwind; React Aria foi mantido para diálogos e menus.
- Editor carrega sob demanda. A navegação e o Kanban funcionam em viewport estreito, com menu como alternativa ao arrastar.
- Docker e backup/restauração foram implementados. A entrega é local: remoto Git, provedor, domínio e backup externo continuam pendentes.
