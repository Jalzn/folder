# Etapa 10 — Quadro e tarefa

**Estado:** planejada. Escopo inicial de 2026-10-31; esta página é detalhada antes de a etapa começar.

## Objetivo

Dar às tarefas os campos e o quadro definidos no [produto](../produto.md):

- colunas configuráveis únicas para todo o espaço, com uma coluna de conclusão;
- descrição com o editor de documentos, prazo e etiquetas;
- a gaveta inferior não modal;
- o quadro no visual Sumário ([refino.md](../interface/refino.md) §5–6 e [visual.md](../interface/visual.md)).

## Escopo

- **Colunas:**
  - Um conjunto para todos os projetos: criar, renomear, reordenar e excluir. Excluir uma coluna com tarefas exige escolher o destino, com ⌘Z.
  - Uma coluna é a de conclusão. Entrar nela grava a data de conclusão; sair dela a apaga.
  - As iniciais são A fazer, Em andamento e Concluído.
- **Coluna de conclusão e Concluídas:** a coluna mostra os últimos 14 dias, com o rodapé "Mais n concluídas antes de …". A página Concluídas do projeto é paginada.
- **Descrição:**
  - Usa o mesmo editor dos documentos, com salvamento automático, rascunho recuperável e conflito por versão.
  - O progresso do checklist vem dos blocos de checklist ("2/5"). Incorporar itens e criar tarefa a partir de trecho continuam exclusivos dos documentos.
- **Campos:**
  - Prazo: data opcional, sem hora, com destaque de atraso fora da coluna de conclusão.
  - Etiquetas: globais, com nome e cor de uma paleta curta. O quadro filtra por etiqueta.
- **Gaveta:**
  - Inferior e não modal: empurra o conteúdo e continua aberta durante a navegação.
  - Cabeçalho com estado, título, "Salvo", "Concluir" (⌘↵), ⋯ e ✕. Propriedades em grade e origem documental.
  - Abaixo de 1200 px, as propriedades vão para cima da descrição.
- **Quadro restilizado:**
  - Anel de coluna, cards compactos (prazo, progresso e etiquetas) e "+ Coluna" como coluna fantasma.
  - Mover por teclado (⇧ e setas) e por menu.
  - A Visão geral e o seletor ganham "Agora", atrasadas e "Concluídas · 14 dias".
- **MCP:**
  - `list_tasks` e `read_task` passam a devolver coluna (`id`, `name`, `isDone`), `dueOn`, `overdue`, etiquetas, `checklist { done, total }` e `completedAt`.
  - `read_task` devolve a descrição em Markdown, pelo serializador do domínio.
  - `list_tasks` filtra por coluna e etiqueta; `search` passa a buscar na descrição.

## Mudanças previstas de dados e contratos

- **Migração `workspace/006`:**
  - `workspace_columns (id, name, position, is_done, version, …)`, com no máximo uma coluna de conclusão (índice parcial único).
  - Tarefas ganham `column_id`, `completed_at`, `due_on` (`AAAA-MM-DD`), `description` (JSON de documento), `description_plain_text`, `search_text` e `description_version`.
  - `status` é substituído por `column_id`, mapeando `todo`, `doing` e `done` para as três colunas iniciais. O `CHECK` atual de `status` e a chave vinda de `workspace_task_sources` exigem reconstruir `workspace_tasks`, provavelmente com o suporte do executor de migrações avaliado na etapa 08.
  - Etiquetas: `workspace_labels (id, name único, color, position)` e `workspace_task_labels (task_id, label_id)`.
- **Versões:** a descrição tem versão própria (`description_version`). Assim o autosave dela não entra em conflito com mudanças de campo feitas na mesma gaveta (coluna, prazo, etiquetas), que continuam usando `version` e a revisão do quadro.
- **Atraso:** depende do fuso do dono para o MCP e para as contagens no servidor. Proposta: `time_zone` em `auth_owner`, como o `Owner.timeZone` do Orbis, definido no Perfil a partir do navegador.
- **Contratos:**
  - `listColumns`, `createColumn`, `renameColumn`, `moveColumn`, `deleteColumn({ destinationId })` e `setDoneColumn`.
  - `listLabels`, `createLabel`, `updateLabel` e `deleteLabel`.
  - `updateTask` aceita `dueOn` e `labelIds`; `saveTaskDescription` segue o padrão de `saveDocument`.
  - `listCompletedTasks({ projectId, cursor })`.

## Organização do código

- **`src/web/pages/Board.tsx`** (533 linhas) vira `pages/board/`:
  - `BoardPage.tsx`, `BoardColumn.tsx`, `ColumnHeader.tsx`, `ColumnMenu.tsx` e `TaskCard.tsx`;
  - `MoveTaskMenu.tsx`, `use-board-dnd.ts` e `use-board-keyboard.ts`;
  - `CompletedPage.tsx`.
- **`TaskDialog`** sai. Entra `components/task-drawer/`: `TaskDrawer.tsx`, `TaskDrawerHeader.tsx`, `TaskProperties.tsx`, `TaskDescription.tsx` e `use-task-description-autosave.ts`.
- **`LinkedTask`** vai para `components/task/`.
- **Editor compartilhado:** o esquema e a configuração do BlockNote saem de `DocumentEditor.tsx` para `src/web/editor/schema.ts` e `src/web/editor/BlockEditor.tsx`. A descrição e os documentos passam a usar a mesma peça; a etapa 11 continua a divisão do documento.
- **`src/workspace/application/tasks.ts`:** um caso de uso por arquivo em `application/tasks/`, `application/columns/` e `application/labels/`.
- **Regras puras no domínio:** progresso do checklist, atraso por data civil e janela de 14 dias.

## Dependências

Etapa 08: shell, Visão geral, seletor e tokens. A etapa 09 não é requisito, porque tarefas não entram em pastas.

## Perguntas em aberto

1. O fuso para calcular atrasos no servidor (MCP, contagens do seletor) vem do dono, configurado no Perfil, ou de cada pedido? Proposta: do dono, como no Orbis. A interface calcula com a data local do aparelho.
2. Excluir uma etiqueta usada em tarefas: remover das tarefas, com confirmação, ou impedir? Proposta: remover, com confirmação que informa quantas tarefas a usam.
