# Etapa 08 — Fundação e lateral

**Estado:** planejada. Escopo inicial de 2026-10-31; esta página é detalhada antes de a etapa começar.

## Objetivo

Trocar a navegação atual pela experiência só de projeto da direção Sumário: sistema visual novo, lateral do projeto na variante A (sem pastas ainda), seletor de projetos, Buscar, Visão geral, Índice e Lixeira por projeto. Todo item passa a pertencer a um projeto. As páginas atuais de documento, desenho e quadro passam a viver dentro do shell novo, com o visual mínimo necessário. O restyle completo delas fica para as etapas 10 e 11.

Referências: [visual.md](../interface/visual.md), [sidebar.md](../interface/sidebar.md) (variante A), [refino.md](../interface/refino.md) e [conceito.md](../interface/conceito.md). Quando duas se contradizem, vale a mais recente, conforme [interface/README.md](../interface/README.md).

## Escopo

- **Sistema visual:**
  - Tokens OKLCH claro e escuro gerados a partir de `docs/interface/prototipo/tokens.py`, com os valores de `visual.md`.
  - Tema Sistema, Claro ou Escuro, escolhido no menu Você e guardado no dispositivo, aplicado antes da primeira pintura.
  - Inter variável completa (com `cv05`, `ss03` e `tnum`) e JetBrains Mono servidas pela própria origem; ícones Lucide com traço de 1,5.
  - BlockNote e Excalidraw seguem o tema.
- **Shell só de projeto:**
  - Reabre no último projeto, item e posição. Trocar de projeto abre a Visão geral.
  - Somem Início, as listas gerais de documentos e desenhos e o quadro geral.
  - URLs antigas redirecionam para o projeto correspondente.
- **Lateral, variante A, sem pastas:**
  - Seletor de projetos, com ativos, arquivados e "+ Novo projeto" (nome e cor).
  - Buscar, Visão geral e Quadro; seções Documentos e Desenhos com fixados no topo, 8 recentes e "Ver todos".
  - No rodapé, Lixeira e Você (Perfil, token, tema, atalhos, sair).
  - Ponto de "não salvo" e faixa recolhida com ⌘\.
  - Abaixo de 1100 px, a lateral começa recolhida e, ao abrir, sobrepõe a página.
- **Buscar e ⌘K:** busca em todos os projetos por título e texto, mais comandos (novo item, trocar de projeto, tema).
- **Visão geral:**
  - Tarefas abertas e itens editados recentemente.
  - As seções que dependem de prazo e de data de conclusão chegam na etapa 10.
- **Índice:** tabela de documentos e desenhos do projeto, filtrável por tipo e ordenável.
- **Lixeira por projeto:** restaurar e excluir de vez, com confirmação.
- **Projeto:** cor da marca, de uma paleta curta, e marca tipográfica com a inicial. Fixar e desafixar documentos e desenhos, até 8.
- **Teclado:** G P, G V, G Q, G L, G 1–9, N, `/` e F6. Pilha de camadas para a regra do Esc: fecha só a camada mais recente e nunca navega.
- **Tela estreita:** fallback básico para que os fluxos de celular atuais continuem funcionando: lateral em sobreposição, editor, desenho e mover tarefa por menu. O celular ainda não foi desenhado.
- **Perfil:** vira página no shell novo, mantendo as seções da etapa 07.

## Mudanças previstas de dados e contratos

- **Migração `workspace/004`:**
  - Cria o projeto "Geral" se houver itens sem projeto ou nenhum projeto ativo, e move para ele todos os documentos, desenhos e tarefas com `project_id` nulo.
  - Cria `color` em `workspace_projects`, com chave da paleta e padrão `gray` para os existentes.
  - Cria `pinned_at` em documentos e desenhos.
- **Projeto obrigatório:**
  - Proposta preliminar: gatilhos `BEFORE INSERT/UPDATE` que recusam `project_id` nulo, mais a regra na aplicação.
  - Reconstruir as tabelas para trocar a coluna exigiria desligar `foreign_keys` fora da transação do executor de migrações (procedimento de 12 passos do SQLite). Decidir ao detalhar; se for necessário, acrescentar esse suporte ao executor em `core`.
- **Exclusão definitiva:**
  - `workspace_task_sources.document_id` não tem `ON DELETE`. Excluir de vez um documento com tarefas originadas exige reconstruir essa tabela, que nenhuma outra referencia, com `document_id` anulável e `ON DELETE SET NULL`.
  - O título do documento passa a ser guardado na origem, para a tarefa manter o contexto.
  - As prévias de desenho já caem em cascata.
- **Contratos:**
  - `projectId` passa a ser obrigatório na criação; `null` deixa de significar "sem projeto" nos filtros.
  - Novos procedimentos: `pinItem`, `unpinItem`, `purgeDocument`, `purgeCanvas` e `purgeTask`. `listTrash({ projectId })` reúne os três tipos.
  - `updateProject` aceita `color`.
- **MCP:** `list_projects` perde `withoutProject` e ganha `color`. `search` pode marcar os fixados.
- **Preferências do dispositivo** (`localStorage`, com `try/catch`): tema, último projeto e item, posição de rolagem, estado recolhido da lateral e das seções, e ordenação.

## Organização do código

Arquivos grandes que esta etapa toca:

- **`src/web/shell.tsx`** (469 linhas) vira `src/web/shell/`:
  - `AppProvider.tsx`, `LoginScreen.tsx` e `AuthenticatedShell.tsx`;
  - `sidebar/`: `ProjectSidebar`, `ProjectSwitcher`, `SidebarSection`, `SidebarRow`, `YouMenu`, `CollapsedRail`;
  - `command-palette/`: `CommandPalette` e `commands.ts`;
  - `keyboard/`: `use-shortcuts.ts` e `layers.ts`, a pilha do Esc;
  - `theme.ts`, adaptando `src/web/lib/theme.ts` e `public/theme.js` do Orbis.
- **`src/web/pages/Library.tsx`** (648 linhas) sai. Entram `pages/project/OverviewPage.tsx`, `IndexPage.tsx` e `TrashPage.tsx`, e `components/item-rows/`.
- **`src/web/styles.css`** (2.620 linhas) vira `styles/tokens.css` (gerado, com teste que compara com `tokens.py`), `styles/base.css` e um CSS por componente ou página. `canvas-editor.css` e `inline-math.css` já seguem esse padrão.
- **`src/web/ui.tsx`** vira `ui/`: `Dialog`, `Menu`, `Toast`, `Spinner`, `EmptyState` e `Kbd`, cada um com sua exportação.
- **Rotas:** saem de `main.tsx` para `routes.ts`.
- **`src/workspace/application/schemas.ts`:** um arquivo de esquemas por agregado.
- **E2E:** login e criação de itens vão para `e2e/support/`, porque o Início ("Começar a escrever") deixa de existir.

## Dependências

- Etapa 07 concluída. O Perfil e o token passam ao menu Você.
- Sem prazos nem datas de conclusão, que chegam na etapa 10:
  - o seletor não mostra atrasadas;
  - a Visão geral não tem "Agora" com prazos nem "Concluídas · 14 dias";
  - a linha do Quadro na lateral mostra a contagem de abertas.

## Perguntas em aberto

1. O projeto Geral pode ser renomeado e arquivado como os outros? Proposta: pode ser renomeado. Só pode ser arquivado se houver outro projeto ativo, para o aplicativo sempre ter onde abrir.
2. Endereços dos itens: manter `/documentos/$id` e `/desenhos/$id`, com o projeto derivado do item, ou aninhar em `/projetos/$projectId/…`? Proposta: manter. Os links já existentes em documentos continuam válidos, e mover um item de projeto não quebra endereços.
3. Gatilhos ou reconstrução de tabelas para o projeto obrigatório, conforme acima.
