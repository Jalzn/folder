# Workspace

Projetos, documentos, tarefas e seus vínculos no mesmo módulo. A interface usa o router `workspace` de oRPC; scripts e testes podem usar `createWorkspaceService(db)`.

## Regras implementadas

- Documentos e tarefas podem existir sem projeto. Filtro de projeto omitido significa todos; `null` significa sem projeto.
- Arquivar projeto preserva o conteúdo. É possível continuar editando documentos existentes; adicionar novos itens exige restaurar o projeto.
- Documento usa JSON do subconjunto BlockNote suportado, com formato 1, até 1 MiB em UTF-8 e 5.000 blocos. Texto de busca é derivado no servidor; a busca ignora caixa e acentos.
- Parágrafo, título, listas, checklist, citação e código são os blocos iniciais. Propriedades, estilos e links são validados antes de persistir para que um conteúdo inválido não impeça a reabertura do editor.
- Todo pedido de escrita tem `requestId`. Repetição idêntica devolve a resposta original; reutilização para outro conteúdo é recusada. Atualizações também exigem `expectedVersion`.
- Salvar documento devolve somente ID, versão e data, mantendo o registro de idempotência compacto. Criar e ler devolvem o documento completo.
- Excluir documento move para a lixeira e incrementa a versão. Restaurar também é uma escrita versionada.
- Tarefas usam `todo`, `doing` e `done`. Toda alteração de tarefa incrementa uma revisão global do quadro. Reordenação exige `expectedRevision` e `expectedVersion`, além de um destino opcional `beforeTaskId`.
- A posição é global por coluna; quadros de projeto filtram essa ordem. Reordenar pode incrementar as versões dos cartões reposicionados, e a interface deve recarregar a lista.
- Tarefa criada a partir de trecho valida o documento salvo, sua versão quando enviada, bloco e trecho. Tarefa e vínculo são gravados na mesma transação.
- Editar título/estado da tarefa não muda o documento. Excluir documento ou remover trecho preserva a tarefa e o texto capturado.
- A origem expõe `available` para o documento e `blockAvailable` para o trecho. Quando o trecho não existe mais, o retorno pode levar ao documento com aviso.

## Verificação

`domain/document.test.ts` verifica o formato suportado, limites, propriedades e links inválidos. `application/workspace.db.test.ts` usa SQLite real em arquivos temporários para testar reabertura após reinício, dois clientes, conflitos, idempotência, busca, arquivamento, lixeira, ordenação e referências que sobrevivem à remoção do conteúdo de origem.
