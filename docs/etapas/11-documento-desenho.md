# Etapa 11 — Documento e desenho

**Estado:** planejada. Escopo inicial de 2026-10-31; esta página é detalhada antes de a etapa começar.

## Objetivo

Levar ao documento as ligações do produto: tarefas e desenhos incorporados, vivos e somente leitura, mais o marcador de origem no texto. Também restilizar as páginas de documento e de desenho no Sumário ([refino.md](../interface/refino.md) §7 e [visual.md](../interface/visual.md), "Documento: itens incorporados").

## Escopo

- **Página do documento:**
  - Coluna única de 680 px, título no estilo de página e salvamento no cabeçalho.
  - Faixas de falha, conflito e rascunho fixas sob o cabeçalho; sem coluna de margem.
- **Tarefa incorporada:**
  - Card com estado, título, coluna, prazo, etiquetas e progresso do checklist. Reflete o estado atual e abre a gaveta; mostra "aberta abaixo" quando a gaveta está nela.
  - Inserida pelo menu de inserção ou ao criar tarefa a partir de um trecho.
- **Desenho incorporado:** versão atual, somente leitura, com a legenda "Figura n — título" numerada pela ordem no documento e "Abrir ↗".
- **Item indisponível:**
  - Na lixeira: "Na lixeira: título", com "Restaurar" e "Remover".
  - Excluído de vez: "Item excluído", só com "Remover".
  - O documento nunca quebra.
- **Marcador de origem:** botão inline ao fim do trecho que originou uma tarefa, com tooltip, `aria-label` e sublinhado pontilhado no hover. Abre a gaveta e some se a tarefa for excluída.
- **Markdown:** na exportação `.md`, itens incorporados viram links com o título. Na importação, continuam links comuns.
- **Página do desenho:** moldura no Sumário (título, salvamento, Exportar e ⋯) e Excalidraw no tema do aplicativo.
- **MCP:** `read_document` mostra os incorporados como referências consultáveis:
  - tarefa: `[Tarefa: título (coluna)](tinyfold:task/<id>)`;
  - desenho: `[Desenho: título](tinyfold:drawing/<id>)`;
  - indisponíveis: "[Item indisponível]".

  A descrição da ferramenta explica que `read_task` e `read_drawing` recebem esses IDs.

## Mudanças previstas de dados e contratos

- **Domínio do documento:**
  - Dois blocos novos em `readDocumentContent`: `taskEmbed { taskId }` e `drawingEmbed { canvasId }`, com propriedades UUID validadas.
  - O texto de busca ignora os incorporados, e `documentToMarkdown` passa a emiti-los como links.
- **Consulta em lote:** `resolveEmbeds({ taskIds, canvasIds })` devolve o estado atual de cada item, incluindo indisponível, na lixeira ou excluído. Uma consulta por documento, invalidada quando tarefas ou desenhos mudam.
- **Imagem do desenho incorporado:**
  - Proposta: reaproveitar a prévia PNG da etapa 07, por uma rota autenticada de mesma origem (`/arquivos/desenhos/:id/previa.png`, com `Cache-Control` pela versão). O documento não carrega o Excalidraw.
  - No tema escuro, aplicar o mesmo filtro de inversão que o Excalidraw usa no próprio modo escuro.
  - Quando a prévia estiver defasada, o documento pode gerar uma nova sob demanda ao abrir.
- **Exportação `.md`:** decidir se a exportação da web passa a usar `documentToMarkdown` do domínio, com o teste de equivalência da etapa 07, para que MCP e arquivo `.md` não divirjam.
- **Origem:** o marcador usa as origens já guardadas (bloco e trecho), como decoração do ProseMirror, sem mudar o JSON do documento.

## Organização do código

- **`src/web/pages/DocumentEditor.tsx`** (845 linhas) vira `pages/document/`:
  - `DocumentPage.tsx`, `DocumentHeader.tsx`, `DocumentTitle.tsx`, `SaveStatus.tsx` e `DocumentBanners.tsx`;
  - `DocumentMenu.tsx`, `SelectionTaskButton.tsx`, `use-document-autosave.ts` e `use-markdown-io.ts`.
- **Editor:** `src/web/editor/` (criado na etapa 10) ganha `blocks/TaskEmbed.tsx`, `blocks/DrawingEmbed.tsx`, `blocks/UnavailableEmbed.tsx`, `origin-markers.ts` e `insert-menu.ts`.
- **`src/web/pages/CanvasEditor.tsx`** (706 linhas) vira `pages/drawing/`:
  - `DrawingPage.tsx`, `DrawingHeader.tsx` e `ExcalidrawHost.tsx`;
  - `use-canvas-autosave.ts`, `canvas-io.ts` (importar e exportar), `viewport.ts` e `RecoveryBanners.tsx`.
  - `canvas-png.ts` e `canvas-preview.ts` continuam em `lib/`, desde a etapa 07.
- **Workspace:** `application/embeds/resolve-embeds.ts`, mais as regras de incorporação no domínio.

## Dependências

- Etapa 10: card com coluna, prazo, etiquetas e checklist; gaveta; editor compartilhado.
- Etapa 07: prévia PNG.
- Etapa 09, para mostrar a pasta no cabeçalho.

## Perguntas em aberto

1. Um documento pode incorporar tarefas e desenhos de outro projeto? Proposta: não. O menu de inserção oferece só itens do projeto do documento, e um item movido para outro projeto continua aparecendo, com o projeto indicado no card.
2. O desenho incorporado usa a prévia PNG guardada, rápida mas às vezes uma versão atrás, ou renderiza a cena atual com o Excalidraw, sempre atual mas carregando o editor em todo documento? Proposta: a prévia, regenerada ao abrir o documento quando estiver defasada.
