# Documentos

`DocumentsModule` controla conteúdo, títulos, versões, lixeira e localização persistida de documentos em `workspace_documents`. `commands` expõe `create`, `save`, `trash` e `restore`; `queries` oferece `list`, `get` e `factsForOrigins`. Blocos e Markdown vêm de [rich-text](../rich-text/README.md).

Projetos e pastas chegam pela porta `DocumentOrganization`, vinculada ao escopo pela composição do servidor. Os fatos de origem são consultados em lote; a composição distingue metadados do documento de verificações que precisam do conteúdo. `requireSource` no participante valida documento, versão, bloco e trecho na transação do chamador.

A remoção física só está no participante: o [workspace](../workspace/README.md) preserva primeiro o título nas origens das tarefas e então remove a linha, na mesma transação. Alterações de projeto, pasta e pin também são primitivas do participante usadas pelos fluxos conjuntos.

## Entradas e composição

`#documents` expõe a classe; `#documents/domain` contém regras puras; `#documents/contracts` reúne schemas, tipos e eventos; `#documents/composition` disponibiliza os participantes e operações para o servidor. Essas entradas exatas ficam no `package.json` da raiz. Outros módulos de negócio recebem portas locais ligadas pela composição.

`DocumentsModule` estende a classe gerada por uma definição privada `defineModule`, de `#core/application`. A definição associa comandos, consultas e assinatura de eventos ao estado de cada instância; somente a infraestrutura do próprio módulo acessa esse estado. Dependências e TypeScript são configurados na raiz.

Os participantes usam o escopo transacional recebido, não abrem outra escrita e não podem ser reutilizados depois dele. Os nomes externos `workspace.*` e o histórico de migrações permanecem. Eventos são notificações tipadas após commit, locais ao processo, sem replay durável; rollback e retentativa idempotente não notificam novamente. Detalhes em [arquitetura](../../docs/arquitetura.md).

## Conteúdo e versões

- Documento usa JSON do subconjunto BlockNote suportado, com formato 1, até 1 MiB em UTF-8 e 5.000 blocos. Texto de busca é derivado no servidor; a busca ignora caixa e acentos.
- Todo bloco guardado tem `id`: criar e salvar dão um, de `newId`, a cada bloco que chega sem, como os que a importação de Markdown da web cria ao dividir um bloco em volta de uma fórmula. Sem isso, o editor inventaria outro `id` a cada abertura, e a tarefa criada de uma seleção apontaria para um bloco que o servidor não tem.
- Parágrafo, título, listas, checklist, citação e código são os blocos iniciais. Propriedades, estilos e links são validados antes de persistir para que um conteúdo inválido não impeça a reabertura do editor.
- Excluir documento move para a lixeira e incrementa a versão; o item guarda a pasta como origem. Restaurar também é uma escrita versionada: o item volta para a pasta se ela continua ativa, ou para a raiz, e a resposta traz `folderGone: true`.

Criar e salvar respondem somente `{ id, version, updatedAt }`; ler devolve o conteúdo. Escritas versionadas levam `requestId` e, nas atualizações, `expectedVersion`. Um reenvio idêntico retorna a resposta original; reutilizar o pedido com outra entrada é recusado. Salvar conteúdo não muda projeto nem pasta. Um movimento de projeto incrementa a versão sem mudar a data de edição; pasta/pin não mudam versão ou data.

## Eventos e verificação

O catálogo inclui `document.created`, `document.saved`, `document.trashed`, `document.restored`, `document.purged` e `document.placementChanged`. O evento de localização distingue `project`, `folder` e `pin`; não carrega conteúdo.

`infra/module.db.test.ts` cobre a classe em SQLite isolado, replay, conflito, escopo e rollback. `src/server/modules-integration.db.test.ts` verifica a composição com o esquema histórico completo; as regressões anteriores estão em `src/server/workspace-tests/application/`. Os resultados executados ficam em [validação](../../docs/validacao.md).
