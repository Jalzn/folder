# Etapa 09 — Pastas

**Estado:** planejada. Escopo inicial de 2026-10-31; esta página é detalhada antes de a etapa começar.

## Objetivo

Agrupar documentos e desenhos do mesmo assunto em pastas mistas de um único nível dentro do projeto, conforme [pastas.md](../interface/pastas.md). Pasta não é página: não tem conteúdo, propriedades nem subpastas, e tarefas não entram em pastas.

## Escopo

- **Dados:** pasta com nome único no projeto e ordem manual. Um item fica em no máximo uma pasta ou na raiz.
- **Lateral:** a seção "Itens" substitui Documentos e Desenhos.
  - Ordem: fixados da raiz, pastas e itens soltos. O tipo aparece no ícone da linha.
  - Árvore WAI-ARIA com o `Tree` do React Aria. Pastas abertas ou fechadas ficam lembradas por projeto no dispositivo.
  - Limite de 8 filhos visíveis, com "Ver todos". O item ativo aparece sempre.
  - Pasta vazia mostra atalhos para criar documento ou desenho. A faixa recolhida ganha o ícone Itens, com um popover.
- **Ações:**
  - Criar, renomear (F2 ou duplo clique) e reordenar (arrastar ou ⌥↑/⌥↓).
  - Mover itens arrastando, com M ou pelo menu "Mover para pasta…", que também cria pasta e leva a outro projeto.
  - Excluir a pasta leva os itens para a raiz, com "Desfazer". "Excluir pasta e itens…" manda os itens para a Lixeira, depois de confirmação.
  - Criar um item dentro de uma pasta.
- **Onde a pasta aparece:**
  - No cabeçalho do documento e do desenho, como rótulo que abre "Mover para pasta…".
  - No ⌘K, como caminho e como resultado.
  - No Índice, com coluna e filtro de pasta, agrupado por pasta.
  - Em Visão geral › Editados recentemente.
  - Na origem mostrada na Lixeira.
- **Lixeira:** restaurar um item cuja pasta foi excluída devolve-o à raiz, com aviso.
- **Fixados:** sobem ao topo da raiz ou da própria pasta, até 8 por escopo.

## Mudanças previstas de dados e contratos

- **Migração `workspace/005`:**
  - `workspace_folders (id, project_id, name, position, version, created_at, updated_at, deleted_at)`, com nome único por projeto entre as pastas ativas. Comparar sem diferenciar caixa e acentos com `searchText`, guardando uma coluna normalizada.
  - `folder_id` anulável em documentos e desenhos, com chave estrangeira.
- **Exclusão:**
  - Lógica (`deleted_at`) para permitir "Desfazer" e para a Lixeira saber o nome da pasta que sumiu.
  - "Desfazer" adapta o mecanismo de desfazer do Orbis (`src/core/infra/undo.ts`) ou usa uma restauração versionada simples. Decidir ao detalhar.
- **Regras:**
  - Mover um item para outro projeto limpa `folder_id`.
  - Uma pasta excluída não aceita itens novos.
- **Contratos:**
  - `createFolder`, `renameFolder`, `moveFolder`, `deleteFolder({ withItems })`, `restoreFolder` e `moveItem({ folderId | null })`.
  - Listagens e o Índice devolvem `folderId`, e a árvore da lateral vem numa consulta por projeto.
- **MCP:**
  - `list_projects` devolve as pastas de cada projeto, com quantidade de itens.
  - `search` aceita `folderId` e devolve `folder: { id, name } | null`.
  - O cabeçalho de `read_document` e de `read_drawing` mostra a pasta.

## Organização do código

- **Web:** `shell/sidebar/` ganha `ItemsTree.tsx`, `FolderRow.tsx`, `use-tree-dnd.ts` e `MoveToFolderPopover.tsx`.
- **Workspace:** `application/folders/`, com um caso de uso por arquivo, e `infra/repository/folders.ts`.
- **Domínio:** regras de ordem e de limite em `domain/folders.ts`.

## Dependências

Etapa 08: a lateral variante A, o Índice, a Lixeira por projeto e os fixados.

## Perguntas em aberto

1. A ordenação dos itens (Recentes, A–Z, Criação) fica guardada por projeto no dispositivo ou no servidor? Proposta: no dispositivo, como o estado das pastas.
2. "Desfazer" da exclusão de pasta: mecanismo genérico de desfazer em `core`, que outras ações podem reaproveitar, ou restauração específica? Proposta: avaliar o do Orbis, porque a etapa 10 também pede ⌘Z ao excluir coluna.
