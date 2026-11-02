# Banco de dados

O SQLite guarda todo dado persistido. Esta página reúne as convenções das migrações e o catálogo dos gatilhos. O esquema atual, legível num lugar só, está em [`src/workspace/infra/schema/current.sql`](../src/workspace/infra/schema/current.sql): as tabelas do `core` e do workspace, cada uma com os seus índices e gatilhos. O teste `schema.db.test.ts` o escreve a partir das migrações e falha quando ele muda.

## Migrações

- **Nome e lugar:** `NNN_nome.sql`, numerado por módulo, em `src/<módulo>/infra/migrations/`. O executor (`src/core/infra/migrate.ts`) recusa outro nome. Por isso o retrato do esquema fica fora dessa pasta.
- **Imutáveis:** cada migração aplicada fica registrada com o checksum em `core_schema_migrations`. Mudar uma migração aplicada impede a subida. Uma mudança no banco é uma migração nova.
- **Numa transação só:** as pendentes rodam juntas, com `BEGIN IMMEDIATE`.
- **Chaves estrangeiras desligadas:** o executor as desliga antes da transação, para que uma tabela referenciada possa ser reconstruída (criar, copiar, apagar, renomear). Nenhuma cascata nem verificação de chave dispara dentro de uma migração. Uma migração que apague um pai apaga os filhos à mão. Antes do `COMMIT`, `foreign_key_check` recusa toda violação nova; as antigas, deixadas por SQL manual, vão para um aviso.
- **Gatilhos de uma tabela reconstruída** somem com ela. A migração que reconstrói recria os que valem (a 007 deixou de lado os dois de projeto obrigatório das tarefas, porque a coluna passou a `NOT NULL`).
- **Funções SQL:** um módulo registra as funções que as suas migrações e consultas usam (`sqlFunctions`). O workspace registra `workspace_search_text`, o `searchText` do domínio.
- **Retrato:** toda migração nova muda `schema/current.sql`. O diff do retrato entra no mesmo commit, e a revisão confere que os gatilhos de antes continuam lá.

## Gatilhos

### Convenções

- **Nome:** `<tabela>_<regra>`, com `_on_insert`, `_on_update`, `_on_delete` ou `_on_restore` quando a mesma regra vale em mais de um evento.
- **Mensagem:** em inglês, no formato `'<tabela>.<coluna> …'` ou `'<tabela> …'`. O usuário nunca a vê.
- **A última barreira:** o caso de uso valida antes, com a mensagem em português e o código de erro certo. Um gatilho que dispara é um bug do aplicativo e vira 500. Os gatilhos repetem regras da aplicação de propósito, como defesa em profundidade, e cobrem também o SQL escrito à mão.
- **Sem efeito, com duas exceções:** todo gatilho só recusa, salvo `workspace_columns_done_handover` e `workspace_columns_done_kept`, que escrevem em outras linhas. `makeDoneColumn` conta com eles.

### Catálogo

São 24 gatilhos vivos, todos do workspace. "Antes" diz onde a aplicação recusa o mesmo caso. Os testes de banco que os disparam por SQL direto estão na última coluna.

#### Projeto obrigatório (migração 005)

| Gatilho | Garante | Antes | Teste |
| --- | --- | --- | --- |
| `workspace_documents_project_required_on_insert` e `_on_update` | Documento sempre com projeto, inclusive contra o `ON DELETE SET NULL` de um projeto excluído | Os esquemas exigem `projectId`; `requireActiveProject` na criação e na mudança de projeto | `projects-required.db.test.ts` ("refuses a null project from then on…") |
| `workspace_canvases_project_required_on_insert` e `_on_update` | O mesmo para desenhos | Idem | Idem |

Os dois gatilhos de tarefas da 005 saíram na 007, que reconstruiu `workspace_tasks` com `project_id NOT NULL`.

#### Pastas (migração 006)

| Gatilho | Garante | Antes | Teste |
| --- | --- | --- | --- |
| `workspace_documents_folder_on_insert` e `workspace_canvases_folder_on_insert` | Um item novo entra só numa pasta ativa do próprio projeto | `requireFolderInProject` em `createDocument` e `createCanvas`; `moveItem` | `folders-migration.db.test.ts` ("refuses through SQL a folder of another project…") |
| `workspace_documents_folder_on_update` e `workspace_canvases_folder_on_update` | Um item fica numa pasta do próprio projeto; só um item na lixeira aponta para uma pasta excluída, de onde veio. Roda em todo autosave, com uma busca pela chave primária | `moveItem`, `restoreDocument` e `restoreCanvas` (que tiram a pasta excluída no mesmo UPDATE) e `deleteFolder` | `folders-migration.db.test.ts`; `scripts/folders-backup.db.test.ts` |
| `workspace_folders_project_fixed` | Uma pasta não muda de projeto | Nenhum caso de uso muda o projeto de uma pasta | `folders-migration.db.test.ts` |
| `workspace_folders_empty_on_delete` | Uma pasta só é excluída depois que os seus documentos e desenhos vivos foram para a raiz ou para a lixeira | `deleteFolder` move os itens antes, na mesma transação | `folders-migration.db.test.ts`; `scripts/folders-backup.db.test.ts` |

#### Quadro (migração 007)

| Gatilho | Garante | Antes | Teste |
| --- | --- | --- | --- |
| `workspace_tasks_column_on_insert` e `_on_update` | Toda tarefa, viva ou na lixeira, está numa coluna ativa | `columnFor` em `createTask`, `updateTask` e `moveTask`; `deleteColumn` move as tarefas antes | `board-migration.db.test.ts` ("a task in a missing or deleted column…") |
| `workspace_tasks_completion_on_insert` e `_on_update` | `completed_at` existe exatamente quando a tarefa está na coluna de conclusão | Os casos de uso de tarefa e de coluna calculam a conclusão | `board-migration.db.test.ts`; `scripts/board-backup.db.test.ts` |
| `workspace_columns_empty_on_delete` | Uma coluna só vai para a lixeira sem tarefas e nunca como a de conclusão | `deleteColumn` recusa a de conclusão e move as tarefas para o destino | `board-migration.db.test.ts` ("deleting the done column or one with tasks…") |
| `workspace_columns_done_on_delete` | A coluna de conclusão nunca é apagada de vez | Nenhum caso de uso apaga coluna de vez | `board-migration.db.test.ts` ("DELETE or REPLACE of an empty done column…") |
| `workspace_columns_done_on_insert` | Uma segunda coluna de conclusão não é inserida | `createColumn` cria colunas comuns | `board-migration.db.test.ts` |
| `workspace_columns_done_on_restore` | Uma coluna restaurada não vira uma segunda de conclusão | Uma coluna excluída nunca é a de conclusão (os gatilhos acima) | `board-migration.db.test.ts` |
| `workspace_columns_done_only_active` | Só uma coluna ativa vira a de conclusão | `setDoneColumn` exige uma coluna ativa | `board-migration.db.test.ts` ("…a done column in the trash…") |
| `workspace_columns_done_handover` | **Com efeito.** Marcar uma coluna como a de conclusão (`is_done` 0 → 1) passa o papel: a antiga deixa de ser, e as tarefas da nova ganham a conclusão, no `updated_at` novo da coluna ou no relógio do SQLite | `setDoneColumn`, por `makeDoneColumn`, que depois grava a conclusão no instante da aplicação | `board-migration.db.test.ts` ("…keeps completions in sync") |
| `workspace_columns_done_kept` | **Com efeito.** A coluna de conclusão só deixa de ser pela passagem acima, e as suas tarefas perdem a conclusão | Idem | `board-migration.db.test.ts`; `scripts/board-backup.db.test.ts` |
| `workspace_columns_id_in_use`, `workspace_folders_id_in_use` e `workspace_labels_id_in_use` | Nenhum INSERT repete um ID existente, o que fecha o `INSERT OR REPLACE` e os upserts, que apagariam e inseririam a linha de novo sem os gatilhos de UPDATE e DELETE | Os casos de uso só inserem IDs novos | `board-migration.db.test.ts` ("…any insert of an id that exists" e "INSERT OR REPLACE of a folder, a column or a label…") |

Os testes de `board-migration.db.test.ts` também conferem que os gatilhos de tarefa só buscam colunas pela chave primária.
