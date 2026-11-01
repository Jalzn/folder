# Etapa 10 — Quadro e tarefa

**Estado:** detalhada em 2026-11-01, a partir do escopo inicial de 2026-10-31. As seções "Resultado" e "Desvios do plano" entram ao concluir, como na [etapa 09](09-pastas.md).

## Objetivo

Dar às tarefas os campos e o quadro definidos no [produto](../produto.md):

- colunas configuráveis únicas para todo o espaço, com uma coluna de conclusão;
- descrição com o editor de documentos, prazo e etiquetas;
- a gaveta inferior não modal no lugar do diálogo da tarefa;
- o quadro e a página Concluídas no visual Sumário.

A Visão geral, o seletor e a lateral ganham as atrasadas e "Concluídas · 14 dias". O MCP passa a ler colunas, prazos, etiquetas, checklist e a descrição em Markdown.

## Referências e precedência

| Assunto | Fonte |
| --- | --- |
| Quadro, cards e gaveta: medidas, estados e tokens | [visual.md](../interface/visual.md), "Quadro" e "Gaveta da tarefa", e o movimento (§7) |
| Quadro e gaveta: estrutura, textos e o que a visual.md não diz | [refino.md](../interface/refino.md) §5–6 e as críticas 8 a 17 e 20 |
| Dados de exemplo (colunas, etiquetas, prazos, checklists) | [brief.md](../interface/brief.md) |
| Lateral e seletor (Quadro com "1 atrasada", atrasadas no seletor) | [sidebar.md](../interface/sidebar.md), variante A, e [pastas.md](../interface/pastas.md) |
| Comportamento de referência | `docs/interface/prototipo/sumario.html`: `boardHTML`, `boardKeys`, `colMenu`, `deleteColumn`, `cardMenu`, `moveTaskTo`, `toggleDone`, `inspTaskHTML`, `fieldsHTML`, `openDatePicker`, `openTagPicker`, `agoraTasks`, `doneHTML` e `onKeyDown` |
| Padrões já existentes | [Etapa 09](09-pastas.md) (Desfazer por restauração versionada, nomes com `visibleText` e chave, teclas de campo, foco por referência) e [etapa 07](07-mcp.md) (limites e testes do MCP) |

A ordem de precedência é a de [interface/README.md](../interface/README.md): visual.md é mais recente que refino.md. Por isso valem os números da visual.md, que são também os do protótipo:

| Peça | visual.md e protótipo (valem) | refino.md (substituído) |
| --- | --- | --- |
| Cabeçalho da coluna | 28 px, anel de 14 px, nome 13/20 500, sem fio embaixo, colunas a 12 px | 32 px, nome 14/20 600, fio `fio-forte`, colunas a 20 px |
| Card | `nível-1`, raio 8, título 13/18 500, meta com 8 px entre itens, chips de 20 px | raio 4, título 14/20, meta com 12 px |
| Card aberto na gaveta | fundo `seleção` e borda `acento` com alfa 0,35 | fundo `seleção`, borda inalterada |
| Cabeçalho da gaveta | 52 px, anel de 16 px, título 20/28 600 | 56 px, ícone de estado e título 22/28 500 |
| Propriedades | coluna de 300 px, grade de 88 px + 1fr, linhas de 30 px, rótulo 12/16 e valor 13/20 | 320 px, grade de 96 px, linhas de 32 px |
| Descrição | 14/22 | 15/24 |

## Casos de uso

1. Criar, renomear, reordenar e excluir colunas, que valem para todos os projetos, e escolher qual delas é a de conclusão.
2. Excluir uma coluna com tarefas escolhendo o destino delas, e desfazer pelo toast ou com ⌘Z.
3. Ver no quadro do projeto os cards com prazo, progresso do checklist e etiquetas, filtrar por etiqueta e mover os cards pelo mouse, pelo teclado (⇧ e setas) ou pelo menu.
4. Abrir uma tarefa na gaveta, que empurra o conteúdo e fica aberta enquanto se navega, e editar o título, a descrição, a coluna, o prazo, as etiquetas e o projeto.
5. Escrever a descrição com checklist, com salvamento automático, rascunho recuperável e conflito explícito.
6. Concluir ou reabrir uma tarefa (⌘↵) e desfazer.
7. Ver as concluídas dos últimos 14 dias na coluna de conclusão e na Visão geral, e todas na página Concluídas do projeto.
8. Saber das atrasadas no seletor, na lateral, no quadro e na Visão geral.
9. Criar, renomear, recolorir e excluir etiquetas.
10. Pelo Claude Code, listar tarefas por coluna e etiqueta e ler uma tarefa com a descrição em Markdown.

## Escopo

**Entra:**

- **Dados:** migração `workspace/007` com colunas, etiquetas, prazo, conclusão e descrição. A tabela de tarefas é reconstruída, e o executor de migrações ganha o procedimento de 12 passos do SQLite.
- **Fuso do dono:** migração `auth/003`, com o fuso em que valem as datas civis.
- **Escritas:** colunas, etiquetas e campos da tarefa. O título e a descrição têm versão própria.
- **Leituras:** o quadro do projeto com a janela de 14 dias e a página Concluídas paginada.
- **Interface:**
  - o quadro restilizado, com o anel de coluna, os cards, o filtro, "+ Coluna" e o teclado;
  - a gaveta da tarefa no lugar do diálogo;
  - a página Concluídas;
  - a gestão de etiquetas;
  - as atrasadas e as concluídas na Visão geral, no seletor e na lateral.
- **Editor compartilhado** pelo documento e pela descrição.
- **Desfazer com ⌘Z** para:
  - excluir coluna;
  - trocar a coluna de conclusão;
  - concluir e reabrir;
  - mover a tarefa de projeto;
  - excluir etiqueta.
- **MCP:** colunas, prazos, etiquetas, checklist e conclusão em `list_tasks`, `read_task` e `search`. `read_task` traz a descrição em Markdown, em páginas, e `search` busca na descrição.
- **Exemplo:** `seed:sample` com colunas, etiquetas, prazos e descrições do brief, e `--grande` com concluídas antigas.
- **Pastas:** o gatilho que recusa um `INSERT OR REPLACE` em `workspace_folders`, pendente da etapa 09.

**Fica de fora:**

- Colunas por projeto (fora do produto), campos personalizados, automações, prioridade, hora no prazo, lembretes e notificações.
- Incorporar tarefas e desenhos nos documentos, e o marcador de origem no texto (etapa 11).
- Incorporar itens na descrição e criar tarefa a partir de um trecho da descrição: continuam exclusivos dos documentos.
- Arrastar cards por toque no celular.
- Desfazer das demais ações: mover card pelo arrastar, pelo teclado ou pelo menu, renomear coluna, mudar prazo e mandar tarefa para a lixeira.
- Tarefas em pastas. Elas continuam fora das pastas, do Índice e do filtro de pasta (decisão do usuário da etapa 09).
- Escrita pelo MCP.

## Decisões técnicas

As duas perguntas em aberto do escopo inicial: a do fuso foi resolvida aqui (linha 1); a da etiqueta em uso, o usuário respondeu, em [Decisões do usuário](#decisões-do-usuário), junto com o lugar da gestão das etiquetas.

| # | Decisão | Motivo |
| --- | --- | --- |
| 1 | As datas civis (hoje, atraso, janela de 14 dias) valem no fuso do dono. Ele fica em `auth_owner.time_zone`, recebe o fuso do navegador na primeira carga em que está vazio e muda no Perfil com "Usar o fuso deste aparelho". Até lá, vale UTC. O servidor injeta `timeZone()` no workspace, e a web usa o mesmo fuso | O MCP não tem aparelho e precisa de um fuso no servidor. As contagens do seletor, da lateral e do quadro vêm do servidor e precisam concordar com o card na tela. Um fuso só evita que "1 atrasada" e o card discordem perto da meia-noite |
| 2 | O título e a descrição formam o texto da tarefa: salvam juntos por `saveTaskText`, com `text_version` próprio, autosave e rascunho. Coluna, prazo, etiquetas e projeto continuam em `updateTask`, com `version` e a revisão do quadro | A descrição precisa de versão própria (escopo inicial). Pôr o título junto faz digitar o título nunca conflitar com uma mudança de campo vinda de outro aparelho, e dá ao título o mesmo rascunho recuperável de um documento. A coluna `description_version` do escopo inicial vira `text_version` |
| 3 | As colunas são excluídas logicamente (`deleted_at`) e restauradas por `restoreColumn`, com a lista de tarefas movidas na resposta de `deleteColumn`. Trocar a coluna de conclusão devolve as datas de conclusão anteriores para o Desfazer | É o padrão da etapa 09 ([Desfazer](09-pastas.md#desfazer)): o servidor confere cada tarefa e pula o que mudou. Cada intenção tem um `requestId`, a resposta perdida é reenviada uma vez (`onceMoreIfLost`) e uma mudança mais nova da mesma tarefa tira o Desfazer do toast anterior (`lib/item-changes.ts`) |
| 4 | Toda tarefa, viva ou na lixeira, aponta para uma coluna ativa. Excluir uma coluna move também as tarefas da lixeira para o destino | Restaurar uma tarefa nunca cai numa coluna excluída, e não é preciso uma regra de "voltou para outra coluna", como a raiz das pastas |
| 5 | `completed_at` existe exatamente quando a tarefa está na coluna de conclusão. Um gatilho garante isso. Entrar nela grava agora; sair apaga; trocar a coluna de conclusão grava agora nas tarefas da nova e apaga nas da antiga, sem mudar versão nem data de edição | É a regra do produto ("entrar nela grava a data de conclusão; sair dela a apaga"). Trocar a coluna de conclusão é uma mudança do quadro, como a renumeração das vizinhas em `moveTask`, e não uma edição de cada tarefa |
| 6 | Há sempre uma coluna de conclusão e pelo menos uma coluna aberta. A coluna de conclusão não é excluída ("Marque outra coluna como conclusão antes."). O limite é de 20 colunas ativas | O protótipo recusa excluir a de conclusão. Concluir e Reabrir precisam das duas. Com 20 colunas, a posição cabe nos 2 dígitos do cursor `t~…` do MCP e o quadro continua navegável |
| 7 | Nomes de coluna e de etiqueta passam pelas regras de nome das pastas (`visibleText` e chave sem caixa, acentos nem formas de compatibilidade), movidas para `domain/names.ts`. As colunas ativas têm nome único; as etiquetas também, pela mesma chave. Comprimento: coluna de 1 a 60 caracteres, etiqueta de 1 a 30. Caractere de controle dá `VALIDATION` | São nomes curtos que o MCP e os menus mostram e que `list_tasks` aceita como filtro: dois "Revisão" ou "mcp" e "MCP" seriam ambíguos. A etapa 09 já pagou o custo de acertar essas regras, que agora valem para os três nomes |
| 8 | A descrição usa o mesmo validador e os mesmos limites do documento (`readDocumentContent`: 1 MiB e 5.000 blocos), com o mesmo esquema de blocos, sem os incorporados. O progresso do checklist (`checklist_done`, `checklist_total`) e o texto (`description_plain_text`, `search_text`) são derivados no servidor a cada gravação | O quadro mostra o progresso de todos os cards sem baixar as descrições. O MCP lê a descrição pelo serializador do domínio, igual ao dos documentos |
| 9 | O `search_text` das tarefas é título e descrição normalizados, como nos documentos. A busca de tarefas passa ao SQL (`instr`) com o trecho, e a migração calcula a coluna com uma função SQL registrada pelo módulo (`workspace_search_text`, o `searchText` do domínio) | Sem coluna guardada, buscar na descrição exigiria ler o texto de todas as tarefas a cada tecla do ⌘K. O SQLite não tira acentos sozinho, e a função faz a migração dar o mesmo texto que uma gravação daria |
| 10 | O quadro é um widget composto com uma parada de Tab: o card ativo tem `tabIndex=0`, e as setas andam entre cards e colunas, como no protótipo (`boardKeys`). O arrastar continua no HTML nativo, com o alvo calculado por uma função pura (`board-drop.ts`) | O `GridList` do React Aria faria cada coluna ter a sua parada e não anda entre listas com ←/→. O arrastar entre colunas já funciona assim desde a etapa 08, e a função pura repete o que deu certo no `dropSpotAt` da etapa 09 |
| 11 | A gaveta fica no shell (`AppLayout`), fora das páginas, com a tarefa aberta no estado do shell e não no endereço. `?tarefa=<id>` em qualquer página do projeto abre a gaveta uma vez e sai do endereço. A altura fica no dispositivo; a tarefa aberta não volta depois de recarregar, e o rascunho, sim | Montada fora da página, a gaveta e o editor da descrição sobrevivem à navegação sem remontar, que é o que pastas.md e o refino pedem. Pôr a tarefa em todo endereço complicaria as rotas e a última localização |
| 12 | ⌘↵ na gaveta conclui ou reabre (ou cria, numa tarefa nova) de qualquer lugar dela, inclusive a descrição, exceto dentro de um bloco de código, em que o Tiptap usa ⌘↵ para sair do bloco (`exitCode`) | É o atalho do protótipo, e a única colisão real no editor é essa |
| 13 | Concluir põe a tarefa no topo da coluna de conclusão; Reabrir, no fim da primeira coluna aberta. Qualquer outra mudança de coluna pela gaveta ou pelo menu põe no fim da coluna | É o que o protótipo faz (`toggleDone`, `moveTaskTo`). A conclusão mais recente fica à vista na coluna de 14 dias |
| 14 | O Desfazer de Concluir, Reabrir e mudar de projeto devolve a tarefa à coluna e ao lugar de antes, por `moveTask` com a vizinha que estava depois dela. Sem `expectedRevision`, o lugar é conferido pela vizinha: se ela saiu da coluna, a tarefa vai ao fim | O quadro muda o tempo todo (a revisão é global), e exigir a mesma revisão anularia quase todo Desfazer. A versão da tarefa continua guardando a mudança dela |
| 15 | A revisão do quadro sobe só com o que muda a ordem: criar, mover, mudar de coluna ou de projeto, mandar para a lixeira, restaurar e excluir de vez, e criar, mover, excluir, restaurar ou trocar a conclusão de colunas. Prazo, etiquetas, título e descrição não a sobem | O cursor `t~…` do MCP e os movimentos dependem só da ordem. Hoje toda edição de tarefa sobe a revisão, o que recusaria um movimento logo depois de mudar um prazo |
| 16 | As etiquetas são excluídas logicamente, com as ligações às tarefas guardadas: o Desfazer só reativa a etiqueta. Elas aparecem em ordem alfabética (`Intl.Collator('pt-BR')`), sem ordem manual. Há até 100 etiquetas ativas e até 20 por tarefa | O Desfazer fica trivial e exato. A ordem manual do escopo inicial (`position`) não tem uso no protótipo, que mostra as etiquetas por criação; a ordem alfabética é previsível no filtro e no seletor |
| 17 | O filtro de etiquetas do quadro fica por projeto na aba (estado do shell), e não no dispositivo nem no endereço | É o que o protótipo faz. Um filtro esquecido ligado depois de recarregar esconderia tarefas |
| 18 | O card não tem mais o botão de concluir da etapa 08: o anel é decorativo, como no protótipo e na visual.md. Concluir fica no ⋯ do card, no ⌘↵ com o card em foco, na gaveta e no "Concluir" da Visão geral | Segue a anatomia aprovada. O atalho e o menu cobrem o teclado |
| 19 | Abaixo de 720 px, a gaveta ocupa a área da página inteira, com as propriedades acima da descrição e sem a alça; o quadro rola as colunas na horizontal e move os cards pelo ⋯ | O fallback de celular continua funcional, como nas etapas 08 e 09 |
| 20 | Os testes da migração usam bancos reais da etapa 09: dumps SQL do `seed:sample` e do `--grande` gerados por `main` em `1da6617` e versionados em `src/workspace/testing/fixtures/`. A validação ensaia também a atualização de um banco criado pelo código da etapa 09 | Um banco de verdade traz o que os testes montados à mão esquecem: registros de pedido, prévias, origens e posições esparsas. Um dump em texto é revisável e não depende de o código antigo continuar rodando |

## Dados

### Executor de migrações (`src/core/infra/migrate.ts`)

Hoje o executor aplica todas as migrações pendentes numa só transação, com `foreign_keys=ON`. Dentro de uma transação, `PRAGMA foreign_keys` não tem efeito, e `DROP TABLE` numa tabela referenciada apagaria ou recusaria as linhas que apontam para ela. Por isso a reconstrução de `workspace_tasks`, que `workspace_task_sources` referencia, precisa do procedimento de 12 passos do SQLite:

1. **Diretiva:** uma migração que precisa das chaves desligadas começa com a linha `-- migrate: foreign_keys off`. A linha faz parte do arquivo e do checksum.
2. **Antes da transação:** se alguma migração pendente tem a diretiva, o executor roda `PRAGMA foreign_keys = OFF` na conexão, fora de transação, e confere que o valor ficou 0.
3. **Na transação de sempre:** as migrações rodam em `BEGIN IMMEDIATE`.
4. **Conferência:** antes do `COMMIT`, o executor roda `PRAGMA foreign_key_check`. Qualquer linha aborta a transação, com a tabela, o `rowid` e a tabela referenciada na mensagem, e nada fica aplicado.
5. **Depois:** num `finally`, o executor roda `PRAGMA foreign_keys = ON` e confere que o valor voltou a 1. Se não voltar, ele lança um erro e o servidor não sobe.
6. **Funções SQL:** `ModuleDefinition` ganha `sqlFunctions?: Record<string, (value: string) => string>`. O executor as registra na conexão (`database.function(name, { deterministic: true }, fn)`) antes de rodar as migrações, e elas ficam registradas. O workspace declara `workspace_search_text`. O `core` não conhece a função, só o mecanismo.

Uma migração sem a diretiva roda como hoje, com as chaves ligadas. A conexão é uma só, e o servidor só atende depois das migrações, então nenhuma escrita do aplicativo passa com as chaves desligadas.

### Migração `src/workspace/infra/migrations/007_board.sql`

A última do workspace em `main` é a 006, e esta é a 007. Começa com `-- migrate: foreign_keys off` e roda inteira na transação do executor.

1. **Colunas:**

   ```sql
   CREATE TABLE workspace_columns (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
     name_key TEXT NOT NULL CHECK (length(name_key) > 0),
     position INTEGER NOT NULL CHECK (position >= 0),
     is_done INTEGER NOT NULL CHECK (is_done IN (0, 1)),
     version INTEGER NOT NULL CHECK (version > 0),
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     deleted_at TEXT
   );
   CREATE UNIQUE INDEX workspace_columns_active_name ON workspace_columns(name_key) WHERE deleted_at IS NULL;
   CREATE INDEX workspace_columns_order ON workspace_columns(deleted_at, position);
   ```

   - **Colunas iniciais:** três, com IDs fixos (UUID v4 válidos): A fazer (`…000010`), Em andamento (`…000011`) e Concluído (`…000012`, `is_done = 1`), nas posições 0, 1 e 2.
   - **Instalação nova:** recebe as mesmas três. Depois da migração, são colunas comuns, e nenhuma regra do código depende desses IDs.
   - **Nomes:** `name_key` já vem calculado no SQL ("a fazer", "em andamento", "concluido").

2. **Tarefas, reconstruídas** (passos 4 a 8 do procedimento):

   ```sql
   CREATE TABLE workspace_tasks_new (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL REFERENCES workspace_projects(id),
     column_id TEXT NOT NULL REFERENCES workspace_columns(id),
     title TEXT NOT NULL,
     position INTEGER NOT NULL CHECK (position >= 0),
     due_on TEXT CHECK (due_on IS NULL OR (length(due_on) = 10 AND date(due_on) IS due_on)),
     completed_at TEXT,
     description TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(description)),
     description_plain_text TEXT NOT NULL DEFAULT '',
     search_text TEXT NOT NULL,
     checklist_done INTEGER NOT NULL DEFAULT 0 CHECK (checklist_done >= 0),
     checklist_total INTEGER NOT NULL DEFAULT 0 CHECK (checklist_total >= checklist_done),
     version INTEGER NOT NULL CHECK (version > 0),
     text_version INTEGER NOT NULL CHECK (text_version > 0),
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     deleted_at TEXT
   );
   INSERT INTO workspace_tasks_new (…)
   SELECT id, project_id,
          CASE status WHEN 'todo' THEN '…000010' WHEN 'doing' THEN '…000011' ELSE '…000012' END,
          title, position, NULL,
          CASE WHEN status = 'done' THEN updated_at END,
          '[]', '', workspace_search_text(title || char(10)), 0, 0,
          version, 1, created_at, updated_at, deleted_at
   FROM workspace_tasks;
   DROP TABLE workspace_tasks;
   ALTER TABLE workspace_tasks_new RENAME TO workspace_tasks;
   ```

   **O que fica e o que muda:**

   - **Dados:** `version`, `position`, as datas e a lixeira ficam como estão. `completed_at` de uma tarefa já concluída é o `updated_at` dela, a melhor aproximação que existe; as concluídas há mais de 14 dias vão para a página Concluídas.
   - **Gatilhos da 005:** os de projeto obrigatório em tarefas caem com a tabela, porque `project_id` agora é `NOT NULL`.
   - **Origens:** `workspace_task_sources` não é tocada. A chave dela aponta, pelo nome, para a tabela renomeada, e o `foreign_key_check` do executor confere isso.
   - **Índices novos:**
     - `workspace_tasks_board` em `(project_id, column_id, deleted_at, position)`;
     - `workspace_tasks_project` em `(project_id)`;
     - `workspace_tasks_done`, parcial, em `(project_id, completed_at)` com `completed_at IS NOT NULL AND deleted_at IS NULL`;
     - `workspace_tasks_due`, parcial, em `(project_id, due_on)` com `due_on IS NOT NULL AND deleted_at IS NULL`.

3. **Etiquetas:**

   ```sql
   CREATE TABLE workspace_labels (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 30),
     name_key TEXT NOT NULL CHECK (length(name_key) > 0),
     color TEXT NOT NULL CHECK (color IN ('blue', 'slate', 'purple', 'teal', 'amber', 'coral', 'lime')),
     version INTEGER NOT NULL CHECK (version > 0),
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     deleted_at TEXT
   );
   CREATE UNIQUE INDEX workspace_labels_active_name ON workspace_labels(name_key) WHERE deleted_at IS NULL;
   CREATE TABLE workspace_task_labels (
     task_id TEXT NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
     label_id TEXT NOT NULL REFERENCES workspace_labels(id),
     PRIMARY KEY (task_id, label_id)
   ) WITHOUT ROWID;
   CREATE INDEX workspace_task_labels_label ON workspace_task_labels(label_id);
   ```

   - **Ligações e exclusão:** a ligação a uma etiqueta excluída fica guardada e não aparece em leitura nenhuma (decisão 16).
   - **Sem `ON DELETE` em `label_id`:** etiquetas nunca são apagadas de vez, e a chave recusa quem tentar.
   - **As cores** são as sete chaves de `--label-<cor>`, já geradas na etapa 08.

4. **Gatilhos:**

   | Gatilho | Recusa (`RAISE(ABORT, …)`) |
   | --- | --- |
   | `workspace_tasks_column_on_insert` e `…_on_update` (`BEFORE INSERT`, `BEFORE UPDATE OF column_id`) | Coluna inexistente ou excluída |
   | `workspace_tasks_completion_on_insert` e `…_on_update` (`BEFORE INSERT`, `BEFORE UPDATE OF column_id, completed_at`) | `completed_at` nulo numa coluna de conclusão, ou preenchido em outra |
   | `workspace_columns_empty_on_delete` (`BEFORE UPDATE OF deleted_at`, quando deixa de ser nulo) | Excluir uma coluna com qualquer tarefa, viva ou na lixeira, ou a coluna de conclusão |
   | `workspace_columns_done_on_insert` (`BEFORE INSERT`) e `workspace_columns_done_on_restore` (`BEFORE UPDATE OF deleted_at`, quando volta a nulo) | Uma segunda coluna de conclusão ativa, inserida ou reativada |
   | `workspace_columns_done_only_active` (`BEFORE UPDATE OF is_done`, de 0 para 1) | Marcar como de conclusão uma coluna excluída |
   | `workspace_columns_done_handover` (`AFTER UPDATE OF is_done`, de 0 para 1) | Não recusa: passa o papel. A antiga deixa de ser de conclusão, as tarefas dela perdem `completed_at`, e as da nova o ganham na nova `updated_at` da coluna, ou na hora atual se a escrita não a muda |
   | `workspace_columns_done_kept` (`AFTER UPDATE OF is_done`, de 1 para 0) | Tirar a conclusão sem que outra a tenha recebido ("make another column the done one") |
   | `workspace_folders_id_in_use`, `workspace_columns_id_in_use` e `workspace_labels_id_in_use` (`BEFORE INSERT`) | Inserir com um `id` para o qual documentos, desenhos, tarefas ou ligações já apontam (`RAISE(ABORT, '<tabela>.id is in use')`) |

   Os gatilhos de `is_done` vieram da revisão de dados de B1–B4: sem eles, SQL manual deixava o quadro sem coluna de conclusão ou com conclusões fora dela. Um índice único parcial não permitiria a passagem, que grava a nova coluna de conclusão antes de limpar a antiga, então os gatilhos o substituem, e `setDoneColumn` faz uma só escrita.

   Os três de `id_in_use` fecham o `INSERT OR REPLACE`, que só SQL manual faz: o `REPLACE` apaga e reinsere a linha sem rodar os gatilhos de `UPDATE`, e a chave estrangeira só é conferida no fim do comando. Um `BEFORE INSERT` roda antes do `DELETE` implícito, e uma inserção legítima nunca tem nada apontando para um `id` novo. É a pendência da [etapa 09](09-pastas.md#desvios-do-plano).

   Os gatilhos de tarefa rodam a cada escrita de campo. Cada um é uma busca pela chave primária de `workspace_columns`, conferida por `EXPLAIN QUERY PLAN` como na etapa 09. O texto (`saveTaskText`) não toca em `column_id` nem `completed_at`, então não os dispara.

5. **Revisão do quadro:** `board_revision` sobe 1. Todo cursor `t~…` emitido antes é recusado ("O quadro mudou desde a primeira página. Liste de novo sem cursor.").

**O que não muda e por quê:**

- **`core_mutations`:** as respostas guardadas das escritas de tarefa são `{ id, projectId, version, updatedAt, revision }` (ou `{ id, revision }` na exclusão), sem `status`, desde a etapa 08. Uma repetição depois da migração devolve uma resposta que ainda vale.
- **Pedido antigo repetido:** um pedido antigo repetido com `status` não chega ao registro de pedidos: o esquema novo pede `columnId` e responde `VALIDATION`. É o caso aceito da etapa 08 para uma aba aberta durante a implantação. A tarefa não tem rascunho de campo, então nada se perde.
- **Cursores `s~…` da busca:** continuam aceitos. Uma tarefa que só tem as palavras na descrição passa a ter `titleRank` maior que 0. Uma página aberta antes da implantação pode mudar de ordem, sem repetir nem pular itens.
- **Cursores de documento:** `<impressão>:<deslocamento>` não muda.

### Migração `src/auth/infra/migrations/003_owner_time_zone.sql`

`ALTER TABLE auth_owner ADD COLUMN time_zone TEXT CHECK (time_zone IS NULL OR length(time_zone) BETWEEN 1 AND 64)`.

- **Nulo até a primeira carga:** a web grava o fuso do navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`) com `auth.setTimeZone`.
- **Validação:** o servidor só aceita um fuso que `Intl.DateTimeFormat` reconhece.
- **`Owner`** (`core/application`) ganha `timeZone: string | null`.

### Regras

**Colunas:**

- **Nome:** `displayName` e `nameKey` (`domain/names.ts`), únicos entre as ativas, de 1 a 60 caracteres. Repetido: `DOMAIN_RULE` "Já existe uma coluna Revisão.". Vazio: `VALIDATION` "Dê um nome à coluna.".
- **Ordem:** manual, de 0 a n − 1 entre as ativas, com a revisão subindo a cada mudança.
  - Uma coluna nova entra antes da de conclusão quando ela é a última, e no fim nos outros casos, como no protótipo (`addColumn`).
  - Reordenar não muda a versão da coluna.
- **Versão:** sobe ao renomear, excluir e restaurar. `setDoneColumn` não muda a versão.
- **Limites:** 20 ativas (`DOMAIN_RULE` "Máximo de 20 colunas."), uma de conclusão e pelo menos uma aberta (`DOMAIN_RULE` "O quadro precisa de pelo menos uma coluna além da de conclusão.").
- **Excluir:** move todas as tarefas da coluna, vivas e na lixeira, de todos os projetos, para o destino.
  - O destino é outra coluna ativa. Coluna vazia não precisa de destino.
  - Cada tarefa vai ao fim da coluna de destino do seu projeto, na ordem em que estava.
  - A versão de cada tarefa sobe; `updated_at` fica, porque a pessoa não editou a tarefa.
  - Com destino na coluna de conclusão, `completed_at` passa a ser agora.
  - A coluna guarda a última posição, para o Desfazer.
- **Restaurar:** reativa a coluna na posição guardada (limitada ao fim) e devolve as tarefas listadas que continuam no destino com a versão da resposta. Elas voltam na ordem de antes, com `completed_at` de antes e a versão + 1. As outras são puladas e contadas.
- **Trocar a coluna de conclusão** (`setDoneColumn`), numa transação:
  1. limpa `is_done` da antiga;
  2. marca a nova;
  3. grava `completed_at = agora` nas tarefas da nova e `NULL` nas da antiga, sem mudar versão nem `updated_at`;
  4. sobe a revisão.

  A resposta lista as tarefas da antiga com a data que tinham (até 1.000). O Desfazer chama `setDoneColumn` de volta com essa lista: as tarefas listadas que continuam na coluna recuperam a data.
- **Projeto arquivado:** colunas são de todos os projetos, então não dependem dele. O quadro de um projeto arquivado só não mostra as ações de coluna (ver Interface).

**Tarefas:**

- **Criar:** `columnId` é opcional; o padrão é a primeira coluna aberta.
  - Entra no fim da coluna do projeto, ou no topo, se for a de conclusão, já com `completed_at`.
  - Aceita `dueOn`, `labelIds` e, para "Salvar como cópia", `description`.
  - `text_version` começa em 1.
- **Campos** (`updateTask`, com `expectedVersion`):
  - **Coluna:** segue a decisão 13.
  - **Projeto:** precisa estar ativo; a tarefa vai ao fim da mesma coluna no projeto novo.
  - **Prazo:** `dueOn` é `AAAA-MM-DD` válido, ou `null`.
  - **Etiquetas:** `labelIds` substitui o conjunto, até 20 ativas. Uma etiqueta excluída ou inexistente dá `NOT_FOUND` "A etiqueta não está disponível.".
  - A versão sobe e `updated_at` passa a ser agora. A revisão só sobe com coluna ou projeto (decisão 15).
- **Texto** (`saveTaskText`, com `expectedTextVersion`):
  - O título passa por `visibleText`. Vazio vira "Sem título", como num documento.
  - A descrição passa por `readDocumentContent` e `withBlockIds`. Vêm junto o texto, `search_text` (`searchText(título + "\n" + texto)`) e o checklist (`checklistProgress`).
  - `text_version` sobe e `updated_at` passa a ser agora. A versão dos campos e a revisão ficam.
  - Gravar numa tarefa na lixeira é recusado, como num documento.
- **Mover** (`moveTask`):
  - **Pelo quadro:** como hoje, com `columnId` no lugar de `status`, `expectedVersion` e `expectedRevision`. Entrar na coluna de conclusão ou sair dela segue a decisão 5.
  - **Sem `expectedRevision`:** só para o Desfazer (decisão 14). O lugar é dado por `beforeTaskId`; se essa tarefa não está mais naquela coluna do projeto, a tarefa vai ao fim.
- **Gravações separadas:** os campos e o texto são escritos por métodos de repositório diferentes, cada um com o seu `WHERE` de versão e só as próprias colunas (`saveTaskFields`, `saveTaskText`). Assim um não sobrescreve o outro.
- **Posições:** `nextPosition(projectId, columnId)` e `topPosition` contam no projeto. Entrar no topo renumera a coluna do projeto, como `moveTask` já faz.
- **Atraso:** `isOverdue(dueOn, today, inDoneColumn)` é `dueOn < today` fora da coluna de conclusão. Vencer hoje não é atraso.
- **Janela de 14 dias:** concluídas desde o início de `today − 13` no fuso do dono (`doneWindowStart`), ou seja, 14 dias civis com o de hoje. O protótipo conta a partir de `today − 14`; a diferença fica registrada.

**Etiquetas:**

- **Nome:** como as colunas, de 1 a 30 caracteres. Repetido: `DOMAIN_RULE` "Já existe uma etiqueta mcp.".
- **Cor:** uma das sete chaves. A etiqueta nova recebe a primeira cor não usada pelas ativas, ou volta à primeira (`nextLabelColor`).
- **Limite:** 100 ativas ("Máximo de 100 etiquetas.").
- **Excluir:** lógico. As ligações ficam, e a etiqueta some de toda leitura, inclusive do MCP. A resposta conta as tarefas que a usavam. O Desfazer reativa (`restoreLabel`), salvo se outra ativa tomou o nome.
- **Uso:** etiquetas são de todos os projetos; criar uma não depende do projeto atual.

**Lixeira e exclusão definitiva:**

- **Mandar para a lixeira** mantém coluna, prazo, etiquetas, descrição e `completed_at`.
- **Restaurar** devolve a tarefa ao fim da coluna dela, que existe sempre (decisão 4), com `completed_at` intacto.
- **Excluir de vez** apaga a linha. As ligações de etiqueta e a origem caem em cascata, e a revisão sobe.

## Desfazer

Segue o [Desfazer da etapa 09](09-pastas.md#desfazer) sem mudanças no mecanismo: o inverso vem na resposta da escrita, o cliente o devolve a um procedimento que confere cada tarefa e pula o que mudou, e o toast oferece "Desfazer" e o ⌘Z enquanto está na tela.

| Ação | Toast | O Desfazer chama | Pula |
| --- | --- | --- | --- |
| Excluir coluna vazia | "Coluna excluída." | `restoreColumn` com a lista vazia | Nome tomado por outra ativa: recusa inteira, com a mensagem do servidor |
| Excluir coluna com tarefas | "Coluna excluída. 3 tarefas foram para A fazer." | `restoreColumn` com `moved` | Tarefa que mudou de versão ou saiu do destino |
| Trocar a coluna de conclusão | "Revisão agora é a coluna de conclusão." | `setDoneColumn` da anterior, com `restore` | Tarefa que saiu da coluna |
| Concluir, Reabrir | "Concluída: <título>." e "Reaberta em A fazer." | `moveTask` à coluna e à vizinha de antes (decisão 14) | Versão diferente: "A tarefa mudou depois; nada foi desfeito." |
| Mudar de projeto | "A tarefa foi para Reforma do escritório." | `updateTask` com o projeto de antes, e `moveTask` ao lugar de antes | Igual |
| Excluir etiqueta | "Etiqueta mcp excluída. Estava em 4 tarefas." | `restoreLabel` | Nome tomado: recusa |

**Regras do cliente, aprendidas na etapa 09:**

- **Um `requestId` por intenção:** um clique, uma tecla ou um Desfazer guardam o seu, e a repetição de uma resposta perdida vai uma vez com o mesmo (`onceMoreIfLost`).
- **Desfazer por mudança:** cada toast tem o seu ID, registrado em `lib/item-changes.ts` com a chave `task:<id>` ou `column:<id>`. Uma mudança mais nova do mesmo objeto retira o Desfazer do toast anterior, e um Desfazer que chega depois diz "Mudou depois; nada foi desfeito.".
- **Fila:** as escritas passam uma de cada vez pela fila (`lib/write-queue.ts`), e um Desfazer espera a escrita em curso.
- **Limite:** como nas pastas, uma coluna com mais de 1.000 tarefas, ou uma troca de conclusão que afeta mais de 1.000, sai sem "Desfazer" (`complete: false`).

## Contratos RPC

**Compatibilidade transitória:** até a entrega B6, os contratos de tarefa aceitam também o que a web da etapa 09 envia:

- `status` em `createTask`, `updateTask` e `moveTask`, mapeado para a coluna inicial correspondente pelo nome-chave ("a fazer", "em andamento") ou para a de conclusão;
- `title` em `updateTask`;
- `listTasks` respondendo `status`, derivado do mesmo modo.

Assim cada entrega do backend fica verde com a interface antiga. B6 remove a tolerância.

**Aceito na transição:** até B6, o `title` de `updateTask` grava o texto com o `textVersion` lido na própria transação. Uma aba antiga, aberta antes da implantação e com a `version` de campos ainda atual, renomeia por cima do título que a gaveta já salvou por `saveTaskText`, sem `VERSION_CONFLICT`. A descrição fica, e a próxima gravação da gaveta recebe conflito e guarda o rascunho, mas o título salvo antes se perde. É a revisão de dados de B1–B4 (B5); fica aceito porque B6 tira `title` de `updateTask`.

**Alterados:**

| Procedimento | Mudança |
| --- | --- |
| `Task` (resumo, em listas) | Sai `status`. Entram `columnId`, `textVersion`, `dueOn`, `completedAt`, `labelIds` e `checklist: { done, total } \| null` |
| `listTasks` | `{ projectId?, documentId? }` como hoje, com o `Task` novo. Continua para o painel de tarefas do documento e a Lixeira; o quadro passa a usar `projectBoard` |
| `createTask` | `{ requestId, title, projectId?, columnId?, dueOn?, labelIds?, description?, source? }` → `TaskAck` |
| `updateTask` | `{ requestId, id, expectedVersion, columnId?, projectId?, dueOn?: string \| null, labelIds? }` → `TaskAck`. Sem `title` depois de B6 |
| `moveTask` | `{ requestId, id, expectedVersion, columnId, beforeTaskId?: uuid \| null, expectedRevision? }` → `TaskAck` |
| `restoreTask`, `deleteTask`, `purgeTask` | Como hoje. A revisão sobe nas três |
| `listProjects` | Cada projeto ativo ganha `overdueTasks`, que o seletor mostra |
| `projectNavigation` | Ganha `overdueTasks`. `openTasks` passa a contar as tarefas fora da coluna de conclusão |
| `projectOverview` | `now` vira a lista "Agora" (abaixo); `rest` vira `[{ columnId, count, withoutDue, only: { title, dueOn } \| null }]`; entram `done: Task[]` (até 8, da janela de 14 dias), `doneTotal`, `overdueTasks` e `today` |
| `search` (RPC e MCP) | Tarefas ganham `excerpt` e `column: { id, name, isDone }` no lugar de `status` |

`TaskAck` continua `{ id, projectId, version, updatedAt, revision }`, sem título, trecho nem descrição, pela regra das respostas compactas da etapa 08.

**"Agora"** (`overviewTasks`, puro no domínio, regra do protótipo `agoraTasks`), até 6 tarefas, nesta ordem:

1. as atrasadas, por prazo;
2. as das colunas abertas que não são a primeira, na ordem do quadro;
3. as da primeira coluna aberta com prazo nos próximos 14 dias, por prazo.

O que fica de fora é resumido por coluna: "Mais 3 em A fazer sem prazo." ou, com uma só, "Mais 1 em A fazer: Renovar domínio, 15 nov.".

**Novos:**

| Procedimento | Entrada | Saída | Erros |
| --- | --- | --- | --- |
| `getTask` | `{ id }` | `Task & { description: DocumentContent, deletedAt }`. Também lê da lixeira, como `getDocument`, para a gaveta recuperar um rascunho | `NOT_FOUND` |
| `saveTaskText` | `{ requestId, id, expectedTextVersion, title, description }` | `{ id, textVersion, updatedAt }` | `NOT_FOUND` (inexistente ou na lixeira), `VERSION_CONFLICT`, `VALIDATION` (descrição inválida ou acima do limite) |
| `projectBoard` | `{ projectId }` | `{ revision, today, doneSince, tasks: Task[], olderDone }`: as abertas e as concluídas desde `doneSince`; `olderDone` conta as concluídas antes | `NOT_FOUND` |
| `listCompletedTasks` | `{ projectId, cursor?, limit?: 1–100 (50) }` | `{ items: Task[], total, nextCursor }`, por `completed_at` decrescente, com o cursor `c~<completedAt>~<id>` | `NOT_FOUND`, `VALIDATION` (cursor) |
| `listColumns` | `{}` | `{ revision, columns: [{ id, name, position, isDone, version, taskCount }] }`. `taskCount` conta as tarefas vivas de todos os projetos | — |
| `createColumn` | `{ requestId, name }` | `{ id, version, position, revision }` | `VALIDATION`, `DOMAIN_RULE` (nome, limite) |
| `renameColumn` | `{ requestId, id, expectedVersion, name }` | `{ id, version }` | `NOT_FOUND`, `VERSION_CONFLICT`, `VALIDATION`, `DOMAIN_RULE` |
| `moveColumn` | `{ requestId, id, beforeColumnId: uuid \| null }` | `{ revision, columns: [{ id, position }] }` | `NOT_FOUND`, `VALIDATION` ("Escolha outra coluna como referência.") |
| `deleteColumn` | `{ requestId, id, expectedVersion, destinationId?: uuid }` | `{ id, version, revision, moved: [{ id, version, position, completedAt }], complete }`. `position` e `completedAt` são os de antes; `version`, a nova | `NOT_FOUND`, `VERSION_CONFLICT`, `VALIDATION` (destino ausente com tarefas, destino igual ou excluído), `DOMAIN_RULE` (coluna de conclusão, última aberta) |
| `restoreColumn` | `{ requestId, id, expectedVersion, moved: […] (até 1.000) }` | `{ id, version, position, revision, restored, skipped }` | `NOT_FOUND`, `VERSION_CONFLICT`, `DOMAIN_RULE` ("Esta coluna não foi excluída.", nome tomado, limite) |
| `setDoneColumn` | `{ requestId, id, restore?: [{ id, completedAt }] (até 1.000) }` | `{ revision, previousId, left: [{ id, completedAt }], complete }` | `NOT_FOUND`, `DOMAIN_RULE` (já é a de conclusão) |
| `listLabels` | `{}` | `{ labels: [{ id, name, color, version, taskCount }] }`, em ordem alfabética. `taskCount` conta as tarefas vivas | — |
| `createLabel` | `{ requestId, name, color? }` | `{ id, version, color }` | `VALIDATION`, `DOMAIN_RULE` (nome, limite) |
| `updateLabel` | `{ requestId, id, expectedVersion, name?, color? }` | `{ id, version }` | `NOT_FOUND`, `VERSION_CONFLICT`, `VALIDATION`, `DOMAIN_RULE` |
| `deleteLabel` | `{ requestId, id, expectedVersion }` | `{ id, version, tasks }`. `tasks` conta as tarefas vivas que a usavam | `NOT_FOUND`, `VERSION_CONFLICT` |
| `restoreLabel` | `{ requestId, id, expectedVersion }` | `{ id, version }` | `NOT_FOUND`, `VERSION_CONFLICT`, `DOMAIN_RULE` (não excluída, nome tomado, limite) |
| `auth.setTimeZone` | `{ timeZone }` | `{ timeZone }`. Repetível, sem `requestId` | `VALIDATION` ("Fuso horário desconhecido.") |

**Testes de servidor:** o teste que chama todos os procedimentos sem sessão (`src/server/server.db.test.ts`) cobre os novos.

**Invalidação no cliente:** colunas e etiquetas invalidam `['workspace', 'columns']`, `['workspace', 'labels']`, o quadro e a Visão geral. As escritas de tarefa invalidam o quadro, a Visão geral, a navegação (contagens) e a busca. O autosave do texto atualiza o card no cache do quadro (título e checklist), sem baixar o quadro de novo.

## MCP

Sem ferramentas novas. As mudanças partem do modelo de leitura de `main`.

| Ferramenta ou peça | Mudança |
| --- | --- |
| `list_tasks`: entrada | Sai `status`. Entram `columns?: string[]` (nomes, até 20; vale qualquer uma) e `labels?: string[]` (nomes, até 10; todas exigidas), comparados pela chave do nome. Um nome desconhecido dá `NOT_FOUND` com os nomes que existem: "Coluna não encontrada: Revisao. Colunas: A fazer, Em andamento, Revisão, Concluído." |
| `list_tasks`: saída | Cada tarefa traz `column: { id, name, isDone }`, `dueOn`, `overdue`, `labels: [{ id, name, color }]`, `checklist: { done, total } \| null` e `completedAt`, no lugar de `status` e `statusLabel`. A ordem é a do quadro, pela posição da coluna. O cursor continua `t~<revisão>~<coluna>~<posição>~<id>`, com a posição da coluna (de 0 a 19) no lugar do índice de `TASK_STATUSES`; mover, excluir ou restaurar coluna sobe a revisão e recusa os cursores antigos |
| `list_tasks`: descrição | A ordem é a das colunas configuradas, com a lista delas; os filtros são pelos nomes vistos no Tinyfold; `overdue` usa o fuso do dono |
| `read_task` | Passa de JSON a Markdown, como `read_document`.<br>• **Cabeçalho:** `# título`, depois as linhas `- Projeto`, `- Coluna` (com "conclusão"), `- Prazo` (com "atrasada desde …"), `- Etiquetas`, `- Checklist: 2 de 5`, `- Concluída em`, `- Origem` (documento, bloco e trecho entre aspas, cortado para caber), `- Atualizada · versão` e `- ID`.<br>• **Corpo:** a descrição por `documentToMarkdown`.<br>• **Páginas:** de 36.000 caracteres, com o cursor `<impressão>:<deslocamento>` preso ao texto (`pageMarkdown`). A primeira página reserva 9.000 para cabeçalho e rodapé. A entrada ganha `cursor?`.<br>• **Descrição vazia:** "- Descrição: vazia" |
| `search` | As tarefas são buscadas no título e na descrição pelo `search_text` (decisão 9), com o mesmo `titleRank` dos documentos. Elas ganham `excerpt` e `column` no lugar de `status`. Com `folderId`, continuam de fora |
| Limites | `READING_LIMITS.task = { pageChars: 36_000, headerChars: 9_000 }`. O cabeçalho corta etiquetas e trecho com "… e mais n etiquetas" e reticências antes de passar do orçamento |
| Instruções do servidor | Sem mudança |

**Teto de 45.000 caracteres:** o teste "keeps every text result within the output ceiling, by its own budget" (`infra/mcp/tools.db.test.ts`) ganha:

- 20 colunas com nomes pesados (60 caracteres de `"\\\u0001`);
- 100 etiquetas com nomes pesados (30 caracteres);
- 150 tarefas com 20 etiquetas pesadas, prazo, checklist e um trecho de origem de 3.000 caracteres;
- uma descrição de 200.000 caracteres lida até a última página por `read_task`;
- `list_tasks` com filtros de coluna e etiqueta;
- `search` com termos só da descrição.

Cada resultado fica com no máximo 45.000 caracteres sem disparar `withTextCeiling`.

## Interface

### Quadro (`/projetos/$projectId/quadro`)

**Cabeçalho da página** (refino §5, crítica 8):

- **Barra:** "+ Nova tarefa" (N abre o menu Novo, como hoje) e ⋯, com Ver concluídas, Nova coluna, Gerenciar etiquetas…, Limpar filtro de etiquetas e Visão geral (G V).
- **Título:** "Quadro", sem sobretítulo.
- **Filtro:** "Etiquetas ⌄", que abre com F, num menu de marcar. Escolhidas, o botão vira "Etiquetas: mcp, backend". O menu termina com "Limpar filtro" e "Gerenciar etiquetas…".
- **Contagem:** à direita, "6 tarefas · 1 atrasada", só do que está visível, com "1 atrasada" em `--late` e `aria-live="polite"`.

**Colunas** (visual.md):

- **Largura:** flexíveis, de 208 a 280 px, a 12 px umas das outras, sem fundo. A fileira rola na horizontal quando não cabe.
- **Cabeçalho de 28 px:**
  - anel de coluna de 14 px;
  - o nome em 13/20 500, como botão: ↵ renomeia no lugar;
  - a contagem em 12 `tnum` `--text-3`;
  - no hover ou no foco, "+" (nova tarefa nesta coluna, exceto na de conclusão) e ⋯.
  - `aria-label`: "Coluna Em andamento, 2 tarefas. Enter renomeia; Shift e setas movem a coluna", com ", coluna de conclusão" quando é.
- **Anel:** `ColumnRing` passa a receber `isDone`. A de conclusão é o círculo cheio com check em `--ok`; as outras preenchem `índice ÷ (n − 1)`, até 0,85.
- **Arrastar:** a coluna sob um card arrastado ganha fundo `--hover` com raio 10.
- **"+ Nova tarefa":** 12/16 `--text-3`, visível nas colunas vazias e, nas outras, no hover ou no foco. Não aparece na de conclusão.
- **Vazio:** "Nada aqui."; com filtro, "Nenhuma tarefa com mcp.".
- **Coluna de conclusão:**
  - concluídas desde `doneSince`, com os títulos em `--text-2` e sem destaque de prazo;
  - com `olderDone > 0`, o rodapé "Mais 23 concluídas antes de 16 out →", que abre Concluídas.
- **"+ Coluna":** coluna fantasma de 120 px no fim, a 20 px da última. Cria "Nova coluna" no lugar da decisão de ordem e entra em edição, com o nome selecionado.

**Card** (visual.md, crítica 10 a 12):

- **Anatomia:** `--raised-1` (branco no claro), borda `--line`, raio 8, padding 10/12, 8 px entre cards.
  - Anel decorativo da coluna, de 14 px, à esquerda.
  - Título 13/18 500, até 3 linhas.
  - Meta 12/16 com 8 px entre itens, nesta ordem:
    1. **Prazo:** "04 nov" em `tnum` `--text-3`. Atrasado: relógio de 12 px e "28 out" em `--late` 500, com "Atrasada desde 28 out" na dica e no nome acessível.
    2. **Progresso:** anel de 12 px e "2/5"; completo, em `--ok`.
    3. **Etiquetas:** chips de 20 px, até 2, e "+n".
- **Estados:**

  | Estado | Tratamento |
  | --- | --- |
  | Hover | `--card-hover` e borda `--line-strong`; o ⋯ aparece |
  | Foco | anel de 2 px `--accent` com afastamento de 2 |
  | Aberto na gaveta | fundo `--selected` e borda `--accent-35` |
  | Arrastando | o lugar de origem vira tracejado `--line-strong`; a imagem arrastada é a do navegador |
  | Concluído | título `--text-2` e anel `--ok`, sem destaque de prazo |

- **Pendente:** o ponto de 6 px `--late` aparece no card de uma tarefa com texto não salvo nesta aba (`save-registry` com o tipo `task`).
- **⋯ do card** (também por ⇧F10 ou pela tecla Menu):
  - Abrir (↵);
  - Mover para ▸, com as colunas em rádio, Topo da coluna e Fim da coluna (M abre direto);
  - Concluir ou Reabrir (⌘↵);
  - Mover para a lixeira.
- **Clique:** clicar em qualquer ponto do card abre a gaveta. O título é o botão que leva o foco, e um `::after` cobre o card, como no protótipo.

**Projeto arquivado:** o quadro aparece sem "+ Nova tarefa", "+ Coluna", "+" e ⋯ das colunas. Os cards podem ser abertos, e a gaveta mostra os campos sem edição, com a faixa de arquivado.

**Arrastar** (`use-board-dnd.ts`, HTML nativo, só com ponteiro fino):

- **Alvo:** `boardDrop(colunas, ponto)`, em `board-drop.ts`, devolve `{ columnId, beforeTaskId }` pela metade de cima ou de baixo do card sob o ponteiro, ou o fim da coluna.
- **Indicador:** 2 px `--accent` entre os cards.
- **Soltar** chama `moveTask` com a revisão do quadro, e o card anima em 150 ms (FLIP), ou só esmaece com `prefers-reduced-motion`.
- **Esc** cancela o arrasto do sistema. O E2E confere só que nada se move, pela limitação de arrasto do Playwright vista na etapa 09.

**Teclado do quadro** (`board-keys.ts` puro e `use-board-keyboard.ts`; o foco vai por um mapa de referências dos cards, nunca por seletor CSS):

| Tecla | No card | No nome da coluna |
| --- | --- | --- |
| ↑ ↓ | Card anterior ou seguinte da coluna; ↑ no primeiro vai ao nome da coluna | ↓ vai ao primeiro card |
| ← → | Card na mesma altura da coluna vizinha com cards | Nome da coluna vizinha |
| ⇧← ⇧→ | Move o card para a coluna vizinha, na mesma posição | Move a coluna |
| ⇧↑ ⇧↓ | Move o card dentro da coluna | — |
| ↵ ou espaço | Abre a gaveta | Renomeia no lugar |
| M | Menu "Mover para" | — |
| ⌘↵ | Concluir ou Reabrir | — |
| ⇧F10 ou Menu | ⋯ do card | ⋯ da coluna |
| F | Filtro de etiquetas, de qualquer lugar do quadro fora de campos | igual |

- **Anúncios:** cada movimento por teclado anuncia "Movida para Em andamento, 2 de 3" ou "Posição 1 de 3 em A fazer". O foco fica no card movido.
- **Nas pontas:** um movimento sem destino anuncia "Não há coluna nessa direção.", "Já está no topo." ou "Já está no fim.".
- **Concorrência:** cada movimento usa a revisão do último quadro lido. Se ela mudou, o servidor recusa, o quadro recarrega e a região viva diz "O quadro mudou; tente de novo.".
- **Um movimento por vez:** um movimento em curso faz o próximo esperar (`lib/write-queue.ts`).

**Menu ⋯ da coluna:**

1. Renomear (↵ no nome);
2. Mover para a esquerda (⇧←) e Mover para a direita (⇧→), desabilitados nas pontas;
3. Marcar como conclusão, ou "É a coluna de conclusão", desabilitado;
4. separador;
5. Excluir…, em perigo. Na coluna de conclusão, fica desabilitado com a nota "Marque outra coluna como conclusão antes.".

**Renomear** (`ColumnNameField.tsx`):

- **Campo:** de 28 px no lugar do nome, com `--raised-1`, borda `--accent` e halo, como o da pasta.
- **Teclas:** ↵ ou sair do campo salva; Esc restaura. Nome vazio restaura; nome repetido mostra o erro inline "Já existe uma coluna Revisão.".
- **O campo toma as próprias teclas** (setas, Home, End, espaço, ⇧ e letras) e para a propagação. O teclado do quadro nunca age num alvo editável. Foi a alta da etapa 09.

**Excluir coluna:**

- **Vazia:** sai na hora, com o toast e Desfazer.
- **Com tarefas:** `AlertDialog` "Excluir a coluna “Revisão”?", com o texto "Há 3 tarefas nela, somando todos os projetos, porque as colunas valem para todos. Para onde elas vão?".
  - As outras colunas em `RadioGroup`, com a vizinha da esquerda escolhida e a nota "padrão: à esquerda" (ou à direita, na primeira).
  - Os botões são [Cancelar] e [Mover e excluir], em perigo. O foco inicial vai ao rádio escolhido.
  - O toast traz Desfazer. O foco vai ao nome da coluna que ficou no lugar.

**Dados:** `projectBoard`, `listColumns` e `listLabels`. O filtro de etiquetas roda no cliente sobre as tarefas do quadro.

### Gaveta da tarefa

**Moldura** (visual.md, refino §6):

- **Lugar:** região do shell (`data-region="drawer"`), abaixo da página, que ela empurra. A página encolhe e rola sozinha.
- **Superfície:** `--raised-2` no escuro e branca no claro, com os cantos de cima de raio 12, fio `--line` em cima, luz no topo e sombra para cima.
- **Abertura:** sobe 16 px em 200 ms e desce em 160 ms. Com `prefers-reduced-motion`, só esmaece.
- **Altura:**
  - 55% da área de conteúdo para começar, entre 25% e 85%, nunca menos de 320 px; fica guardada no dispositivo;
  - a alça de 32×4 px (`role="separator"`, `aria-valuenow` em %) arrasta;
  - com a alça em foco, ↑ e ↓ mudam 5%, e Home e End vão a 85% e 25%;
  - com o foco na gaveta fora do texto, ⌥↑ e ⌥↓ passam pelas alturas 35%, 55% e 80%.
- **Toast:** sobe para 12 px acima da gaveta (crítica 20).
- **Card aberto:** a página rola até deixá-lo à vista acima da gaveta.

**Cabeçalho de 52 px:**

- **Anel de 16 px:** é um botão que abre "Mover para…" (as colunas, Topo e Fim).
- **Título** 20/28 600, numa linha: ↵ leva o cursor ao começo da descrição, e Esc sai do campo.
- **À direita:**
  - **Estado:** "Salvo" em 12 `--text-3`; "Salvando…"; na falha, ícone e `--late`, "Não salvou", com o botão secundário "Tentar de novo".
  - **"Concluir"** (ou "Reabrir"): botão secundário com círculo e check e a dica "Concluir · ⌘↵".
  - **⋯:** Copiar link, Mover para ▸, separador e Mover para a lixeira.
  - **✕:** com a dica "Fechar · Esc".

**Corpo:**

- **Rolagem:** um contêiner só para as duas colunas: a descrição (1fr, até 640 px), um fio vertical `--line` de 1 px com 24 px de cada lado, e as propriedades (300 px).
- **Abaixo de 1200 px de largura da gaveta** (consulta de contêiner): as propriedades viram uma faixa de duas colunas acima da descrição, e o fio some (crítica 17).

**Propriedades:** grade de 88 px + 1fr, linhas de 30 px, rótulo 12/16 `--text-3` e valor 13/20. O valor é um botão fantasma, com hover `--hover-raised`, raio 6, padding 0 6 e margem −6.

| Linha | Valor e edição |
| --- | --- |
| Coluna | Nome e "⌄" no hover. Menu das colunas em rádio, com "conclusão" na de conclusão |
| Prazo | "qua 04 nov 2026 · em 5 dias", "· hoje", "· amanhã" ou "· há 2 dias". Atrasado: relógio e `--late`. "Sem prazo" em `--text-3`. Abre um popover com o `Calendar` do React Aria em pt-BR (semana a partir do domingo, setas, PageUp e PageDown) e os botões "Hoje" e "Sem prazo" |
| Etiquetas | Chips editáveis: hover com borda `--line-strong` e "×" (`aria-label` "Remover etiqueta mcp"). Depois deles, "+" abre o seletor: campo "Buscar ou criar etiqueta", lista filtrada pela chave e, sem nenhuma igual, "Criar mcp · nova", com a próxima cor. Remover volta o foco ao "+" |
| Projeto | Marca e nome. Menu dos projetos ativos |
| Checklist | Só com itens: barra de 64×4 px (`--accent` sobre `--line-strong`; completa em `--ok`) e "2 de 5" (`aria-label` "2 de 5 itens feitos"). Atualiza ao marcar, antes do salvamento |
| Origem | Depois de um fio, o documento em `--accent` com "↗", que abre o documento no trecho (`?bloco=`) com a gaveta aberta, e o trecho entre aspas em 12/18 `--text-2`, cortado em 3 linhas. Documento na lixeira: "Indisponível: o documento está na lixeira."; excluído de vez: "Documento excluído: <título>", com o trecho |

**Projeto arquivado:** as propriedades ficam como texto, a descrição fica só leitura, e uma faixa diz "Projeto arquivado: desarquive para editar a tarefa.".

**Descrição** (`TaskDescription.tsx`, sobre o editor compartilhado):

- **Editor:** o mesmo esquema de blocos do documento (texto, títulos, listas, checklist, citação, código, equações), sem "Criar tarefa" na barra de formatação.
  - Texto em 14/22 e itens de checklist com 28 px.
  - Item feito em `--text-3`, riscado em `--line-strong`.
  - Placeholder: "Descreva a tarefa ou digite / para inserir…".
- **Autosave** (`task-session.ts`, como `document-session.ts`):
  - um `AutosaveController<TaskTextSnapshot>` por tarefa e instalação, vivo enquanto a aba vive, com `{ title, description }`, `text_version`, 650 ms de pausa e uma chamada em voo;
  - fechar a gaveta ou abrir outra tarefa não interrompe o salvamento;
  - o controlador se registra no `save-registry` como `task`, para o ponto pendente e o aviso ao sair da página.
- **Rascunho:** em `localStorage`, como o do documento (`tinyfold:draft:<instalação>:task:<id>:<escritor>`, com o ponteiro em `sessionStorage`), lido por `parseTaskTextDraft`.
  - Recarregar a página e abrir a tarefa recupera o rascunho, com a faixa "Rascunho recuperado" de `SaveBanners`.
  - Uma tarefa excluída de vez com rascunho mostra "Esta tarefa não existe mais" e "Baixar rascunho".
- **Conflito:** a versão de texto mudou em outro aparelho e há edição local. A faixa "Esta tarefa mudou em outro aparelho." oferece:
  - "Carregar a versão salva";
  - "Salvar como cópia", que cria uma tarefa nova no mesmo projeto e coluna, com "<título> — cópia", a descrição local, o prazo e as etiquetas, e abre a cópia na gaveta.

  Não há mescla, como nos documentos.
- **Versão remota sem edição local:** é adotada em silêncio (`receiveRemote`), e o editor troca os blocos.
- **Gaveta aberta durante a navegação:**
  - o editor não remonta, porque a gaveta está no shell;
  - a tarefa continua aberta ao trocar de página e de projeto;
  - a origem que abre o documento mantém a gaveta.
- **Tarefa na lixeira:** se ela vai para a lixeira em outro lugar com a gaveta aberta, o próximo salvamento é recusado e a gaveta mostra "Esta tarefa está na lixeira." com "Restaurar", como `TrashedItem`.

**Tarefa nova:**

- **Abre por:** "+ Nova tarefa", o "+" de uma coluna, N › Tarefa, ⌘K e "Criar tarefa" num trecho do documento. Abre a gaveta no modo novo.
- **Cabeçalho:** "+" no lugar do anel, o campo de título "Nova tarefa" em foco, e [Cancelar] e [Criar].
- **Propriedades:** Projeto, Coluna, Prazo e Etiquetas.
- **Corpo:** "↵ cria a tarefa em Tinyfold. A descrição fica para depois de criar." e, vindo de um trecho, "Origem: <documento>".
- **Criar:** ↵ no título ou ⌘↵ cria. Título vazio mostra o erro inline "Dê um título à tarefa.".
- **Depois de criar:** a gaveta passa à tarefa, com o foco nela, e o toast diz "Tarefa criada em A fazer · Tinyfold.".
- **Sair sem criar:** Esc, ✕ ou Cancelar com algo digitado perguntam "Descartar a nova tarefa?" (`AlertDialog`), como o diálogo da etapa 08.

**Abrir e fechar:**

- **De onde abre:** o card, as linhas da Visão geral, o ⌘K, a Lixeira ("Abrir"), o painel de tarefas do documento, a origem e `?tarefa=`.
- **⌘K:** uma tarefa de outro projeto leva antes à Visão geral dele, como no protótipo.
- **Ao abrir:** a gaveta recebe o foco, e a região viva diz "Tarefa aberta na gaveta: <título>".
- **Ao fechar** (✕ ou Esc): o foco volta ao elemento que a abriu, por referência; sem ele, ao título da página.

**Esc na gaveta:**

1. Um menu, popover ou o calendário fecham primeiro, pelo React Aria.
2. No título ou na descrição, o primeiro Esc sai do campo para o contêiner da gaveta. Os menus do BlockNote tratam o próprio Esc.
3. O Esc seguinte fecha a gaveta, que é uma camada da pilha (`layers.ts`). Uma camada mais nova, como a lateral sobre a página, fecha antes.

### Concluídas (`/projetos/$projectId/concluidas`)

- **Barra:** "← Quadro".
- **Título:** "Concluídas", com o resumo "n tarefas concluídas. O quadro mostra só os últimos 14 dias.".
- **Grupos por mês** ("Outubro 2026 · 12", `completed-groups.ts`), com linhas de 36 px:
  - anel de conclusão;
  - o título, que abre a gaveta;
  - a data em `tnum`;
  - [Reabrir], com Desfazer.
- **Paginação:** 50 por vez, com "Mostrar mais" no fim (`listCompletedTasks` com o cursor).
- **Vazio:** "Nada concluído ainda.".
- **Rotas:** a rota entra em `router/paths.ts` (`paths.completed`) e em `parseProjectPath`. O ⌘K ganha "Concluídas do projeto".

### Visão geral, seletor e lateral

- **Visão geral:**
  - **Resumo:** "5 tarefas abertas, 1 atrasada. Último texto editado: …".
  - **Agora:** a regra de `overviewTasks`. Cada linha tem o anel, o título, a meta "Em andamento · mcp, backend" e, à direita, "atrasada desde 28 out" (em `--late`) ou "04 nov" e "2/5". O rodapé tem o resumo do que ficou de fora e "Abrir quadro →".
  - **Concluídas · 14 dias:** até 8, por data de conclusão, com a data à direita e "Ver todas →". Vazio: "Nada concluído nos últimos 14 dias.".
- **Seletor:** cada projeto ativo mostra "1 atrasada" em `--late` antes do atalho, como em conceito.md §3.
- **Lateral:** a linha Quadro mostra "1 atrasada" em `--late` quando há atrasadas; senão, a contagem de abertas em `--text-3` (crítica 3). A dica diz "5 abertas · 1 atrasada · G Q". A faixa recolhida põe as atrasadas no nome do botão Quadro.

### Etiquetas

- **"Gerenciar etiquetas…"** fica no ⋯ do quadro, no fim do filtro Etiquetas e no ⌘K ([decisão do usuário 2](#decisões-do-usuário)). Abre um `Dialog` "Etiquetas" de 480 px.
- **Cada linha:** o quadrado de cor, o nome (↵ ou duplo clique renomeiam no lugar), a contagem "4 tarefas" e o ⋯, com:
  - Renomear;
  - Cor ▸, com as sete cores em rádio e os nomes Azul, Ardósia, Roxo, Verde-água, Âmbar, Coral e Lima;
  - Excluir.
- **No pé:** "+ Nova etiqueta".
- **Excluir** ([decisão do usuário 1](#decisões-do-usuário)): sai na hora, sem diálogo, mesmo com a etiqueta em tarefas. O toast diz "Etiqueta mcp excluída. Estava em 4 tarefas." (ou "Não estava em nenhuma tarefa.") e oferece Desfazer e ⌘Z, que devolve a etiqueta a todas elas, como "Excluir pasta". O foco vai à linha seguinte da lista, ou à anterior na última.
- **Nomes:** os erros de nome aparecem inline, como nas colunas.
- **Seletor da gaveta:** cria etiquetas sem abrir o diálogo.

### Celular

O fallback continua funcional (decisão 19):

- **Quadro:** as colunas rolam na horizontal com encaixe, e mover é pelo ⋯ do card. "+" e ⋯ das colunas ficam visíveis sem hover.
- **Gaveta:** ocupa a área da página, com as propriedades acima da descrição e o ✕ no cabeçalho.
- **Concluídas** é uma lista.
- **Calendário:** abre como popover do tamanho da tela.

### Pastas e tarefas

Tarefas não entram em pastas:

- **Teclas e menus:** o M num card abre "Mover para" com as colunas, e não "Mover para pasta…". Nem a gaveta nem o ⌘K com uma tarefa oferecem pasta.
- **Listas:** o Índice continua só com documentos e desenhos, e o filtro e o agrupamento de pasta não veem tarefas. `search` com `folderId` continua sem tarefas.
- **⌘K:** mostra à direita de uma tarefa o projeto e a coluna, sem caminho de pasta. Com a gaveta aberta, o ⌘K ganha o grupo "Nesta tarefa", com Concluir ou Reabrir, Mover para coluna…, Copiar link e Mover para a lixeira, ao lado de "Neste item" da página.
- **Lixeira:** mostra na Origem de uma tarefa só o projeto.

## Teclado e Esc

**Tabela de atalhos:** a das etapas 08 e 09 com as mudanças desta etapa, em `shell/keyboard/shortcut-list.ts` e no diálogo Atalhos.

| Atalho | Ação | Etapa 10 |
| --- | --- | --- |
| ⌘K, G P, G 1–9, G V, G Q, G L, ⌘\\, F6, `/`, ?, ⌘S, ⌘[ | Como antes | F6 passa também pela gaveta: lateral → página → gaveta |
| ⌘Z | Desfazer a ação do toast na tela | Também para colunas, conclusão, projeto da tarefa e etiquetas |
| ⌘↵ | Concluir ou reabrir a tarefa da gaveta ou do card em foco; criar, na tarefa nova | Novo. Na gaveta vale também na descrição, salvo num bloco de código (decisão 12) |
| N | Menu Novo. Com o foco num card ou no nome de uma coluna, "Tarefa" cria naquela coluna | Muda |
| M | Item ou linha da árvore: Mover para pasta…. Card: Mover para (colunas) | Muda no quadro |
| F | Filtro de etiquetas do quadro | Novo, só no quadro |
| ↑ ↓ ← →, ⇧ + setas, ↵, ⇧F10 | Teclado do quadro, na tabela da seção Quadro | Novo |
| ⌥↑, ⌥↓ | Pasta em foco na árvore: reordena. Foco na gaveta, fora do texto: altura da gaveta | Muda |
| ↑ ↓, Home, End na alça da gaveta | Altura da gaveta | Novo |
| Esc | Fecha a camada mais recente; a gaveta é uma camada | Muda |

**Guardas e colisões:**

- **Atalhos de uma tecla** (N, M, F, P, G) continuam fora de campos editáveis, do Excalidraw e de menus abertos. Na gaveta, valem no contêiner e nos botões, nunca no título nem na descrição.
- **Ouvintes de teclado** do quadro e da gaveta são `onKeyDown` dos próprios contêineres, sem ouvinte de módulo. Eles nunca agem num alvo editável, com duas exceções:
  - o ⌘↵, tratado em captura na raiz da gaveta, com a exceção do bloco de código (`[data-content-type="codeBlock"]`);
  - o Esc, que o campo trata primeiro.
- **Campos que tomam as próprias teclas** e param a propagação: o nome da coluna, o nome da etiqueta, o título da tarefa, o campo do seletor de etiquetas e o calendário.
- **P em card e na gaveta** não faz nada: tarefas não são fixadas.
- **⌥↑ e ⌥↓** só mudam a altura com o foco dentro da gaveta e fora de campos, então não colidem com a reordenação de pastas da árvore.
- **⌘Z** continua com a guarda `acceptsUndo` da etapa 09. Na descrição, é o desfazer do BlockNote.
- **Os E2E de teclado** usam teclas reais (`page.keyboard.press` e `type`), nunca `fill()`, em todos os campos que tomam teclas.

**Esc:** a gaveta entra na pilha de `layers.ts` ao abrir e sai ao fechar. A ordem com as camadas da etapa 08 (lateral sobre a página e Buscar) é a da abertura. O Esc nunca navega, nunca descarta uma tarefa digitada sem perguntar e nunca recolhe a lateral fixa.

## Organização do código

### Backend

```text
src/core/infra/migrate.ts          diretiva "-- migrate: foreign_keys off", foreign_key_check, sqlFunctions
src/core/infra/module.ts           ModuleDefinition.sqlFunctions
src/core/domain/time-zone.ts       todayIn(timeZone, now), startOfDayIn(date, timeZone), addDays (puros, com Intl)
src/core/application/index.ts      Owner.timeZone
src/auth/                          003_owner_time_zone.sql, setTimeZone (caso de uso, repositório, RPC)
src/workspace/domain/
  names.ts                         displayName e nameKey, saídos de folders.ts, que passa a usá-los
  columns.ts                       Column, COLUMN_LIMITS, newColumnPosition, ordem (reaproveita folderOrder como reorder)
  labels.ts                        Label, LABEL_COLORS, LABEL_LIMITS, nextLabelColor
  tasks.ts                         Task, TaskDetail, TASK_LIMITS (20 etiquetas), TaskTextAck; task-status.ts sai
  checklist.ts                     checklistProgress(conteúdo)
  task-dates.ts                    isCivilDate, isOverdue, doneWindowStart, DONE_WINDOW_DAYS
  overview-tasks.ts                overviewTasks (Agora) e o resumo do que fica de fora
  paging.ts                        cursor de concluídas c~…, cursor do quadro pela posição da coluna
  reading-limits.ts                task: { pageChars, headerChars }
src/workspace/application/
  tasks/                           create-task, update-task, save-task-text, move-task, delete-task, restore-task,
                                   get-task, list-tasks, project-board, list-completed-tasks, task-rules (posições,
                                   conclusão, compatibilidade com status até B6), index.ts
  columns/                         list-columns, create-column, rename-column, move-column, delete-column,
                                   restore-column, set-done-column, column-rules, index.ts
  labels/                          list-labels, create-label, update-label, delete-label, restore-label, label-rules
  ports.ts                         ColumnRepository, LabelRepository, TaskRepository (saveTaskFields, saveTaskText,
                                   setTaskLabels, positions por projeto e coluna), Calendar (timeZone)
  navigation/                      project-overview.ts (Agora, concluídas, atrasadas), project-navigation.ts
  reading/                         list-tasks, read-task (páginas), search; ports com coluna, etiquetas e checklist
  schemas/                         tasks.ts, columns.ts, labels.ts; common.ts com o nome compartilhado
src/workspace/infra/
  migrations/007_board.sql
  module.ts                        sqlFunctions: { workspace_search_text }
  repository/                      tasks.ts, columns.ts, labels.ts, mappers.ts
  navigation/, reader/             contagens por coluna de conclusão, atrasadas, search_text das tarefas
  mcp/                             list-tasks.ts, read-task.ts (Markdown), format.ts (cabeçalho da tarefa), search.ts
  operations/                      columns.ts, labels.ts, tasks.ts
  context.ts, rpc.ts, service.ts   recebem timeZone() do servidor; o serviço de teste usa 'UTC'
src/workspace/testing/
  fixtures/stage-09-sample.sql, stage-09-grande.sql   dumps de 1da6617
  legacy-workspace.ts              loadStage09Fixture(db, name)
src/server/                        compõe timeZone() a partir de auth para o router e as ferramentas MCP
```

**Entradas públicas** (`domain/index.ts`), para a web:

- `checklistProgress`, `isOverdue`, `doneWindowStart`;
- `LABEL_COLORS`, `COLUMN_LIMITS`, `LABEL_LIMITS`, `TASK_LIMITS`;
- `displayName` e `nameKey`;
- os tipos `Column`, `Label`, `Task` e `TaskDetail`.

Saem `TASK_STATUSES` e `taskStatusLabels`. O `core/domain` exporta `todayIn` e `addDays`.

### Web

```text
src/web/editor/                    editor compartilhado (sai de pages/document/)
  schema.ts                        documentSchema e o dicionário, de document-schema.ts
  BlockEditor.tsx                  BlockNoteView com barra e menu /, de DocumentContentEditor.tsx; "Criar tarefa" opcional
  use-block-editor.ts              useCreateBlockNote, conteúdo inicial e troca remota, de use-document-editor.ts
  editor.css
src/web/pages/board/
  BoardPage.tsx, BoardHeader.tsx (título, filtro, contagem), BoardColumns.tsx, BoardColumn.tsx,
  ColumnHeader.tsx, ColumnNameField.tsx, ColumnMenu.tsx, AddColumn.tsx, DeleteColumnDialog.tsx,
  TaskCard.tsx, CardMeta.tsx, CardMenu.tsx, MoveTaskMenu.tsx, LabelFilterMenu.tsx,
  board-keys.ts (puro), use-board-keyboard.ts, board-drop.ts (puro), use-board-dnd.ts,
  use-board-moves.ts, use-column-actions.ts, board-text.ts (puro), board.css, card.css
  (Kanban.tsx sai)
src/web/pages/project/completed/   CompletedPage.tsx, completed-groups.ts (puro), completed.css
src/web/components/task-drawer/
  TaskDrawer.tsx, DrawerHandle.tsx, drawer-height.ts (puro), TaskDrawerHeader.tsx, TaskTitleField.tsx,
  TaskProperties.tsx, ColumnField.tsx, DueField.tsx, LabelsField.tsx, LabelPicker.tsx, ProjectField.tsx,
  ChecklistRow.tsx, TaskOrigin.tsx (de components/task/TaskSource.tsx), TaskDescription.tsx, NewTaskForm.tsx,
  task-session.ts, task-text-draft.ts (puro), use-task-fields.ts (escritas na fila), drawer.css
src/web/components/labels/         LabelChip.tsx, LabelsDialog.tsx, label-colors.ts
src/web/components/task/           LinkedTask.tsx fica; TaskDialog.tsx, use-task-form.ts e task-dialog.css saem
src/web/lib/                       civil-date.ts (hoje no fuso do dono, à meia-noite e ao voltar à aba),
                                   task-dates.ts (formatos "04 nov", "qua 04 nov 2026 · em 5 dias"),
                                   queries/columns.ts, labels.ts, board.ts, completed.ts, task.ts
src/web/shell/
  task-drawer-state.tsx            provedor da tarefa aberta, do modo novo e do elemento que abriu
  DrawerRegion.tsx                 a região da gaveta no AppLayout e o deslocamento dos toasts
  keyboard/                        ⌘↵, F, ⌥↑/⌥↓ da gaveta, camada da gaveta; use-task-shortcuts.ts
  command-palette/                 palette-task.ts ("Nesta tarefa"), comandos novos
  project/                         ProjectSwitcher com as atrasadas
  sidebar/SidebarNav.tsx           Quadro com as atrasadas
```

**Arquivos que crescem e são divididos:**

| Arquivo (linhas em `main`) | Divisão |
| --- | --- |
| `pages/board/Kanban.tsx` (133) e `TaskCard.tsx` (88) | Saem para a lista de `pages/board/` acima |
| `pages/document/DocumentEditor.tsx` (205), `use-document-editor.ts` (72), `DocumentContentEditor.tsx` (79) e `document-schema.ts` (64) | O esquema, a vista e a criação do editor vão para `src/web/editor/`. O documento fica com a página, o título, as faixas e as ações |
| `shell/AppProvider.tsx` (142) | `openTask` e `newTask` passam ao `TaskDrawerProvider` (`task-drawer-state.tsx`), e o diálogo de projeto fica |
| `shell/AppLayout.tsx` (133) | A região da gaveta vai para `DrawerRegion.tsx` |
| `shell/keyboard/use-shortcut-actions.ts` (111) | Os atalhos de tarefa e quadro vão para `use-task-shortcuts.ts` |
| `shell/command-palette/palette-sections.ts` | "Nesta tarefa" em `palette-task.ts` |
| `components/editor/use-item-actions.ts` (166) | Fica com documento e desenho. A cópia da tarefa fica em `task-session.ts`, que só reaproveita `SaveBanners` e os diálogos |
| `pages/board/board.css` (202) | `board.css` (página e colunas) e `card.css` |

## Testes

### Unidade (`check`)

- **`core/domain/time-zone.test.ts`:** hoje em `America/Sao_Paulo`, `Europe/Lisbon` e `Pacific/Kiritimati` perto da meia-noite UTC; início do dia em zona com horário de verão (`America/New_York`); fuso inválido.
- **Domínio do workspace:**
  - `checklist.test.ts`: aninhados, vazio, todos feitos;
  - `task-dates.test.ts`: atraso na véspera, no dia e depois; coluna de conclusão; janela de 14 dias; datas inválidas como "2026-02-30";
  - `overview-tasks.test.ts`: a ordem de "Agora", o corte em 6 e os textos do resumo;
  - `names.test.ts`: os casos de `folders.test.ts` passados a coluna e etiqueta;
  - `columns.test.ts`: posição da coluna nova antes da de conclusão;
  - `labels.test.ts`: próxima cor;
  - `paging.test.ts`: cursor de concluídas e o do quadro com posição de coluna até 19.
- **Web:**
  - `board-keys.test.ts`: os destinos de cada tecla e as pontas;
  - `board-drop.test.ts`: metades, fim da coluna, a própria posição;
  - `drawer-height.test.ts`: limites e alturas fixas;
  - `completed-groups.test.ts`;
  - `board-text.test.ts`: "6 tarefas · 1 atrasada", "Mais 23 concluídas antes de 16 out", "Nenhuma tarefa com mcp.";
  - `lib/civil-date.test.ts` e `lib/task-dates.test.ts`: "em 5 dias", "hoje", "há 2 dias";
  - `task-text-draft.test.ts`: rascunho válido, inválido e acima do limite;
  - `palette-sections.test.ts`: "Nesta tarefa" e os comandos novos;
  - `keyboard.test.ts`: ⌘↵ fora e dentro de bloco de código; F só no quadro; ⌥↑ na gaveta e na pasta;
  - `toast-undo.test.ts`: o Desfazer de coluna retirado por uma mudança mais nova.
- **Exemplo:** `scripts/seed-sample.test.ts`, com `src/web/testing/blocknote-editor.ts`: cada descrição do exemplo, carregada no BlockNote real, sai igual ao que o seed grava. Assim abrir uma tarefa do exemplo não a salva.

### Banco (`test:db`, SQLite temporário)

**Executor** (`src/core/infra/migrate.db.test.ts`, novo):

- a diretiva reconstrói uma tabela referenciada e as chaves voltam ligadas;
- uma migração que deixa um órfão falha no `foreign_key_check`, nada fica aplicado e as chaves voltam ligadas;
- sem a diretiva, as chaves continuam ligadas durante a migração;
- `sqlFunctions` é registrada antes da primeira migração.

**Migração 007** (`application/board-migration.db.test.ts`):

- **Bases:** o banco vazio na 006 (`migrateWorkspaceTo(db, 6)`) e os dumps `stage-09-sample.sql` e `stage-09-grande.sql`.
- **Colunas iniciais:** existem com os IDs fixos, e a revisão sobe 1.
- **Tarefas:** `todo`, `doing` e `done` caem nas colunas certas; `version`, `position`, `created_at`, `updated_at` e `deleted_at` ficam iguais; `completed_at` só nas concluídas; `text_version = 1`; `search_text` normalizado ("Revisão" é achada por "revisao").
- **Preservados:** as origens com título e trecho, as prévias, as pastas e o `core_mutations`. Repetir uma resposta guardada de `createTask` devolve o mesmo JSON.
- **Consistência:** `integrity_check` e `foreign_key_check` limpos; migrar de novo não muda nada; `project_id` nulo é recusado pela tabela.
- **Gatilhos e índices, por SQL direto:** coluna excluída numa tarefa viva; `completed_at` fora de regra; excluir a coluna de conclusão ou uma coluna com tarefas; duas colunas de conclusão; nomes repetidos; `INSERT OR REPLACE` em pasta, coluna e etiqueta em uso; e, por `EXPLAIN QUERY PLAN`, que os gatilhos buscam a coluna pela chave primária.

**Fuso:** `auth.db.test.ts` com `setTimeZone` (válido, inválido, repetido) e a migração `auth/003` sobre uma base com 001 e 002.

**Colunas** (`application/columns.db.test.ts`):

- `createColumn`: antes da de conclusão; limite de 20; nome repetido com outra caixa ou acento.
- `renameColumn`.
- `moveColumn`: revisão, referência igual.
- `deleteColumn`:
  - vazia e com tarefas de vários projetos, vivas e na lixeira;
  - destino na conclusão com `completed_at`;
  - de conclusão e última aberta recusadas;
  - corte em 1.000 com `complete: false`.
- `restoreColumn`: a posição, a ordem e as datas de volta; pula a tarefa que mudou de versão ou saiu do destino; nome tomado; segunda restauração.
- `setDoneColumn`: datas gravadas e apagadas sem mudar versão; `restore` devolve as datas.
- **Idempotência** das respostas guardadas.

**Etiquetas** (`application/labels.db.test.ts`): criar com a próxima cor, limite de 100, renomear, recolorir, excluir com a contagem e as ligações guardadas, restaurar e nome tomado; uma etiqueta excluída some de `projectBoard`, `getTask` e do MCP.

**Tarefas** (`application/tasks.db.test.ts`, que absorve os casos de tarefa de `workspace.db.test.ts`):

- **Campos:**
  - prazo inválido;
  - 21 etiquetas;
  - etiqueta excluída;
  - projeto arquivado;
  - a revisão só com coluna e projeto;
  - concluir no topo e reabrir no fim.
- **Texto:**
  - versão própria, sem conflito com uma mudança de campo simultânea;
  - título vazio vira "Sem título";
  - descrição inválida e acima de 1 MiB;
  - checklist e `search_text` derivados;
  - recusa na lixeira.
- **Movimentos:**
  - `moveTask` com e sem `expectedRevision`;
  - a vizinha que saiu leva ao fim.
- **Ciclo da lixeira:** lixeira, restauração e exclusão de vez com as ligações em cascata.
- **Compatibilidade** com `status` até B6, e recusa depois.

**Leituras:**

- `application/board.db.test.ts`: `projectBoard` com a janela no fuso do dono (concluída às 23:30 de ontem em São Paulo, que já é hoje em UTC) e `olderDone`; `listCompletedTasks` com páginas estáveis e cursor inválido.
- `navigation.db.test.ts`: as atrasadas em `projectNavigation` e `listProjects`, "Agora" e as concluídas de `projectOverview`.

**MCP:**

- `tasks.db.test.ts`:
  - os campos novos e os filtros por nome;
  - nome desconhecido com a lista;
  - o cursor recusado depois de mover coluna e depois da migração;
  - `read_task` com páginas, cabeçalho cortado e descrição vazia.
- `search.db.test.ts`: termo só na descrição, trecho e `column`.
- `tools.db.test.ts`: o teto da seção MCP.

**Servidor:** `src/server/mcp.db.test.ts` com `list_tasks` e `read_task` novos e o fuso do dono no `overdue`.

**Backup:** `scripts/board-backup.db.test.ts`, no padrão de `folders-backup.db.test.ts`. O snapshot restaurado mantém colunas, etiquetas, ligações, descrições e o fuso, e os gatilhos e índices únicos continuam recusando no arquivo novo.

### Chrome (`build` e `e2e`, desktop e Pixel 7)

**Ajudantes:**

- `e2e/support/items.ts`: `newTask(page, título, { column })` passa pela gaveta.
- `e2e/support/board.ts` (novo): `columnHeader`, `card`, `openDrawer`, `drawer` e `pressOnCard`, com seletores por papel e nome.

As specs existentes trocam o diálogo da tarefa pela gaveta sem mudar o que verificam: `app.spec.ts` ("create and move task"), `navigation.spec.ts`, `escape.spec.ts`, `trash.spec.ts`, `narrow.spec.ts`, `mcp.spec.ts` e `adversarial.spec.ts`.

| Spec | Cenários |
| --- | --- |
| `board.spec.ts` (novo) | **Colunas:** criar ("+ Coluna", nome selecionado, ↵), renomear com setas e espaços no campo, mover com ⇧← e ⇧→ e pelo menu, excluir vazia e com destino, Desfazer e ⌘Z, trocar a conclusão e desfazer.<br>**Cards:** setas, ⇧ + setas com anúncio, M, ⇧F10, ⌘↵ concluindo no topo e reabrindo, com Desfazer.<br>**Filtro:** F, marcar e limpar, contagem filtrada e "Nenhuma tarefa com mcp.".<br>**Datas:** card atrasado, rodapé "Mais n concluídas antes de …" (banco grande) e abertura de Concluídas.<br>**Arquivado:** projeto arquivado sem as ações |
| `board-drag.spec.ts` (novo, só desktop) | Card para outra coluna, entre dois cards, para o fim; fundo da coluna sob o card; Esc sem mover nada |
| `task-drawer.spec.ts` (novo) | **Abrir:** pelo card, pela Visão geral, pelo ⌘K (outro projeto leva à Visão geral dele), pelo painel do documento e por `?tarefa=`; F6 até a gaveta; foco ao abrir e ao fechar.<br>**Campos:** coluna; prazo pelo calendário só com teclas (setas, PageDown, ↵, "Sem prazo"); etiqueta criada pelo seletor digitando e removida pelo "×"; projeto com Desfazer.<br>**Texto:** título com ↵ para a descrição; checklist marcado atualiza a barra e o card; autosave; recarregar recupera o rascunho; conflito entre duas páginas com "Carregar a versão salva" e "Salvar como cópia".<br>**Navegação:** a gaveta continua aberta entre páginas e projetos, e a origem abre o documento com ela aberta.<br>**Altura:** pela alça e por ⌥↑ e ⌥↓.<br>**Esc:** a ordem na descrição, no calendário e com a lateral sobre a página.<br>**⌘↵:** conclui da descrição e não age num bloco de código.<br>**Tarefa nova:** com "Descartar a nova tarefa?". |
| `completed.spec.ts` (novo) | Grupos por mês, "Mostrar mais" no banco grande, Reabrir com Desfazer |
| `labels.spec.ts` (novo) | Gerenciar etiquetas: criar, renomear no lugar com teclas reais, recolorir, nome repetido, excluir uma etiqueta em uso sem diálogo, com o toast que conta as tarefas, e desfazer pelo toast e por ⌘Z, com a etiqueta de volta nos cards |
| `time-zone.spec.ts` (novo) | Com `timezoneId: 'America/Sao_Paulo'` e o relógio do navegador fixado (`page.clock`): a primeira carga grava o fuso, o Perfil mostra o fuso, e uma tarefa que vence hoje não aparece atrasada. Outro contexto em `Asia/Tokyo` oferece "Usar o fuso deste aparelho" |
| `narrow.spec.ts` | Colunas com rolagem horizontal; mover pelo ⋯; gaveta na área da página |
| `mcp.spec.ts` | `read_task` com a descrição escrita pela interface e `list_tasks` com o filtro de coluna |

**Capturas** nos dois temas, em 1440 e 1280, e no celular, em `docs/screens/`, com dados fictícios do `seed:sample`:

- quadro com o filtro;
- card em foco e arrastado;
- menu da coluna;
- excluir coluna com destino;
- gaveta com descrição e checklist, em largura cheia e abaixo de 1200 px;
- calendário;
- seletor de etiquetas;
- Concluídas;
- Visão geral com "Agora" e "Concluídas · 14 dias";
- seletor com as atrasadas;
- Gerenciar etiquetas.

Elas substituem `quadro-*`. As da Visão geral e do seletor são refeitas.

## Validação no Chrome real contra o protótipo

Usa bancos temporários e as portas 3501 e 5301. As etapas 07, 08 e 09 usaram 3471/5271, 3481/5281 e 3491/5291, e o E2E usa 5171. O banco `data/tinyfold.sqlite` não é aberto, e as portas 3370 e 5170 não são usadas.

```sh
TF_TMP="$(mktemp -d -t tinyfold-10)"
export OWNER_PASSWORD='validacao-quadro-10' PORT=3501 WEB_PORT=5301 \
  APP_ORIGIN=http://localhost:5301 COOKIE_SECURE=false BACKUP_DIR="$TF_TMP/backups"
# 1. Atualização: um banco criado pelo código da etapa 09, numa worktree fora do repositório
git worktree add "$SCRATCH/tf-09" 1da6617
(cd "$SCRATCH/tf-09" && mise exec -- pnpm install --frozen-lockfile \
  && DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm seed:sample)
DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm dev   # aplica a 007; conferir e parar
# 2. Exemplo da etapa 10
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm seed:sample
DATABASE_PATH="$TF_TMP/grande.sqlite" mise exec -- pnpm seed:sample --grande
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm dev
# conferir no log: "Banco: <TF_TMP>/…sqlite" e "Tinyfold em http://127.0.0.1:3501"
```

`$SCRATCH` é a pasta de rascunho da sessão, nunca `.claude/worktrees/`. A worktree sai ao fim (`git worktree remove`).

**Exemplo** (brief.md):

- **Colunas:** A fazer, Em andamento, Revisão (criada pelo seed) e Concluído (a de conclusão).
- **Etiquetas:** mcp, backend, editor, kanban, operação, fornecedores e compras, nas cores do protótipo (azul, ardósia, roxo, verde-água, âmbar, coral e lima).
- **Prazos:** relativos ao dia do seed, como o brief em 30 de outubro. "Configurar backup externo" vence 2 dias antes, e por isso está atrasada; "Gerar token pessoal no Perfil", 5 dias depois; e assim por diante.
- **Descrições:** as do protótipo, já no formato que o BlockNote grava, com checklists de 2/5, 3/3 e 1/3.
- **Concluídas:** "Corrigir foco ao fechar diálogo", concluída 3 dias antes, e "Medir janela".
- **`--grande`:** acrescenta 60 concluídas antigas no Tinyfold, de 15 a 120 dias antes, para o rodapé da coluna e as páginas de Concluídas.

**Roteiro:**

1. **Atualização:** no banco antigo, o quadro tem as tarefas nas três colunas iniciais, nas mesmas posições. As concluídas há mais de 14 dias estão em Concluídas, a busca acha títulos com acento, e `list_tasks` pelo MCP responde com `column`.
2. **Lado a lado no Google Chrome,** com o protótipo servido como UTF-8 de `127.0.0.1:5299`. Em 1440×900 e 1280×800, nos dois temas, comparar:
   - **Quadro:** larguras das colunas, cabeçalho de 28 px, anel, card (raio, padding, título, meta, chips), estados, "+ Coluna", rodapé da conclusão.
   - **Gaveta:** cabeçalho de 52 px, propriedades (300 px, 88 + 1fr, linhas de 30), barra do checklist, origem, a faixa abaixo de 1200 px e a alça.
   - **Telas:** calendário, seletor de etiquetas, menu e exclusão de coluna, Concluídas, Visão geral, seletor e lateral com as atrasadas.

   As medidas usam `getBoundingClientRect` e `getComputedStyle`, como na etapa 09.
3. **Teclado:** a tabela da seção [Teclado e Esc](#teclado-e-esc), inclusive ⇧ + setas, ⌘↵ na descrição e num bloco de código, o calendário só com teclas e a ordem do Esc.
4. **Arrastar:** os casos de `board-drag.spec.ts`, com o indicador e o fundo da coluna.
5. **Larguras:** em 1024 px, a gaveta com a lateral sobre a página; no Pixel 7, o quadro e a gaveta.
6. **Registro:** as diferenças aceitas vão para `validacao.md`, por exemplo a janela de 14 dias contada com hoje e o filtro que não sobrevive à recarga. As capturas vão para `docs/screens/`.
7. **Limpeza:** parar o `dev` e o servidor do protótipo, remover a worktree e rodar `rm -rf "$TF_TMP"`.

## Critérios de pronto

- [ ] `check`, `test:db`, `build` e `e2e` (desktop e Pixel 7) verdes depois de cada entrega.
- [ ] O executor aplica uma migração com as chaves desligadas, confere `foreign_key_check` e religa as chaves, também em falha.
- [ ] A migração 007 roda sobre bancos reais da etapa 09 (dumps e o ensaio de atualização) sem perder tarefas, origens, posições nem versões, e com os gatilhos recusando as violações. O `INSERT OR REPLACE` de pastas fica fechado.
- [ ] Colunas criadas, renomeadas, reordenadas, excluídas com destino e com a conclusão trocada, com Desfazer pelo toast e por ⌘Z.
- [ ] A descrição com autosave, rascunho recuperável, conflito explícito, checklist ao vivo e a gaveta aberta durante a navegação.
- [ ] Prazo, atraso e janela de 14 dias no fuso do dono, iguais no card, nas contagens e no MCP.
- [ ] Etiquetas com nome único pela chave, cor, filtro, o diálogo "Etiquetas" e a exclusão sem diálogo, com Desfazer.
- [ ] Quadro, gaveta e Concluídas conforme visual.md e o protótipo, com o teclado da tabela, o Esc em camadas e o arrastar.
- [ ] Visão geral, seletor e lateral com as atrasadas e "Concluídas · 14 dias".
- [ ] MCP com coluna, prazo, atraso, etiquetas, checklist e conclusão; `read_task` com a descrição em páginas; busca na descrição; tudo dentro de 45.000 caracteres.
- [ ] `TaskDialog`, `Kanban.tsx` e `TASK_STATUSES` substituídos, e os arquivos divididos conforme a tabela.
- [ ] O exemplo com colunas, etiquetas, prazos e descrições já normalizadas: abrir uma tarefa não a salva.
- [ ] Validação no Chrome real contra o protótipo registrada, com bancos temporários e as portas 3501 e 5301.
- [ ] Documentação atualizada conforme a seção final.

## Divisão do trabalho

Dois subagentes, backend e web. Diferente da etapa 09, eles se sobrepõem onde os contratos permitem:

- cada um trabalha numa worktree própria, fora do repositório, na pasta de rascunho da sessão (nunca em `.claude/worktrees/`);
- os ramos são `feat/quadro-backend` e `feat/quadro-web`, a partir de `feat/quadro`;
- a integração é feita em `feat/quadro`, com *rebase* do web sobre o backend em cada ponto marcado;
- cada entrega é um commit e deixa os quatro comandos verdes no próprio ramo;
- a compatibilidade com `status` deixa o backend entrar antes da interface nova.

**Backend.** Dono de:

- `src/core/**`, `src/auth/**`, `src/workspace/**` e `src/server/**`;
- `scripts/seed-sample.ts`, `scripts/seed-sample.test.ts` e `scripts/board-backup.db.test.ts`;
- os dumps de `src/workspace/testing/fixtures/`.

| Ordem | Entrega (commit) |
| --- | --- |
| B1 | `feat(core): rebuild referenced tables in migrations`. Diretiva `foreign_keys off`, `foreign_key_check`, `sqlFunctions`, `time-zone.ts`, `migrate.db.test.ts` |
| B2 | `feat(workspace): add configurable columns, labels and task fields to the schema`. Migração 007 com os gatilhos (o de pastas incluído), `domain/names.ts`, colunas, etiquetas, tarefas e datas no domínio, repositórios, compatibilidade com `status`, os dumps da etapa 09 e `board-migration.db.test.ts`. A web pode integrar a partir daqui |
| B3 | `feat(workspace): add column and label writes with versioned restore`. `application/columns/` e `labels/`, esquemas e operações, testes |
| B4 | `feat(workspace): split task writes and add the task text`. `application/tasks/` (um caso de uso por arquivo), `updateTask` com campos, `saveTaskText`, `moveTask` sem revisão para o Desfazer, `getTask`, revisão só com a ordem, testes. **Ponto de integração 1:** contratos de escrita prontos para a web |
| B5 | `feat(workspace): read the board, completed tasks and due dates in the owner's time zone`. `auth/003` e `setTimeZone`, `timeZone()` composto pelo servidor, `projectBoard`, `listCompletedTasks`, atrasadas em `listProjects`, `projectNavigation` e `projectOverview` ("Agora"), MCP (`list_tasks`, `read_task` em páginas, `search` na descrição, teste do teto), `seed:sample` com o exemplo e `--grande`, teste do exemplo, backup. **Ponto de integração 2:** leituras e exemplos reais de resposta para a web |
| B6 | Depois de W6: `refactor(workspace): drop status compatibility`. Sai `status` das entradas e de `listTasks`, e `title` de `updateTask` |

**Web.** Dono de:

- `src/web/**`;
- `e2e/**` e `docs/screens/*`;
- a documentação final.

| Ordem | Entrega (commit) | Pode começar |
| --- | --- | --- |
| W1 | `refactor(web): share the block editor and split the board`. `src/web/editor/`, o documento sobre ele, `pages/board/` dividido sem mudar o comportamento (ainda com `status`) | Junto com B1 |
| W2 | `feat(web): add the task drawer`. Região e camada da gaveta, alça e altura, cabeçalho, título, modo novo, `TaskDrawerProvider` no lugar de `TaskDialog`, sobre os contratos atuais; E2E migrados para a gaveta | Junto com B2–B3 |
| W3 | `feat(web): restyle the board with configurable columns`. Colunas da API, cabeçalho, menu, "+ Coluna", renomear, excluir com destino, conclusão, cards novos, teclado do quadro, arrastar com `board-drop.ts`, Desfazer | Depois do ponto 1 |
| W4 | `feat(web): edit task fields and description in the drawer`. Coluna, prazo e calendário, etiquetas e seletor, projeto, checklist, origem, `task-session.ts` com autosave, rascunho e conflito, ⌘↵ | Depois do ponto 1 |
| W5 | `feat(web): show due dates, labels and completed tasks across pages`. `projectBoard` e a janela, filtro F, Concluídas, Visão geral, seletor e lateral com as atrasadas, Gerenciar etiquetas, ⌘K ("Nesta tarefa", comandos), fuso no Perfil | Depois do ponto 2 |
| W6 | `test(e2e): cover the board, the drawer and completed tasks`, com as capturas | Depois de W5 |
| W7 | Depois de B6: a validação no Chrome real e `docs: record stage 10` | Por último |

**Revisão adversarial cruzada** (três revisores somente leitura, em paralelo, com reteste do que for corrigido):

| Revisor | Foco |
| --- | --- |
| Dados e migração | O executor com as chaves desligadas (religar em toda falha, `foreign_key_check`, uma só conexão); a 007 sobre os dumps e sobre bancos montados à mão com tarefas em todos os estados; gatilhos e índices com SQL direto, inclusive `INSERT OR REPLACE`; o `core_mutations` e os cursores depois da migração; `restoreColumn` e `setDoneColumn` pulando o que mudou; revisão do quadro em concorrência; fuso e janela de 14 dias perto da meia-noite; teto do MCP |
| Quadro e gaveta: teclado, acessibilidade e arrastar | Uma parada de Tab no quadro, os nomes acessíveis de colunas e cards, os anúncios; ⇧ + setas e o foco por referência depois de cada movimento; campos que tomam as próprias teclas (nome da coluna, da etiqueta, título, seletor, calendário); ⌘↵ e o bloco de código; a pilha do Esc com a gaveta, a lateral e o ⌘K; F6; a gaveta aberta durante a navegação; o arrastar e o cancelamento; o celular |
| Segurança e qualidade | IDs de outro projeto ou excluídos em `updateTask`, `moveTask`, `deleteColumn` e nas listas de restauração; nomes e descrições no MCP (cabeçalho, `singleLine`, `visibleText`); respostas guardadas sem texto; o rascunho da descrição; o fuso vindo do navegador; tamanhos de arquivo e divisões; duplicação entre a página do documento e a descrição; ouvintes de módulo; regras do dependency-cruiser; qualidade dos testes |

## Riscos

- **Migração 007, a primeira reconstrução de tabela referenciada.** Um erro no executor pode deixar a conexão com as chaves desligadas ou um órfão sem aviso.
  - Mitigação: o `finally` que religa e confere; o `foreign_key_check` antes do `COMMIT`; os dumps reais; o ensaio de atualização.
  - Recomendação de operação: `pnpm backup:create` antes de subir a versão.
- **Função SQL na migração:** `workspace_search_text` precisa existir sempre que a 007 rodar. Se `searchText` mudar um dia, uma instalação nova terá um texto de busca um pouco diferente do de uma antiga até a próxima gravação. Mitigação: a função fica registrada pelo módulo para sempre, e uma mudança de `searchText` já exigiria regravar os textos de busca de todos os itens.
- **Dois editores BlockNote na mesma página** (documento e descrição): foco, atalhos, menus e desempenho. Mitigação: o editor compartilhado, chaves por tarefa, E2E com os dois abertos e o Esc em cada um.
- **Gaveta fora da página:** a rolagem até o card aberto, a altura com o teclado do celular aberto e o foco ao fechar depois de navegar. Mitigação: o foco por referência com volta ao título, e os cenários do `task-drawer.spec.ts`.
- **Revisão do quadro global:** com muitas escritas, movimentos podem ser recusados com mais frequência. Mitigação: a revisão só sobe com o que muda a ordem (decisão 15), e o quadro recarrega e anuncia.
- **Fuso:** o primeiro acesso grava o fuso do aparelho em que se está. Viajar mantém o fuso antigo até "Usar o fuso deste aparelho". Mitigação: a sugestão no Perfil quando os fusos diferem.
- **Trabalho em paralelo:** as worktrees divergem nos contratos. Mitigação: os pontos de integração marcados, os esquemas Zod como fonte dos tipos (`AppRouter`) e a compatibilidade com `status` até B6.
- **Atualização em massa do E2E:** o diálogo da tarefa sai. Mitigação: a gaveta entra em W2, ainda sobre os contratos atuais, com os ajudantes e as specs migrados na mesma entrega.
- **Tarefa com mais de 1.000 afetadas** numa exclusão de coluna ou troca de conclusão sai sem Desfazer, como nas pastas. É um caso extremo, registrado como aceito.

## Documentação ao concluir

| Documento | Atualização |
| --- | --- |
| `arquitetura.md` | Executor de migrações com as chaves desligadas e funções SQL. Modelo com colunas, etiquetas, ligações, campos de tarefa e o fuso do dono. As regras de conclusão, atraso e janela. A gaveta no shell. A seção MCP |
| `produto.md` | Colunas, conclusão, descrição, prazo, etiquetas, gaveta e Concluídas deixam de ser planejados |
| `decisoes.md` | As decisões técnicas desta página e as respostas do usuário |
| `interface/README.md` e `identidade-visual.md` | Quadro e gaveta implementados; falta a etapa 11 |
| `implantacao.md` | "Atualizar para a etapa 10": backup antes da 007, a reconstrução com as chaves desligadas, o fuso gravado na primeira carga e `seed:sample --grande` com concluídas |
| `validacao.md` | Comandos executados, cenários, o ensaio de atualização, a comparação com o protótipo e as diferenças aceitas |
| `README.md` | "O que funciona" e as capturas |
| `src/workspace/README.md` | Regras de colunas, etiquetas, campos, texto, conclusão, revisão e as leituras do quadro |
| `etapas/README.md` e esta página | Estado, critérios marcados, Resultado e Desvios |

## Decisões do usuário

Respostas de 2026-11-01, registradas em [decisões](../decisoes.md):

1. **Excluir uma etiqueta em uso sai na hora, sem diálogo:** o toast "Etiqueta mcp excluída. Estava em 4 tarefas." oferece Desfazer e ⌘Z, que devolvem a etiqueta a todas as tarefas, como em "Excluir pasta". A confirmação antes, proposta no escopo inicial, e a recusa enquanto a etiqueta estiver em uso foram descartadas.
2. **As etiquetas são geridas num diálogo "Etiquetas",** aberto pelo ⋯ do quadro, pelo fim do filtro Etiquetas e pelo ⌘K, perto de onde são usadas, como as colunas. Uma seção no Perfil e a gestão só pelo seletor da gaveta foram descartadas.

As escolhas que o plano fez sem perguntar, cada uma com a fonte citada, foram aceitas como estão: o anel decorativo do card (decisão 18), nomes de coluna únicos (decisão 7), etiquetas em ordem alfabética (decisão 16), o filtro de etiquetas que vale só na aba (decisão 17), a janela de 14 dias que conta hoje (regras de tarefas) e a gaveta na página inteira abaixo de 720 px (decisão 19).
