# Etapa 08 — Fundação e lateral

**Estado:** planejada, detalhada em 2026-10-31. Nada desta página foi implementado ainda; as verificações listadas são planejadas.

O Tinyfold deixa a navegação atual (Início, listas gerais e quadro geral) e passa a viver sempre dentro de um projeto, com a lateral do projeto e o sistema visual Sumário em tema claro e escuro. A única tela fora de um projeto é o estado vazio, quando não há projeto ativo. Todo item passa a pertencer a um projeto: o que hoje está solto vai para o projeto Geral. A Lixeira passa a ser de cada projeto e ganha a exclusão definitiva.

As páginas de documento, desenho e quadro continuam com o funcionamento atual. Elas passam a viver dentro do shell novo, com os tokens novos e só os ajustes que o shell exige. O restyle completo delas fica para as etapas 10 e 11.

## Referências e precedência

| Assunto | Fonte |
| --- | --- |
| Cores, tipografia, espaço, componentes e movimento | [visual.md](../interface/visual.md) e `docs/interface/prototipo/tokens.py` |
| Lateral | [sidebar.md](../interface/sidebar.md), variante A, sem a árvore de pastas de [pastas.md](../interface/pastas.md) (etapa 09) |
| Toasts, botões e consistência das telas | [refino.md](../interface/refino.md) §1 (críticas 1–7 e 20–21) e §8 |
| Estrutura, fluxos, seletor, Visão geral, Lixeira, teclado e Esc | [conceito.md](../interface/conceito.md) §1, §3, §4.1, §4.4 e §5 |
| Comportamento de referência | `docs/interface/prototipo/sumario.html`, versão "Pastas" |

Quando duas fontes divergem, vale a mais recente, conforme [interface/README.md](../interface/README.md). A serifa, a coluna de margem e os ícones Tabler das especificações antigas não valem: o aplicativo usa Inter, Lucide e coluna única.

## Casos de uso

1. Abrir o aplicativo e continuar no último projeto, no último item e na mesma rolagem.
2. Trocar de projeto pelo seletor (G P) ou por G 1–9 e cair na Visão geral do projeto escolhido.
3. Criar um projeto com nome e cor da marca, renomear, reordenar no seletor, arquivar e desarquivar.
4. Achar um item do projeto pela lateral (Buscar, `/`) ou em qualquer projeto pelo ⌘K.
5. Fixar até 8 itens por projeto no topo das seções da lateral.
6. Ver no Índice todos os documentos e desenhos do projeto, ordenáveis.
7. Restaurar ou excluir de vez um item na Lixeira do projeto, ou esvaziá-la.
8. Escolher o tema Sistema, Claro ou Escuro no menu Você, no ⌘K ou no Perfil.
9. Recolher a lateral (⌘\) e trabalhar só pelo teclado, com o Esc fechando apenas a camada mais recente.
10. No celular, abrir a lateral em sobreposição e continuar escrevendo, desenhando e movendo tarefas.
11. Arquivar todos os projetos e voltar por um estado vazio que oferece "Novo projeto" e "Desarquivar".

## Escopo

**Entra:**

- Tokens claro e escuro gerados a partir dos valores aprovados, tema persistido sem piscar na carga, Inter variável completa e JetBrains Mono servidas pela própria origem, ícones Lucide.
- Componentes base sobre React Aria: botões, campos, menus, popovers, diálogos, tooltips, toasts e `kbd`.
- Rotas por projeto em português e redirecionamento de todas as URLs atuais.
- Shell só de projeto:
  - lateral variante A, seletor de projetos, Buscar e ⌘K;
  - Visão geral, Índice e Lixeira por projeto;
  - menu Você, recolher com ⌘\ e sobreposição em tela estreita.
- Modelo de teclado e regra do Esc.
- Projeto obrigatório para documentos, desenhos e tarefas, com migração para o projeto Geral.
- Cor da marca, ordem dos projetos no seletor e fixados.
- Estado sem projeto ativo, inclusive na instalação nova.
- Exclusão definitiva e esvaziar a lixeira.
- Perfil e login no shell novo, com a seção Aparência.
- Saídas do MCP sem itens soltos.

**Fica de fora:**

- Pastas (etapa 09).
- Atrasadas no seletor e na lateral, "Agora" com prazos e "Concluídas · 14 dias" na Visão geral (dependem de prazo e de data de conclusão, etapa 10).
- Colunas configuráveis, gaveta da tarefa e quadro no visual novo (etapa 10). Nesta etapa o quadro só ganha os tokens.
- Itens incorporados, marcador de origem e páginas de documento e desenho no visual novo (etapa 11).
- Versão de celular desenhada. Esta etapa entrega um fallback funcional, não um layout aprovado.
- Desfazer genérico com ⌘Z. Só as ações desta etapa que o protótipo desfaz ganham "Desfazer" no toast: mover item de projeto e arquivar.

## Sistema visual

### Tokens

**Fonte de verdade:** os valores hexadecimais aprovados de `tokens.py`, que reproduzem a geração OKLCH de `visual.md`. Os valores são portados para `src/web/styles/tokens/palette.ts`. As coordenadas OKLCH de `visual.md` ficam como comentário em cada token, para orientar futuras mudanças de paleta.

**Pipeline:**

| Arquivo | Papel |
| --- | --- |
| `src/web/styles/tokens/palette.ts` | `{ light, dark }` com todos os tokens de cor, sombra e peso, por nome em inglês |
| `src/web/styles/tokens/scale.ts` | Escala tipográfica, espaços, raios, alturas, durações e curvas (de `visual.md` §3, §4 e §7) |
| `src/web/styles/tokens/css.ts` | `tokensCss()`, função pura que gera o CSS |
| `src/web/styles/tokens/contrast.ts` | Luminância relativa WCAG e a lista de pares obrigatórios |
| `src/web/styles/tokens/write.ts` | Grava `src/web/styles/tokens.css`. Roda com `pnpm tokens` |
| `src/web/styles/tokens.css` | Gerado e versionado, com o cabeçalho "Gerado por `pnpm tokens`. Não editar." |

**Teste de unidade** (`tokens.test.ts`), que reprova o `check` quando:

- `tokens.css` diferir de `tokensCss()`;
- um token existir em um tema e faltar no outro;
- qualquer par obrigatório ficar abaixo do mínimo:
  - 4,5:1 para `--text`, `--text-2`, `--text-3`, `--accent`, `--late`, `--ok`, `--warn` e `--conflict` sobre `--side`, `--bg`, `--raised-1/2/3`, `--hover`, `--hover-raised`, `--pressed`, `--selected` e `--sidebar-bg/hover/active`;
  - 4,5:1 para cada cor de estado sobre a própria faixa (`--late-bg` etc.) e para `--on-accent` sobre `--accent-solid`;
  - 3:1 para `--field-border` e `--icon` sobre as superfícies;
- algum valor divergir de `tokens.py`, lido por expressão regular. A paridade vale enquanto `tokens.py` for a referência aprovada. Uma mudança de paleta atualiza os dois e registra a decisão.

**Nomes:** CSS é código, então os nomes ficam em inglês. A tabela mapeia os nomes das especificações:

| Especificação | CSS | Especificação | CSS |
| --- | --- | --- | --- |
| `fundo` | `--bg` | `texto`, `texto-2`, `texto-3` | `--text`, `--text-2`, `--text-3` |
| `lateral` | `--side` | `ícone` | `--icon` |
| `nível-1/2/3` | `--raised-1/2/3` | `acento`, `acento-sólido`, `-hover` | `--accent`, `--accent-solid`, `--accent-solid-hover` |
| `hover`, `hover-nível` | `--hover`, `--hover-raised` | `sobre-acento` | `--on-accent` |
| `ativo` | `--pressed` | `atraso`, `ok`, `aviso`, `conflito` (e `-bg`) | `--late`, `--ok`, `--warn`, `--conflict` (e `-bg`) |
| `seleção` | `--selected` | `perigo` | `--danger` |
| `fio`, `fio-forte` | `--line`, `--line-strong` | `toast`, `sobre-toast` | `--toast`, `--on-toast` |
| `borda-campo` | `--field-border` | `acento-25`, `acento-35`, `sel-texto`, `veu` | `--accent-25`, `--accent-35`, `--text-selection`, `--scrim` |
| `barra-a-fundo/hover/ativo` | `--sidebar-bg`, `--sidebar-hover`, `--sidebar-active` | `sombra-card`, `-hover`, `sombra`, `sombra-gaveta`, `luz` | `--shadow-card`, `--shadow-card-hover`, `--shadow-float`, `--shadow-drawer`, `--top-light` |
| `campo-b`, `card-hover`, `w-ui` | `--field-bg`, `--card-hover`, `--weight-ui` | `mk-<cor>-bg/fg` | `--mark-<color>-bg/fg`: `violet`, `ochre`, `gray`, `green` |
| `lb-<etiqueta>` | `--label-<cor>`: `blue`, `slate`, `purple`, `teal`, `amber`, `coral`, `lime`, para a paleta de etiquetas da etapa 10 | | |

**Estrutura do CSS gerado:**

```css
:root, :root[data-theme='light'] { color-scheme: light; --bg: #FDFDFE; … }
:root[data-theme='dark'] { color-scheme: dark; --bg: #13161C; … }
@media (prefers-color-scheme: dark) { :root:not([data-theme]) { color-scheme: dark; … } }
```

O bloco de mídia só vale sem JavaScript. Com JavaScript, `theme.js` sempre define `data-theme`.

**Camada de compatibilidade:** as páginas que ficam para as etapas 10 e 11 usam variáveis antigas. `src/web/styles/compat.css` as aponta para os tokens novos, e assim tudo troca de tema desde a primeira entrega:

| Antiga | Nova |
| --- | --- |
| `--canvas` | `--bg` |
| `--nav` | `--sidebar-bg` |
| `--surface` | `--raised-1` |
| `--surface-hover` | `--hover-raised` |
| `--line-soft` | `--line` |
| `--muted` | `--text-2` |
| `--subtle` | `--text-3`: o antigo `#7C8798` não passava de 4,5:1 |
| `--blue` | `--accent` |
| `--blue-bg` | `--selected` |
| `--green` | `--ok` |
| `--red` | `--late` |

`--line` e `--text` mudam de valor sem mudar de nome. O arquivo é removido na etapa 11, quando a última página antiga sai.

### Tema

- **Escolha:** Sistema, Claro ou Escuro. Fica no dispositivo, em `localStorage['tinyfold:theme']`, sem namespace de instalação, porque a tela de login também é tematizada. O padrão é Sistema.
- **Sem piscar:** `src/web/public/theme.js`, adaptado de `orbis/src/web/public/theme.js`, carrega em `<head>` antes do CSS, de forma síncrona e sem `module`.
  - Lê a escolha, resolve com `prefers-color-scheme` e define `document.documentElement.dataset.theme`.
  - Atualiza `<meta name="theme-color">`: `#FDFDFE` no claro e `#13161C` no escuro.
  - Enquanto a escolha for Sistema, acompanha a mudança do sistema.
  - É arquivo, não script em linha, porque a CSP só permite scripts da própria origem.
  - `index.html` ganha `<meta name="color-scheme" content="light dark">`, e `body` usa `background: var(--bg)`.
- **Na interface:** `src/web/shell/theme/theme.ts` (funções puras `parseThemeChoice` e `resolveTheme`, com teste) e `use-theme.ts` (escolha, tema resolvido e assinatura da mídia).
- **Editores:**
  - O BlockNote recebe `theme={resolved}`, e as variáveis `--bn-colors-*` apontam para os tokens nos dois temas.
  - O Excalidraw recebe `theme={resolved}`.
  - A prévia PNG da etapa 07 continua sempre clara.

### Fontes

- **Inter:** `inter-ui` 4.1.1 (OFL), arquivo completo `variable/InterVariable.woff2` (352 KB, eixos `opsz` e `wght`) e `InterVariable-Italic.woff2`.
  - O `@fontsource-variable/inter` atual sai. A versão Google Fonts dele não tem `cv05`, `ss03` nem `case`; foi conferido com fontTools nos arquivos instalados.
  - O subconjunto latino do `inter-ui` (97 KB) também não serve: não tem `→ ← ⌘ ⌥ ⇧ ↵ ⎋`, usados em `kbd` e nas dicas.
- **JetBrains Mono:** `@fontsource-variable/jetbrains-mono` 5.3.0, subconjuntos latin e latin-ext.
- **Faces e emissão:**
  - `src/web/styles/fonts.css` declara as faces com `font-family: 'Inter'` (normal e itálico, `font-weight: 100 900`, `font-display: swap`) e importa o CSS do JetBrains Mono.
  - O Vite emite os arquivos em `/assets/` com hash e cache imutável, dentro de `font-src 'self'`.
  - Se o Vite não resolver o caminho do pacote no `url()`, o plano B é copiar os dois arquivos para `public/fonts/` com nome versionado, como já acontece com as fontes do Excalidraw.
- **Preload:** um plugin pequeno em `vite.config.ts` (`transformIndexHtml` no build) injeta `<link rel="preload" as="font" type="font/woff2" crossorigin>` para o arquivo normal da Inter.
- **Recursos tipográficos:** `font-feature-settings: "cv05", "ss03", "calt"` em `:root`, `tnum` nas classes de números, `case` em `kbd`, e `font-optical-sizing: auto` nos títulos.

### Escala e classes de texto

`src/web/styles/base.css` define as classes da tabela de `visual.md` §3, com os valores de `scale.ts`:

- `.t-title` (30/36 600), `.t-task-title`, `.t-h1`, `.t-h2`, `.t-h3`, `.t-body` (15/24) e `.t-desc`;
- `.t-ui` (13/20, peso `--weight-ui`), `.t-card`, `.t-label` (12/16 500, `--text-3`), `.t-meta` (12/16 com `tnum`), `.t-micro` (11/14 com `tnum` e `case`) e `.t-mono`.

O espaçamento entre letras segue a tabela. Não há peso 700.

### Ícones

- `lucide-react` 1.61.0, já fixado, com importações nomeadas. Cada ícone é um módulo, e o Vite descarta os não usados. Não há conjunto SVG próprio para ícones comuns.
- O traço é definido por regra global: `svg.lucide { stroke-width: 1.5 }`. A propriedade CSS vence o atributo do componente.
- Tamanhos: 16 na interface, 14 na meta e 12 no micro. A cor é sempre `currentColor`, seguindo o texto vizinho.
- Ícones próprios, em `src/web/ui/glyphs/`: `ColumnRing` (anel de coluna, `index ÷ (n − 1)`; nesta etapa, para os três estados fixos, e reaproveitado na etapa 10), `ProjectMark` e `Logo`.

| Uso | Lucide | Uso | Lucide |
| --- | --- | --- | --- |
| Buscar | `Search` | Fixar, desafixar | `Pin`, `PinOff` |
| Visão geral | `LayoutDashboard` | Mover para projeto | `ArrowRightLeft` |
| Quadro | `SquareKanban` | Perfil e token | `KeyRound` |
| Documento | `FileText` | Tema: Sistema, Claro, Escuro | `SunMoon`; `Monitor`, `Sun`, `Moon` |
| Desenho | `Shapes` | Atalhos | `Keyboard` |
| Índice | `Table2` | Sair | `LogOut` |
| Lixeira e excluir de vez | `Trash2` | Restaurar | `RotateCcw` |
| Recolher, expandir | `PanelLeftClose`, `PanelLeftOpen` | Arquivar, desarquivar | `Archive`, `ArchiveRestore` |
| Seletor | `ChevronsUpDown` | Exportar, importar | `Download`, `Upload` |
| Novo, mais ações | `Plus`, `Ellipsis` | Falha, aviso, concluir | `CircleAlert`, `TriangleAlert`, `CircleCheck` |
| Menu (tela estreita) | `Menu` | Fechar | `X` |

### Componentes base

Ficam em `src/web/ui/`, cada um com seu arquivo, seu CSS ao lado e exportação em `ui/index.ts`. Estados e medidas seguem `visual.md` §6.

| Componente | Base | Observações |
| --- | --- | --- |
| `Button` | React Aria `Button` | Variantes `primary`, `secondary`, `ghost`, `danger`; tamanhos 28 e 24 px; `isPending` com spinner |
| `IconButton` | `Button` + `Tooltip` | Sempre com `aria-label`; tooltip com o rótulo e o atalho |
| `TextField`, `SearchField` | `TextField`, `SearchField` | 32 px nos formulários e 28 na lateral; erro com `FieldError` |
| `Menu` | `MenuTrigger`, `Menu`, `SubmenuTrigger`, `Popover` | Itens com ícone, atalho em `Kbd`, separador, grupo, perigo e rádio (submenu Tema) |
| `Popover` | `Popover`, `Dialog` | Raio 10, `--raised-2`, sombra e luz no topo |
| `Dialog`, `AlertDialog` | `Modal`, `Dialog` | Véu `--scrim`. `Dialog` mantém as propriedades atuais, inclusive `closeOnOutsideClick` (usada pelo Perfil). `AlertDialog` tem ação destrutiva e foco inicial em Cancelar |
| `Toast` | Própria (o Toast do React Aria ainda é `UNSTABLE_`) | Canto inferior direito da área de conteúdo, a 16 px das bordas, até 360 px, 6 s, pausa no hover e no foco, ação opcional ("Desfazer"), um por vez com fila. Sucesso com `role="status"` e erro com `role="alert"` |
| `Kbd` | `<kbd>` | 18 px, relevo de tecla, `⌘` no macOS e `Ctrl` nos demais |
| `Banner` | `<div role="status">` | Faixas de falha, conflito, rascunho e arquivado, sem borda lateral |
| `Spinner`, `EmptyState`, `ErrorNotice`, `PageHeader` | Atuais | Movidos e retematizados |
| `ProjectMark` | Própria | Quadrado de 20 px, raio 6, inicial em Inter 600 11 px, cores `--mark-<color>-*` |

`useAction` e `useRequest` não são componentes e vão para `src/web/lib/use-action.ts` e `use-request.ts`.

**Movimento:** durações e curvas de `visual.md` §7 em `scale.ts`. Com `prefers-reduced-motion`, só esmaecimentos de até 80 ms.

## Rotas

Endereços em português. O projeto aparece na URL de toda tela de projeto. Os itens também têm um endereço curto e permanente, que sempre redireciona: é o que vai nos links exportados e no MCP.

| Rota | Tela |
| --- | --- |
| `/` | Redireciona conforme `resolveStartPath`, descrito abaixo |
| `/projetos` | Com projeto ativo, redireciona como `/`. Sem nenhum, mostra o estado vazio |
| `/entrar` | Login. `/login` redireciona |
| `/projetos/$projectId` | Visão geral |
| `/projetos/$projectId/quadro?tarefa=<id>` | Quadro atual, só do projeto. `tarefa` abre o diálogo da tarefa |
| `/projetos/$projectId/indice?tipo=documentos\|desenhos` | Índice |
| `/projetos/$projectId/lixeira` | Lixeira do projeto |
| `/projetos/$projectId/documentos/$documentId?bloco=<id>` | Documento |
| `/projetos/$projectId/desenhos/$canvasId` | Desenho |
| `/perfil` | Perfil, com a lateral do último projeto |

**Redirecionamentos das URLs atuais** (`src/web/router/redirects.ts`, puro e testado):

| Atual | Destino |
| --- | --- |
| `/documentos/$id?bloco=` | `/projetos/<projeto do item>/documentos/$id?bloco=`, depois de ler o item |
| `/desenhos/$id` | `/projetos/<projeto do item>/desenhos/$id` |
| `/documentos?q=` | Índice do último projeto com `tipo=documentos` |
| `/desenhos?q=` | Índice do último projeto com `tipo=desenhos` |
| `/kanban` | `/projetos/<último>/quadro` |
| `/lixeira` | `/projetos/<último>/lixeira` |
| `/login` | `/entrar` |

O `q` das listas antigas é descartado.

**Regras:**

- **Endereço canônico:** se o `$projectId` da URL não for o projeto do item (o item mudou de projeto), a página troca para o endereço canônico com `replace`.
- **Mudar de projeto pelo menu:** a página navega para o novo endereço, e a lateral passa ao novo projeto.
- **Item inexistente** ou excluído de vez: a página "Este item não existe mais" aparece dentro do shell, com o último projeto. Se o navegador guardar um rascunho desse item, ela oferece "Baixar rascunho" (JSON do documento ou `.excalidraw`, os formatos de recuperação atuais).
- **Projeto atual:** vem do parâmetro da rota. Nas rotas de item, vem do próprio item. Em `/perfil`, vem da última localização, mesmo que o projeto esteja arquivado. Em `/projetos` sem projeto ativo, não há projeto atual.
- **Destino das URLs antigas de lista** (`/documentos`, `/desenhos`, `/kanban` e `/lixeira`): o último projeto, mesmo arquivado, porque a lixeira e o Índice de um projeto arquivado são válidos. Sem ele, o primeiro ativo. Sem nenhum, `/projetos`.
- **Foco:** depois de cada navegação, o foco vai ao `h1` da página (`tabindex="-1"`), como no protótipo. A região viva anuncia o título.
- **Rotas fora de `main.tsx`:** a árvore vai para `src/web/router/routes.tsx`. Documento, desenho e Perfil continuam carregados sob demanda.

### Última localização

Guardada no dispositivo, em `localStorage['tinyfold:<installationId>:nav']`, com `try/catch` e leitura tolerante (`src/web/router/last-location.ts`, puro e testado):

```json
{ "version": 1, "lastProjectId": "…",
  "projects": { "<id>": { "path": "/projetos/…/documentos/…", "scrollTop": 840, "at": "2026-10-31T12:00:00.000Z" } } }
```

- **Gravação:** a cada navegação, e a rolagem com intervalo de 250 ms e em `pagehide`.
- **Leitura:** `/` abre o caminho do último projeto e restaura a rolagem depois da primeira renderização do conteúdo. No documento, isso espera o BlockNote montar.
- **Seletor:** trocar de projeto pelo seletor abre a Visão geral do projeto, como pede o conceito. O caminho guardado de cada projeto só serve para reabrir o aplicativo.
- **Início (`resolveStartPath`, puro e testado):**
  1. Se o último projeto existe e está ativo, abre o caminho guardado dele.
  2. Se não, abre a Visão geral do primeiro projeto ativo do seletor.
  3. Sem projeto ativo, abre `/projetos`.
  
  Um caminho para item excluído é descartado em silêncio. O último projeto arquivado não é reaberto no início, para quem arquivou tudo cair no estado vazio, e não num projeto arquivado.

Preferências da lateral, também por dispositivo: `tinyfold:<installationId>:sidebar` com `{ collapsed, sections: { <projectId>: { documents: { open, sort }, drawings: { open, sort } } } }`.

## Shell

### Layout e larguras

| Largura da janela | Lateral | Topo |
| --- | --- | --- |
| A partir de 1100 px | Fixa, com 248 px, ou faixa de 52 px quando recolhida por ⌘\ (estado lembrado) | Cabeçalho de página de 44 px |
| De 720 a 1099 px | Começa como faixa de 52 px. Expandir abre a lateral em sobreposição, com véu | Igual |
| Abaixo de 720 px | Sem faixa. A lateral abre em sobreposição com `min(320px, 100vw − 48px)`, com véu | Barra de 44 px com `Menu` (abre a lateral), marca e nome do projeto (abre o seletor) e `Search` (⌘K) |

- **Regiões:** a lateral, a página (`main`, com rolagem própria) e, na etapa 10, a gaveta. F6 e ⇧F6 percorrem as regiões.
- **Sobreposição:** é uma camada da pilha do Esc, fecha ao navegar e devolve o foco ao botão que a abriu.
- **Celular:** os fluxos de escrita, desenho, mover tarefa por menu, lixeira e Perfil precisam funcionar em toque e tela estreita. O desenho do celular continua em aberto.

### Lateral, variante A

Medidas, tipografia e estados seguem [sidebar.md](../interface/sidebar.md), variante A. Os pontos abaixo completam a especificação para a implementação:

**Topo (fixo):**

- Cabeçalho de 44 px: botão do seletor de 32 px (marca de 20, nome em 13/20 600, `ChevronsUpDown`) e botão recolher de 28 px, visível no hover do cabeçalho ou com foco.
- **Buscar:** linha com `Search` e o `kbd` "/". Clicar nela ou apertar `/` a transforma num campo, no mesmo lugar e com a mesma altura.
- Navegação: Visão geral e Quadro. À direita do Quadro fica a contagem de tarefas abertas em `--text-3`; a contagem de atrasadas chega na etapa 10.

**Seções Documentos e Desenhos (área que rola):**

- **Rótulo:** 24 px, com o número total à direita. Clicar no rótulo recolhe ou expande a seção; com foco no rótulo, ← e → fazem o mesmo.
- **Hover ou foco no rótulo:** aparecem o chevron, o "+" (cria no projeto) e o "⋯" (Ordenar por Recentes, A–Z ou Criação).
- **Conteúdo:**
  - os fixados da seção, sem alfinete;
  - um fio `--line` de x=40 a 232;
  - até 8 itens na ordem escolhida;
  - "Ver todos · n", que abre o Índice filtrado pelo tipo.
- **Item ativo:** sempre aparece. Se estiver além dos 8, entra como nona linha, acima de "Ver todos".
- **Hover num item fixado:** o botão "Desafixar" (`PinOff` 14) aparece no lugar da contagem.
- **Pendente:** o ponto de 6 px em `--late` antes da borda direita indica alteração não salva ou falha de salvamento, com `aria-label` "não salvo".
  - A origem é um registro em memória (`src/web/lib/save-registry.ts`) que assina os `AutosaveController` de documentos e desenhos abertos na sessão.
- **Projeto arquivado:** a seção esconde o "+".

**Rodapé (fixo, 44 px):**

- Avatar de 20 px, "Você" e chevron, que abrem o menu Você.
- À direita, o botão da Lixeira com a contagem.

**Faixa recolhida (52 px):**

- Botões de 32 px: marca (abre o seletor), Buscar (abre a lateral com o campo focado), Visão geral, Quadro, Documentos e Desenhos.
- Documentos e Desenhos abrem um popover de 280 px com a mesma lista curta e "Ver todos".
- Embaixo, separados por um fio: Lixeira, Você e expandir.

**Teclado e acessibilidade:**

- `nav aria-label="Projeto <nome>"`. As linhas são links reais (`<a>`), e o clique do meio abre outra aba.
- ↑ e ↓ percorrem as linhas visíveis (foco itinerante em `use-roving-focus.ts`); Home e End vão à primeira e à última; ↵ abre.
- Com foco num item: P fixa ou desafixa e M abre "Mover para projeto…".
- A etapa 09 troca as seções pela árvore `Tree` do React Aria.

**Dados:** uma consulta por projeto, `projectNavigation` (ver Contratos). Ela é invalidada a cada salvamento (o título pode mudar), ao fixar, ao mover, ao excluir e ao restaurar.

### Seletor de projetos

Popover de 300 px ancorado no botão do seletor. Também abre por G P, pela marca na faixa e pela barra estreita.

- Campo de filtro sem borda, com fio inferior. A busca ignora caixa e acentos com o `searchText` do domínio.
- **Ativos:** na ordem do seletor (`position`). Cada linha tem 30 px, com marca, nome e `G n` em `Kbd` para os 9 primeiros.
  - O projeto atual leva um check `--accent` no lugar do atalho.
  - A coluna de atrasadas fica reservada para a etapa 10.
- **Arquivados:** depois dos ativos, sem atalho.
- "+ Novo projeto", separado por um fio.
- ↑ e ↓ navegam, ↵ abre a Visão geral do projeto e Esc fecha.

**Diálogo "Novo projeto" e "Renomear projeto":**

- Campo **Nome**, de 1 a 100 caracteres. Sem nome, o erro inline diz "Dê um nome ao projeto." Nomes repetidos são permitidos.
- **Cor da marca:** `RadioGroup` com as quatro cores (Violeta, Ocre, Cinza, Verde), cada uma mostrando a marca com a inicial do nome digitado. O novo projeto começa na primeira cor não usada por projetos ativos.
- Botões [Cancelar] e [Criar projeto] ou [Salvar].
- Criar entra no fim dos ativos e abre a Visão geral, com o toast "Projeto <nome> criado."

**Menu ⋯ do projeto** (no topo da Visão geral):

- Renomear e cor da marca…
- Subir no seletor e Descer no seletor, desabilitados nas pontas.
- Índice e Lixeira do projeto.
- Arquivar.
  - Arquivar mostra o toast "<nome> arquivado. O conteúdo está preservado." com "Desarquivar" como ação. A página não muda: continua na Visão geral, agora com a faixa de arquivado.
  - Arquivar o último projeto ativo é permitido. Nada mais muda na tela; o estado vazio só aparece na próxima ida a `/` ou a `/projetos`.

**Projeto arquivado:**

- Visão geral com a faixa "Projeto arquivado. O conteúdo está preservado." e o botão Desarquivar.
- Nenhuma ação de criar. O servidor já recusa a criação nesse caso.
- O menu mostra só Desarquivar e Lixeira.

### Sem projeto ativo (`/projetos`)

Acontece numa instalação nova (sem itens soltos não há Geral) ou depois de arquivar todos os projetos. O estado vazio é uma tela calma, com o shell reduzido.

**Página** (coluna de 720 px, centrada, com 72 px de respiro no topo):

| Situação | Conteúdo |
| --- | --- |
| Nenhum projeto | Título "Comece um projeto". Texto "No Tinyfold, documentos, desenhos e tarefas vivem dentro de um projeto." Botão primário [Novo projeto] |
| Só projetos arquivados | Título "Nenhum projeto ativo". Texto "Crie um projeto ou desarquive um dos arquivados. O conteúdo deles está preservado." Botão primário [Novo projeto] |

Com projetos arquivados, aparece abaixo a seção "Arquivados".

- Cada linha de 36 px tem a marca, o nome e "arquivado em 12 out", com os botões [Abrir] e [Desarquivar].
- Desarquivar mostra o toast "<nome> desarquivado." e abre a Visão geral do projeto.
- Abrir mostra a Visão geral arquivada, com a faixa de sempre.

**Lateral reduzida:**

- O cabeçalho mostra o logotipo e "Nenhum projeto ativo" no botão do seletor, que continua abrindo o seletor.
- Fica a linha Buscar. Ela abre o ⌘K, porque não há projeto para filtrar.
- Somem Visão geral, Quadro, as seções e a Lixeira, que são do projeto.
- O rodapé mantém o menu Você.
- Na faixa recolhida e na barra estreita ficam o mesmo seletor, Buscar e Você.

**Comportamentos:**

| Onde | Sem projeto ativo |
| --- | --- |
| Seletor | Sem o grupo Ativos: mostra Arquivados e "+ Novo projeto". Escolher um arquivado abre a Visão geral dele |
| ⌘K | Itens continua buscando em todos os projetos, inclusive nos itens de projetos arquivados, sinalizados. Projetos lista os arquivados, com a ação "Desarquivar <nome>". Comandos mostra só Novo projeto, Tema, Recolher a lateral, Perfil e token, Atalhos e Voltar |
| N | Abre o diálogo "Novo projeto" |
| G 1–9, G V, G Q, G L, P e M | Sem efeito; a região viva anuncia "Nenhum projeto ativo." Num projeto arquivado aberto, G V, G Q e G L continuam valendo para ele |
| Cópia de recuperação ou importação | Sem projeto ativo para receber a cópia, a faixa oferece "Baixar cópia" (JSON ou `.excalidraw`) e explica: "Nenhum projeto ativo para receber a cópia. Baixe a cópia ou desarquive um projeto." Nada se perde |
| Servidor | Criar item exige projeto ativo, como hoje. A compatibilidade transitória com `null` responde `VALIDATION`: "Crie ou desarquive um projeto antes de criar itens." |
| Última localização | Continua guardada. `resolveStartPath` leva a `/projetos` |
| MCP | `list_projects` devolve `projects: []`, e `includeArchived: true` lista os arquivados. As demais ferramentas seguem iguais, com os itens dos projetos arquivados sinalizados por `projectArchived` |

Criar o primeiro projeto pelo diálogo leva à Visão geral dele, e o shell completo volta.

### Buscar e ⌘K

**Buscar na lateral** (`/`): filtra o projeto atual.

- Usa `workspace.search` com `projectId`, `types: ['document', 'drawing']`, `limit: 20` e espera de 120 ms.
  - As regras são as da busca MCP: palavras normalizadas, todas exigidas em qualquer ordem, título primeiro e trecho de `excerptAround`.
  - Uma consulta que fica vazia sem acentos e pontuação mostra a mensagem do servidor.
  - O destaque marca cada palavra encontrada.
  - Sem paginação na lateral: a última linha leva ao ⌘K.
- Os resultados substituem as seções, em grupos "Documentos · 2" e "Desenhos · 0", com o trecho em 12/16 `--text-3` e o termo destacado em 600.
- ↵ abre o primeiro resultado.
- A última linha é sempre "Buscar em todos os projetos" com ⌘K, que leva o texto digitado.
- O primeiro Esc limpa o texto; o segundo devolve o foco à página.

**⌘K:** `Modal` com `Autocomplete`, `SearchField` e `Menu` em seções, do React Aria. O painel tem 640 px, fica a 12vh do topo e segue `visual.md` §6.

| Grupo | Conteúdo |
| --- | --- |
| Neste item | Ações da tela atual: Exportar e Importar `.md` ou PNG/`.excalidraw`, Fixar ou desafixar, Mover para projeto…, Mover para a lixeira |
| Itens | `workspace.search` em todos os projetos (documentos, desenhos e tarefas), até 12, com marca e nome do projeto à direita, trecho e termo destacado. Sem texto, mostra os 8 editados mais recentemente |
| Projetos | Filtro local de `listProjects` |
| Comandos | Novo documento, desenho ou tarefa no projeto atual; Trocar de projeto…; Visão geral, Quadro, Índice e Lixeira do projeto; Tema: Sistema, Claro e Escuro (com "atual"); Recolher ou expandir a lateral; Perfil e token; Novo projeto; Atalhos; Salvar agora; Voltar |

- Os comandos são filtrados localmente por rótulo e palavras-chave com `searchText`.
- O rodapé de 32 px mostra ↑↓, ↵ e esc.
- Abrir uma tarefa leva a `/projetos/<projeto>/quadro?tarefa=<id>`.
- O ⌘K não abre quando o foco está dentro do Excalidraw, como hoje.

### Visão geral (`/projetos/$projectId`)

Coluna de 720 px. O título do projeto vem no estilo de página. Cada seção tem um rótulo em 12/16 500 `--text-3` acima do conteúdo e um fio entre as seções (refino §8).

- **Resumo:** "5 tarefas abertas. Último texto editado: Visão do produto, hoje."
- **Agora:** as tarefas de "Em andamento", na ordem do quadro, até 6.
  - Cada linha de 36 px tem o anel de estado, o título em 14/20 500, a meta "Em andamento" em 12/16 `--text-3`, e abre o diálogo da tarefa no lugar.
  - O rodapé resume o que ficou de fora ("Mais 3 em A fazer") e leva ao link "Abrir quadro".
  - Vazio: "Nada pede atenção agora."
  - A etapa 10 acrescenta atrasadas e prazos próximos, pela regra do protótipo (`agoraTasks`).
- **Editados recentemente:** os 5 documentos ou desenhos editados por último, com tipo e trecho numa linha só (`line-clamp: 1`) e a data à direita.
- **Projeto vazio:** a seção "Começar" com "Este projeto está vazio." e os botões Documento, Desenho e Tarefa.
- "Concluídas · 14 dias" chega na etapa 10.

Dados: `projectOverview`.

### Índice (`/projetos/$projectId/indice`)

- Título "Índice" e o resumo "12 itens em Tinyfold. Clique no cabeçalho de uma coluna para ordenar."
- Filtro "Tipo: Todos ⌄", que corresponde a `?tipo=`.
- `Table` do React Aria com as colunas Título (ícone do tipo e link), Tipo, Trecho (uma linha) e Editado (`tnum`, à direita).
  - Ordenável por Título, Tipo e Editado, com `aria-sort`. A ordem padrão é Editado decrescente, lembrada no dispositivo.
  - Linhas de 36 px com fio `--line`.
- A coluna Ligações chega na etapa 11, e o agrupamento por pasta na etapa 09.
- Botão "Novo", que abre o menu Novo.
- Vazio: "Nada aqui."

Dados: `listDocuments` e `listCanvases` do projeto, unidos no cliente. Elas já devolvem o resumo de até 280 caracteres.

### Lixeira (`/projetos/$projectId/lixeira`)

- Título "Lixeira" e o resumo "Itens excluídos de <projeto> podem ser restaurados."
- Filtro "Tipo: Todos, Documentos, Desenhos ou Tarefas".
- Grupos por data de exclusão: Hoje, Esta semana (6 dias anteriores) e Mais antigos.
- Cada linha tem título, tipo e os botões [Restaurar] e [Excluir de vez…]. O agrupamento é uma função pura (`trash-groups.ts`) com teste.
- **Excluir de vez:**
  - `AlertDialog`: "Excluir de vez “<título>”? Não dá para desfazer. Tarefas que nasceram deste documento continuam, com o trecho guardado."
  - A segunda frase só aparece para documentos com tarefas originadas.
  - Botões [Cancelar] e [Excluir de vez] (perigo). Depois, o toast "Excluído de vez."
- **Esvaziar lixeira** (no topo, só com itens):
  - "Esvaziar a lixeira de <projeto>? 7 itens serão excluídos de vez. Não dá para desfazer." Depois, o toast "Lixeira vazia."
  - Envia exatamente os itens mostrados. Um item restaurado em outro aparelho nesse meio-tempo é preservado, e o toast informa quantos foram mantidos.
- Restaurar devolve o item ao projeto, com o toast "“<título>” restaurado." e o link "Abrir".
- O botão do rodapé da lateral e G L abrem esta página.

Dados: `listTrash`, `restoreDocument`, `restoreCanvas`, `restoreTask` (novo), `purge*` e `emptyTrash`.

### Menu Você, Perfil e atalhos

**Menu Você:**

- Perfil e token.
- Tema ▸ (Sistema, Claro, Escuro), em rádio, com o toast "Tema: Escuro."
- Atalhos (`?`).
- Sair, com a confirmação "Sair deste navegador? Os rascunhos guardados aqui continuam no navegador."

**Perfil (`/perfil`):**

- As seções da etapa 07 vão para a coluna de 720 px, com rótulos de seção e fios, sem sobretítulo. São os arquivos de `src/web/pages/profile/`:
  - `ProfilePage`, `PasswordSection`, `SessionsSection` e `AccessTokensSection`;
  - `NewAccessTokenDialog`, `CreatedAccessToken` e `RevokeAccessTokenDialog`;
  - `access-tokens.ts`, `format.ts` e `profile.css`.
- O comportamento da etapa 07 se mantém: recarga da lista no `focus`, o passo "Token gerado" que ignora cliques fora (`closeOnOutsideClick`) e o campo de nome sem preenchimento automático.
- Prefixo, token e comando passam da fonte monoespaçada do sistema para `--font-mono` (JetBrains Mono).
- Ganha a seção **Aparência** (`AppearanceSection.tsx`), com o tema em `RadioGroup` e o mesmo efeito do menu.
- Ordem: Aparência, Acesso pelo Claude Code, Dispositivos conectados, Senha e Sair.

**Atalhos (`?`):** diálogo com a tabela da seção Teclado. A frase de abertura vem do protótipo: "Atalhos de uma tecla não funcionam dentro de campos de texto. Esc fecha só a camada aberta mais recente."

**Login (`/entrar`):** cartão centrado com o logotipo, no tema escolhido. O comportamento atual de sessão expirada não muda.

### Páginas existentes no shell

Cada página fica numa `PageFrame` (`src/web/shell/PageFrame.tsx`):

- cabeçalho de 44 px com espaço à direita para o estado de salvamento e o ⋯;
- `main` com rolagem própria e `data-scroll-key` para a última localização;
- `h1` focável.

| Página | Ajustes nesta etapa (restyle completo nas etapas 10 e 11) |
| --- | --- |
| Documento (`DocumentEditor.tsx`) | Sai o link de voltar e o `<select>` de projeto do cabeçalho. Entram no ⋯: "Mover para projeto…" (submenu com os projetos ativos, toast com "Desfazer"), Fixar ou desafixar, e os itens atuais. "Sem projeto" deixa de existir. BlockNote no tema resolvido. Rascunho antigo com `projectId: null` é recuperado no projeto atual do documento |
| Desenho (`CanvasEditor.tsx`) | Os mesmos ajustes do documento, com o Excalidraw no tema resolvido. A sessão por desenho (autosave, `CanvasPreviewUploader` e `onAdopted`) e `withCleanLinks` não mudam. A prévia continua sempre clara (`renderCanvasPng(…, { darkMode: false })`), e "Exportar PNG" passa a seguir o tema resolvido em vez de sempre escuro. Importar ou salvar cópia num projeto arquivado cria no último projeto ativo do dispositivo (ou no primeiro do seletor), com o aviso "Cópia criada em <projeto>, porque <arquivado> está arquivado." Sem projeto ativo, oferece "Baixar cópia" (ver "Sem projeto ativo"). A mesma regra vale para "Salvar como cópia" no documento |
| Quadro (`Board.tsx`) | Sai o quadro geral e o filtro de projeto: `Kanban projectId` vem da rota, com o título "Quadro". `?tarefa=` abre a tarefa. O `<select>` de projeto do diálogo perde "Sem projeto" |
| Diálogo da tarefa | `TaskDialog` e `LinkedTask` saem de `Board.tsx` para `src/web/components/task/`. Um único diálogo, mantido pelo `AppProvider`, atende `openTask(id)` e `newTask(contexto)` em qualquer tela: quadro, Visão geral, ⌘K, menu Novo e documento. A etapa 10 troca o diálogo pela gaveta no mesmo ponto |

**Menu Novo** (N, "+" da lateral, botão Novo): "Novo em <projeto>", com Documento, Desenho e Tarefa. Cria no projeto atual; com o projeto arquivado, mostra o toast "Projeto arquivado: desarquive para criar itens."

**Mover item de projeto:**

- Limpa o fixado.
- Mostra o toast "“<título>” foi para <projeto>." com "Desfazer", que move de volta e fixa de novo se havia vaga.
- Se o item aberto mudou de projeto, a página passa ao endereço canônico.

## Teclado e Esc

**Atalhos desta etapa** (`src/web/shell/keyboard/`):

| Atalho | Ação |
| --- | --- |
| ⌘K (Ctrl+K) | Buscar e comandar |
| G P | Trocar de projeto |
| G 1–9 | Abrir a Visão geral do projeto n do seletor |
| G V, G Q, G L | Visão geral, Quadro e Lixeira do projeto atual |
| ⌘\ | Recolher ou expandir a lateral; na sobreposição, abrir ou fechar |
| F6, ⇧F6 | Lateral → página e volta (a gaveta entra na etapa 10) |
| `/` | Buscar no projeto (lateral) |
| N | Menu Novo no projeto atual |
| P, M | Na lateral ou na página de um item: fixar ou desafixar, e mover para projeto |
| ? | Atalhos |
| ⌘S | Salvar agora; depois de falha, tentar de novo (`flush` do autosave da página) |
| ⌘[ | Voltar no histórico do navegador |
| ↑ ↓, Home, End, ←/→ no rótulo | Navegação da lateral e das listas |
| Esc | Fecha a camada aberta mais recente |

**Guardas:**

- Atalhos de uma tecla e acordes G valem só fora de campos editáveis (`input`, `textarea`, `contenteditable`), fora do Excalidraw (`.excalidraw`, que usa letras para ferramentas) e sem modificadores.
- O acorde G espera a segunda tecla por 1,5 s.
- ⌘K e ⌘\ funcionam em qualquer lugar, exceto ⌘K dentro do Excalidraw.
- ⌘S não é interceptado fora das páginas de documento e desenho.
- Atalhos ficam em `use-shortcuts.ts` (um único ouvinte em `window`), `chords.ts` (puro, testado com relógio falso) e `guards.ts` (puro).

**Regra do Esc** (`layers.ts` e `use-layer.ts`):

- Cada camada registra-se numa pilha ao abrir: sobreposição da lateral, campo de Buscar com texto, campo de Buscar com foco e as camadas próprias da etapa 10.
- Popovers, menus, diálogos, ⌘K e seletor do React Aria já fecham só o mais recente e interrompem a propagação do Esc.
- O ouvinte global atua só quando o evento chega sem `defaultPrevented`:
  1. Num campo editável (inclusive o editor), o primeiro Esc tira o foco do campo e o devolve ao contêiner da página ou do editor. Os menus do BlockNote continuam tratando o próprio Esc.
  2. Senão, fecha o topo da pilha.
  3. Com a pilha vazia, não faz nada.
- **Nunca:** navegar, apagar, confirmar ou recolher a lateral fixa.
- No Excalidraw, o Esc continua com o próprio editor.

## Dados

### Migração `src/workspace/infra/migrations/005_projects_required.sql`

A etapa 07 já usou a 004 (`004_canvas_preview_fingerprint.sql`), então esta é a 005.

Roda na transação do executor de migrações (atômica: falhou, nada muda). Como o executor registra o checksum, ela nunca roda duas vezes. Mesmo assim, cada passo é condicional e determinístico.

O roteiro foi ensaiado sobre as migrações 001 a 003 reais, com `foreign_keys=ON`: integridade e `foreign_key_check` ficaram limpos. A 004 só acrescenta a coluna `scene_fingerprint` a `workspace_canvas_previews` e não toca nas tabelas desta migração. O teste de banco repete o ensaio sobre 001 a 004.

1. **Cor e ordem:**
   - `workspace_projects` ganha `color TEXT NOT NULL DEFAULT 'gray' CHECK (color IN ('violet','ochre','gray','green'))` e `position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0)`.
   - Os projetos existentes recebem a posição pela ordem atual da lateral (`updated_at` decrescente, desempate por `id`).
   - As cores são atribuídas em rodízio por data de criação: Violeta, Ocre e Verde. O Cinza fica para o Geral.
2. **Projeto Geral:**
   - Criado só se houver documento, desenho ou tarefa sem projeto, inclusive na lixeira.
   - A instalação nova e uma base só com projetos arquivados não ganham Geral: caem no estado vazio, que oferece "Novo projeto". Criar um projeto vazio chamado Geral não traria nada que o estado vazio já não resolva.
   - ID fixo `00000000-0000-4000-8000-000000000001` (UUID v4 válido para o Zod), nome "Geral", cor `gray`, última posição e datas da migração.
   - Depois da migração, o Geral é um projeto comum: nenhuma regra do código depende desse ID.
3. **Itens soltos:**
   - Documentos, desenhos e tarefas com `project_id` nulo passam ao Geral, inclusive os da lixeira.
   - `version` e `updated_at` não mudam: a migração não é uma edição. Assim, autosaves e prévias de desenho (ligadas à versão) continuam válidos, e a ordem de recentes se mantém.
   - `board_revision` sobe 1, para que um movimento baseado na leitura antiga seja recusado.
4. **Projeto obrigatório:** seis gatilhos `BEFORE INSERT` e `BEFORE UPDATE OF project_id` em `workspace_documents`, `workspace_canvases` e `workspace_tasks` recusam `project_id` nulo com `RAISE(ABORT, '<tabela>.project_id is required')`.
   - Reconstruir essas tabelas para trocar a coluna exigiria desligar `foreign_keys` fora da transação do executor (procedimento de 12 passos do SQLite), porque `workspace_task_sources` e `workspace_canvas_previews` as referenciam.
   - A etapa 10 reconstrói `workspace_tasks` de qualquer forma e pode levar o `NOT NULL` junto.
   - O `ON DELETE SET NULL` das chaves de projeto passa a ser bloqueado pelos gatilhos. Projetos não são excluídos de vez no produto, e o gatilho serve de proteção.
5. **Fixados:** `pinned_at TEXT` em `workspace_documents` e `workspace_canvases`, com índice parcial `(project_id, pinned_at) WHERE pinned_at IS NOT NULL`.
6. **Origem das tarefas:**
   - `workspace_task_sources` é reconstruída. Nenhuma tabela a referencia, então isso funciona dentro da transação com chaves ativas.
   - Nova definição: `document_id TEXT REFERENCES workspace_documents(id) ON DELETE SET NULL` (anulável) e `document_title TEXT NOT NULL` (título do documento copiado na migração).
   - O índice por documento é recriado.

### Regras novas

- **Projeto obrigatório:** criar documento, desenho ou tarefa exige `projectId`. A exceção é a tarefa criada de um trecho, que herda o projeto do documento.
  - O projeto precisa existir e estar ativo, como hoje.
  - Mover um item exige projeto ativo e limpa o fixado.
- **Arquivar:** qualquer projeto pode ser arquivado, inclusive o último ativo (decisão do usuário). Sem projeto ativo, o aplicativo mostra o estado vazio. Nenhuma regra do servidor depende de haver um projeto ativo, além da criação de itens.
- **Cor e marca:** a cor é uma das quatro chaves. A marca é a inicial do nome, pela função pura `projectInitial(name)`: primeiro grafema por `Intl.Segmenter`, em maiúscula pt-BR, com "?" para nome vazio. Não é guardada.
- **Ordem:** `moveProject` reposiciona entre os ativos sem mudar a `version` do projeto. A ordem não conflita com renomear em outro aparelho, e vale a última gravação.
- **Fixados:**
  - Até 8 por projeto, somando documentos e desenhos. O 9.º é recusado com `DOMAIN_RULE`: "Máximo de 8 fixados neste projeto. Desafixe um item antes."
  - Fixar não muda `version` nem `updated_at`, para não gerar conflito com o autosave de uma página aberta. É uma escrita repetível, feita por `WorkspaceContext.writeWithoutRequestRecord` (da etapa 07), sem registro de pedido.
  - Mover para a lixeira e mover de projeto limpam o fixado.
  - Fixados aparecem em ordem de `pinned_at`.
- **Restaurar tarefa:** `restoreTask` devolve a tarefa ao fim da coluna (`nextPosition`), incrementa a versão e a revisão do quadro.
- **Exclusão definitiva:** só para item na lixeira (senão `DOMAIN_RULE`: "Mova o item para a lixeira antes de excluir de vez."), com `expectedVersion` e `requestId` idempotente. A resposta é compacta: `{ id }`.

  | Item | Efeito |
  | --- | --- |
  | Documento | Antes de apagar, `document_title` das origens recebe o título atual. A linha é apagada, e `document_id` das origens vira nulo. A tarefa continua, com o trecho e o título guardados ("Documento excluído: <título>") |
  | Desenho | A linha é apagada, e a prévia cai em cascata |
  | Tarefa | A linha é apagada, a origem cai em cascata e a revisão do quadro sobe |
  | Rascunhos locais desse item | Ficam no navegador. A página "não existe mais" oferece baixá-los |
  | Links em documentos para o item | Levam à página "não existe mais" |
  | Itens incorporados (etapa 11) | O documento guarda só o ID. O resolvedor informa "excluído", e o bloco mostra "Item excluído" com "Remover" |
  | Registro de pedidos | Guarda só `{ id }` e expira em 30 dias, como os demais |

- **Esvaziar lixeira:** `emptyTrash` recebe os itens mostrados (`{ type, id, version }`, até 500). Numa transação, exclui de vez os que continuam na lixeira daquele projeto com a mesma versão e pula os demais. Devolve `{ purged, skipped }`.

## Contratos RPC

Os acréscimos são aditivos. A remoção de `null` como "sem projeto" é a única quebra.

**Compatibilidade transitória:** para cada entrega ficar verde enquanto a interface antiga ainda envia `null`, o backend aceita `null` durante a etapa:

- na criação, como "primeiro projeto ativo do seletor". Sem projeto ativo, a resposta é `VALIDATION`;
- ao salvar, como "manter o projeto atual";
- nos filtros de lista, como lista vazia.

A última entrega do backend remove essa tolerância. Uma aba antiga aberta durante a implantação recebe `VALIDATION` ao salvar com `null`. O rascunho fica preservado, e a aba recarregada usa o bundle novo.

**Alterados:**

| Procedimento | Mudança |
| --- | --- |
| `listProjects` | `Project` ganha `color` e `position`. Ativos vêm por `position` e arquivados por `archivedAt` decrescente |
| `createProject` | Aceita `color` opcional. O padrão é a primeira cor não usada por projetos ativos, ou `violet`. Entra no fim dos ativos |
| `updateProject` | Aceita `color`. Arquivar continua como hoje, sem restrição ao último ativo |
| `createDocument`, `createCanvas` | `projectId` obrigatório. `createDocument` passa a responder `{ id, version, updatedAt }`, sem título nem conteúdo, como `createCanvas` |
| `createTask` | `projectId` obrigatório, exceto com `source` |
| `createTask`, `updateTask`, `moveTask`, `restoreTask` | Respondem `{ id, projectId, version, updatedAt, revision }`, sem título nem trecho: o registro de pedidos guarda a resposta por 30 dias, e a exclusão definitiva não deixa o texto lá |
| `saveDocument`, `saveCanvas` | Sem `projectId`: salvar nunca move o item, quem move é `moveItem`. Um `projectId` que um cliente antigo ainda envie é descartado, como qualquer chave desconhecida |
| `updateTask` | `projectId` opcional, sem `null` |
| `listDocuments`, `listCanvases`, `listTasks` | Filtro `projectId` sem `null`. Resumos de documento e desenho ganham `pinnedAt` |
| `Task.source` (`domain/models.ts`, hidratado em `infra/repository/tasks.ts`) | `documentId: string \| null` e `documentTitle` sempre presente. `null` significa documento excluído de vez, com o título guardado. `available` e `blockAvailable` ficam falsos. `excerptPresent` (`domain/task-source.ts`) só roda com documento |
| `getDocument`, `getCanvas` | Ganham `pinnedAt`. `getCanvas` continua com `previewVersion` e `previewCurrent`, da etapa 07 |

**Novos:**

| Procedimento | Entrada | Saída |
| --- | --- | --- |
| `moveProject` | `{ requestId, id, beforeProjectId: uuid \| null }` | `Project[]` ativos na nova ordem |
| `projectNavigation` | `{ projectId, documentsSort?, drawingsSort?: 'recent'\|'title'\|'created', limit?: 1–20 (padrão 8) }` | `{ documents: { total, pinned: NavItem[], items: NavItem[] }, drawings: { … }, openTasks, trashCount }`, com `NavItem = { id, title, updatedAt, createdAt, pinnedAt }`. `items` exclui os fixados |
| `projectOverview` | `{ projectId }` | `{ openTasks, now: Task[] (até 6, de "Em andamento"), rest: [{ status, count }], recent: [{ type, id, title, updatedAt, excerpt }] (5), lastEdited: { type, id, title, updatedAt } \| null }` |
| `search` | O `SearchInput` de `application/reading/schemas.ts` (`query`, `projectId`, `types`, `limit` de 1 a 50, `cursor`) | `{ items, nextCursor }` com o cursor por chave `s~…`, como no MCP. É o mesmo caso de uso (`application/reading/search.ts`) exposto por RPC, sem o orçamento de texto da formatação MCP. Os itens ganham `pinned` (seção MCP) |
| `listTrash` | `{ projectId }` | `{ items: [{ type: 'document'\|'drawing'\|'task', id, title, version, deletedAt }] }`, até 1.000, por `deletedAt` decrescente |
| `restoreTask` | `{ requestId, id, expectedVersion }` | `{ id, projectId, version, updatedAt, revision }` |
| `moveItem` | `{ requestId, type: 'document'\|'drawing', id, projectId, expectedVersion }` | `{ id, projectId, version }`. Não é edição: `updatedAt` fica, a versão sobe e o fixado vai embora. Projeto arquivado dá `VALIDATION` |
| `purgeDocument`, `purgeCanvas`, `purgeTask` | `{ requestId, id, expectedVersion }` | `{ id }` |
| `emptyTrash` | `{ requestId, projectId, items: [{ type, id, version }] }` | `{ purged, skipped }` |
| `pinItem`, `unpinItem` | `{ type: 'document'\|'drawing', id }` | `{ pinnedAt: string \| null }`. Repetível, sem `requestId` |

O teste de servidor que chama todos os procedimentos sem sessão cobre os novos automaticamente.

**Invalidação no cliente:** as chaves continuam sob `['workspace', …]`. `projectNavigation` e `projectOverview` são invalidadas pelo `onSaved` dos editores e pelas ações desta etapa.

## MCP

Sem ferramentas novas. As mudanças partem do modelo de leitura de `main`: porta `WorkspaceReader` em `application/reading/ports.ts`, SQL em `infra/reader/`, formatação em `infra/mcp/` e limites em `domain/reading-limits.ts`.

| Ferramenta ou peça | Mudança |
| --- | --- |
| `list_projects` (`application/reading/list-projects.ts`, `infra/reader/projects.ts`, `infra/mcp/list-projects.ts`) | Sai `withoutProject` e o método `WorkspaceReader.withoutProjectCounts`; as contagens por projeto deixam de ter a chave `null`. Cada projeto ganha `color` (chave da cor) e `position` (ordem no seletor, `null` para arquivados) |
| `list_projects`: ordem e cursor | A ordem continua `updatedAt` decrescente, com o cursor `p~<updatedAt>~<id>` e as páginas de até 200 (`READING_LIMITS.projects`). Paginar pela ordem do seletor exigiria fixar uma revisão, como no quadro, porque reordenar renumera as posições. Quem precisar da ordem do seletor usa `position` |
| `list_projects`: descrição | Diz que todo item pertence a um projeto e que, sem projeto ativo, a lista vem vazia; nesse caso, `includeArchived: true` mostra os arquivados |
| `ProjectReference` (`application/reading/ports.ts`) | `projectId` e `projectName` passam a ser `string`, sem `null`. Em `infra/reader/shared.ts`, a junção com `workspace_projects` passa a ser interna, porque os gatilhos garantem o projeto, e o comentário "Until stage 08" sai |
| `search` (`infra/reader/searchable.ts`) | Documentos e desenhos ganham `pinned: boolean`, de `item.pinned_at is not null`. `pinned_at` existe nas duas tabelas, então continua dentro das colunas comuns que `searchableItems` admite. A ordem e o cursor `s~…` não mudam |
| `list_tasks` e `read_task` | `sourceDocument` (`infra/reader/shared.ts`) passa a distinguir três casos. Documento vivo: título e `available: true`. Na lixeira: sem título, como hoje. Excluído de vez: `{ documentId: null, documentTitle: <título guardado na origem>, available: false }`. O título guardado é contexto da tarefa, como o trecho. `TaskListing.source.documentId` e `TaskDetail.source.documentId` passam a `string \| null`. O cursor `t~<revisão>~…` não muda |
| `read_document` e `read_drawing` | Só o tipo do projeto muda. O cabeçalho já cita o projeto numa linha só, entre aspas JSON no desenho |
| Instruções do servidor (`src/server/mcp/mcp-server.ts`) | Sem mudança |

**Teto de 45.000 caracteres:** os campos novos aumentam cada item de `list_projects` e `search` em algumas dezenas de caracteres. O orçamento de cada ferramenta já corta itens do fim e ajusta o cursor, então nenhum limite muda.

- O teste "keeps every text result within the output ceiling, by its own budget", em `infra/mcp/tools.db.test.ts`, passa a gerar o conteúdo mais pesado com os campos novos:
  - 200 projetos com nomes cheios de escapes, cor e posição;
  - itens fixados nas buscas;
  - origens excluídas de vez com títulos longos guardados.
- Ele continua exigindo no máximo 45.000 caracteres sem que `withTextCeiling` (`infra/mcp/output-ceiling.ts`) dispare.

**Testes MCP:**

- `tools.db.test.ts` perde a expectativa de `withoutProject` em "leaves trashed items out and flags archived projects".
- `search.db.test.ts` cobre `pinned`; `tasks.db.test.ts`, a origem excluída de vez.
- `src/server/mcp.db.test.ts` cobre `list_projects` sem `withoutProject` e com projeto arquivado como único.
- `useAgentTools` (`src/workspace/testing/agent-tools.ts`) passa a criar um projeto para os itens de cada teste.

## Organização do código

### Backend (`src/workspace`)

```text
domain/project.ts                    PROJECT_COLORS, projectInitial, defaultProjectColor, MAX_PINNED
domain/models.ts                     projectId obrigatório; Project com color e position; pinnedAt; TaskSource.documentId anulável
application/schemas/                 schemas.ts atual dividido: common, projects, documents, canvases, tasks, trash, pins, navigation e index.ts
application/projects.ts              + cor e moveProject
application/pins.ts                  pinItem, unpinItem
application/trash/                   purge-document.ts, purge-canvas.ts, purge-task.ts, empty-trash.ts, index.ts
application/tasks.ts                 + restoreTask (a divisão por caso de uso fica para a etapa 10)
application/navigation/              ports.ts (NavigationReader, NavigationContext), project-navigation.ts, project-overview.ts,
                                     list-trash.ts (o caso de uso de leitura da Lixeira)
application/reading/                 ports.ts e list-projects.ts conforme a seção MCP; search.ts reaproveitado pelo RPC `search`
infra/repository/                    projects.ts (cor, posição), pins.ts, trash.ts (exclusões), tasks.ts (origem com título)
infra/reader/                        projects.ts, shared.ts, searchable.ts e tasks.ts conforme a seção MCP
infra/navigation/                    SQL de NavigationReader, no padrão de infra/reader/: projects.ts (lateral), overview.ts,
                                     trash.ts e index.ts, que compõe navigationReader; navigation-context.ts ao lado
infra/rpc/                           rpc.ts dividido: projects, documents, canvases, tasks, trash, navigation e index.ts
infra/service.ts                     composto a partir das mesmas partes
infra/mcp/list-projects.ts           descrição sem withoutProject
infra/migrations/005_projects_required.sql
testing/projects.ts                  testProject(service): cria e devolve um projeto ativo para os testes de banco
```

**Entradas públicas:** a regra `compose-through-entry-points` deixa o servidor e a web alcançarem o módulo só por `@tinyfold/workspace` e `@tinyfold/workspace/domain`. A web usa estas novidades em tempo de execução, e `domain/index.ts` passa a exportá-las:

- de `domain/project.ts`: `PROJECT_COLORS`, `projectInitial`, `defaultProjectColor` e `MAX_PINNED`;
- já existentes: `searchText`, `TASK_STATUSES` e `taskStatusLabels`.

Os tipos de resposta chegam à web pelo `AppRouter`, só como tipos.

`scripts/seed-sample.ts` (`pnpm seed:sample`) cria os dados de exemplo do [brief](../interface/brief.md) num banco temporário: projetos, documentos, desenhos, tarefas e o projeto arquivado. Prazos e etiquetas ficam para a etapa 10. O script só grava na pasta temporária do sistema, num arquivo novo ou num banco vazio, e confere isso antes de migrar: recusa qualquer outro destino, um link simbólico, `data/tinyfold.sqlite` e `/data/tinyfold.sqlite`. Serve à validação visual e às capturas, nunca à produção.

Ele monta as próprias cenas simples (retângulos, setas e textos) e não importa `src/*/testing/`: essas pastas usam Vitest e ficam restritas aos testes, pela regra `testing-helpers-stay-in-tests`.

### Web: divisão dos arquivos grandes

| Atual | Destino |
| --- | --- |
| `shell.tsx` (469 linhas): contexto, login, shell, busca e diálogo de projeto | `shell/AppProvider.tsx` (owner, `newDocument`, `newCanvas`, `newTask`, `openTask`), `shell/AuthGate.tsx` (sessão e expiração), `shell/LoginScreen.tsx`, `shell/AppLayout.tsx` (regiões, larguras, F6), `shell/TopBar.tsx`, `shell/PageFrame.tsx`, `shell/sidebar/*`, `shell/command-palette/*`, `shell/keyboard/*`, `shell/project/*` e `shell/theme/*` |
| `pages/Library.tsx` (648 linhas): Início, Documentos, Projeto com abas, Lixeira global e linhas | Removido. Entram `pages/project/OverviewPage.tsx`, `IndexPage.tsx`, `TrashPage.tsx`, `ItemRoute.tsx` (carrega o item e garante o endereço canônico), `NotFoundPage.tsx` e `NoActiveProjectPage.tsx` (estado vazio de `/projetos`), mais `components/item-list/ItemRow.tsx`. `PageHeader` vai para `ui/` |
| `pages/Canvases.tsx` (197 linhas): biblioteca de desenhos | Removido. `ContentRows` dá lugar a `ItemRow` |
| `ui.tsx` (218 linhas) | `ui/` com um arquivo por componente (tabela acima) e `ui/index.ts`. `useAction` e `useRequest` vão para `lib/` |
| `styles.css` (2.620 linhas) | Apagado ao fim da etapa (ver abaixo) |
| `main.tsx` (rotas e provedores) | `main.tsx` só com provedores. Rotas em `router/routes.tsx`, e redirecionamentos e última localização em `router/` |
| `lib/queries.ts` (30 linhas) | `lib/queries/` por área: `projects`, `documents`, `canvases`, `tasks`, `navigation`, `trash`, `search`. A consulta de tokens continua em `pages/profile/access-tokens.ts` |
| `lib/` (o que fica) | `api.ts`, `autosave.ts`, `canvas-autosave.ts`, `canvas-png.ts`, `canvas-preview.ts`, `clipboard.ts`, `markdown.ts`, `mcp-command.ts`, `excalidraw-assets.ts` e `types.ts` continuam onde estão. `lib/save-registry.ts` é novo |
| Ajudantes de teste da web | Em `src/web/testing/`, ao lado de `blocknote-editor.ts`, nunca importados por código de execução |

```text
src/web/shell/
├── sidebar/        ProjectSidebar, SidebarHeader, SidebarSearch, SidebarNav, ItemSection, SidebarRow,
│                   SidebarFooter, CollapsedRail, RailPopover, YouMenu, use-sidebar-prefs.ts, use-roving-focus.ts
├── project/        ProjectSwitcher, ProjectDialog, ProjectMenu, NewItemMenu, MoveToProjectMenu
├── command-palette/ CommandPalette, commands.ts (lista e filtro, puros), use-item-search.ts
├── keyboard/       layers.ts, use-layer.ts, use-shortcuts.ts, chords.ts, guards.ts, ShortcutsDialog
└── theme/          theme.ts, use-theme.ts
```

**Fim de `styles.css`:**

- As regras de telas que deixam de existir saem: Início, bibliotecas, abas do projeto, lateral antiga, cabeçalho móvel e busca antiga.
- As primitivas são reescritas com os tokens em `ui/*.css`.
- As regras de documento, quadro, diálogo da tarefa e Perfil vão para o CSS ao lado de cada página (`pages/document-editor.css`, `pages/board.css`, `components/task/task.css` e `pages/profile/profile.css`), mantendo os nomes de classe que essas páginas ainda usam.
- Ficam `styles/base.css`, `styles/fonts.css`, `styles/compat.css` e o `tokens.css` gerado.
- Nenhum CSS novo vai para um arquivo global.

## Testes

### Unidade (`check`)

- **Tokens:** CSS gerado igual ao versionado, chaves iguais nos dois temas, pares de contraste e paridade com `tokens.py`.
- **Tema:** `parseThemeChoice` e `resolveTheme`.
- **Navegação:**
  - `redirects.ts`, para cada URL antiga;
  - `last-location.ts` (formato, versão, leitura tolerante, descarte de caminhos inválidos);
  - `chords.ts` com relógio falso e `guards.ts` (campos editáveis, `.excalidraw`, modificadores);
  - pilha de `layers.ts` (abrir, fechar fora de ordem, Esc só no topo).
- **Telas:**
  - filtro de comandos com acentos e agrupamento da Lixeira com data fixa;
  - formatação da Visão geral ("Mais 3 em A fazer").
- **Domínio:** `projectInitial` (acentos, emoji, espaços) e `defaultProjectColor`.
- **Início:** `resolveStartPath`:
  - último projeto ativo;
  - último projeto arquivado com outros ativos;
  - só arquivados;
  - nenhum projeto;
  - caminho guardado inválido.
- **Comandos sem projeto ativo:** a lista do ⌘K contém só os comandos permitidos.
- **Estado vazio:** `emptyStateKind(projects)` escolhe entre "Comece um projeto" e "Nenhum projeto ativo".
- **Rascunhos:** `save-registry.ts` e a recuperação de rascunho com `projectId: null`.

### Banco (`test:db`, SQLite temporário)

**Testes existentes:** os de banco criam documentos, desenhos e tarefas sem projeto.

- Afetados: `application/workspace.db.test.ts`, `canvases.db.test.ts`, `canvas-previews.db.test.ts`, os testes de `infra/mcp/`, `src/server/*.db.test.ts` e `scripts/*-backup.db.test.ts`.
- Num banco novo não há projeto ativo, então eles passam a usar `testProject(service)` (`src/workspace/testing/projects.ts`) na mesma entrega (B2). Sem isso, a compatibilidade transitória responderia `VALIDATION`.

**Migração 005** sobre bases montadas com 001 a 004 (`application/projects-required.db.test.ts`):

- **Banco vazio:** nenhum projeto é criado.
- **Projetos sem itens soltos:** sem Geral, com posições e cores atribuídas.
- **Itens soltos, inclusive na lixeira:** todos vão ao Geral, com `version` e `updated_at` intactos e `board_revision` + 1.
- **Todos os projetos arquivados, sem itens soltos:** nenhum Geral; com itens soltos, o Geral é criado ativo.
- **Origem das tarefas e prévias:** origens preservadas com título e trecho; prévias intactas, com `scene_fingerprint`.
- **Gatilhos:** recusam `project_id` nulo em inserção e atualização.
- **Reinício:** reabrir e migrar de novo não duplica o Geral.

**Regras:**

- Arquivar o último ativo é aceito.
- Sem projeto ativo, criar item é recusado, inclusive pela compatibilidade transitória com `null`.
- `listProjects` e as ferramentas MCP respondem normalmente sem projeto ativo.
- `moveProject`.
- O limite de 8 fixados também vale em concorrência.
- Fixar não muda versão nem data.
- Mover de projeto e mandar para a lixeira limpam o fixado.
- `restoreTask`.
- Exclusão definitiva dos três tipos:
  - origem com título guardado e `documentId` nulo;
  - cascata da prévia e da origem;
  - recusa fora da lixeira;
  - repetição idempotente.
- `emptyTrash` com item restaurado no meio-tempo (pulado).
- `projectNavigation`: fixados primeiro, 8 por ordem, totais, lixeira excluída e as três ordenações.
- `projectOverview` e `listTrash`.
- Compatibilidade transitória com `null` enquanto existir, e recusa depois de removida.
- **Backup:** `scripts/projects-backup.db.test.ts`, no padrão de `canvas-backup.db.test.ts` e `mcp-backup.db.test.ts`. Um snapshot restaurado preserva cor, posição, fixados e origens com título.

### Servidor

- `search` por RPC devolve, para a mesma entrada, os mesmos itens e o mesmo cursor `s~…` que o MCP. É o caso de uso `application/reading/search.ts` nos dois. O RPC não passa pelo orçamento de texto, que é da formatação MCP.
- `src/server/mcp.db.test.ts` com as mudanças da seção MCP.
- O teste que chama todos os procedimentos sem sessão (`server.db.test.ts`) cobre os novos.

### Chrome (`build` e `e2e`, desktop e Pixel 7)

**Ajudantes em `e2e/support/`** (já existem `session.ts` com `login` e `E2E_PASSWORD`, `rpc.ts` com `answers` e `rpc`, e `mcp.ts`):

- `session.ts` ganha `ensureTestProject(page)`, chamado depois do `login`: o banco do E2E começa vazio, sem Geral.
- `navigation.ts` (novo): abrir projeto pelo seletor; G V, G Q e G L; abrir a lateral em tela estreita; abrir o ⌘K.
- `items.ts` (novo): novo documento, desenho e tarefa pelo menu Novo, e mover para a lixeira.
- As esperas por respostas RPC usam `answers(response, procedure)`, que compara o caminho exato.

**Specs existentes:** trocam "Começar a escrever", `/documentos`, `/desenhos`, `/kanban` e `/lixeira` pelos ajudantes, sem mudar o que verificam.

- Isso vale para `e2e/mcp.spec.ts` também: os itens passam a ser criados no projeto de teste, e as saídas MCP esperadas perdem `withoutProject`.
- O cenário "captura sem projeto" passa a ser "captura no projeto de teste".

| Spec nova | Cenários |
| --- | --- |
| `empty-state.spec.ts` | Arquiva todos os projetos ativos e os desarquiva ao fim, porque o banco do E2E é compartilhado entre as specs.<br>• `/` leva a "Nenhum projeto ativo".<br>• A lateral fica reduzida.<br>• O seletor e o ⌘K mostram só arquivados e comandos permitidos; N abre "Novo projeto".<br>• Cópia de recuperação sem projeto ativo oferece "Baixar cópia".<br>• Desarquivar pela lista volta ao shell completo.<br>A variante "Comece um projeto" (banco sem projetos) fica nos testes de unidade da página e na validação no Chrome real, porque a primeira spec já cria o projeto de teste |
| `navigation.spec.ts` | Criar projeto com cor pelo seletor; G P, G 1, G V, G Q e G L. Reabrir em `/` volta ao último item e à rolagem. Todas as URLs antigas redirecionam. ⌘\ recolhe e o estado persiste. `/` filtra e ↵ abre. ⌘K acha item de outro projeto e roda "Tema: Escuro". Fixar até o limite (8). Mover item de projeto e desfazer |
| `escape.spec.ts` | Sequência seletor aberto → Esc → filtro com texto → Esc → Esc → menu do documento → Esc. Em cada passo a URL não muda e a lateral fixa não recolhe. Esc no editor primeiro tira o foco do texto |
| `trash.spec.ts` | Documento, desenho e tarefa na lixeira do projeto, agrupados. Restaurar; excluir de vez com confirmação; tarefa cuja origem foi excluída de vez mostra o título e o trecho guardados. Link para o item excluído mostra "não existe mais". Esvaziar a lixeira |
| `theme.spec.ts` | `emulateMedia({ colorScheme: 'dark' })` resulta em `data-theme="dark"`. Escolher Claro persiste após recarregar. Sem piscar: com `addInitScript` definindo Escuro, o fundo calculado no `DOMContentLoaded` já é `#13161C`. Inter servida de `/assets/`, `document.fonts.check('13px Inter')`, sem violações de CSP. Editores seguem o tema |

**Celular:** a lateral abre em sobreposição pela barra, o seletor funciona por toque, e escrever, desenhar com toque, mover tarefa pelo menu e copiar token continuam passando.

**Capturas:** Visão geral, documento, desenho, quadro, Índice, Lixeira, ⌘K, seletor, faixa recolhida e Perfil, nos temas claro e escuro, em 1440 e 1280, mais o celular. Ficam em `docs/screens/` com dados fictícios do `seed:sample`, substituindo `inicio-*` e `kanban-*`.

## Validação no Chrome real contra o protótipo

Usa banco temporário e portas 3481 e 5281. A etapa 07 usou 3471 e 5271, e o E2E usa 5171. O banco `data/tinyfold.sqlite` não é aberto.

```sh
TF_TMP="$(mktemp -d -t tinyfold-08)"
export DATABASE_PATH="$TF_TMP/tinyfold.sqlite" OWNER_PASSWORD='validacao-sumario-08' \
  PORT=3481 WEB_PORT=5281 APP_ORIGIN=http://localhost:5281 COOKIE_SECURE=false
mise exec -- pnpm dev
# conferir no log: "Banco: <TF_TMP>/tinyfold.sqlite" e "Tinyfold em http://127.0.0.1:3481"
# banco novo: conferir o estado vazio "Comece um projeto" no Chrome; depois parar o dev
mise exec -- pnpm seed:sample
mise exec -- pnpm dev
```

O banco novo, antes do `seed:sample`, serve para conferir o estado "Comece um projeto". Arquivar todos os projetos do exemplo, e depois desarquivá-los, confere "Nenhum projeto ativo".

1. **Lado a lado no Google Chrome,** manualmente ou pela extensão Claude in Chrome: `http://localhost:5281` e o protótipo `docs/interface/prototipo/sumario.html` (o protótipo carrega fontes do Google Fonts e precisa de rede). Em 1440×900 e 1280×800, nos temas claro e escuro, comparar:
   - **Lateral, contra a variante A de `sidebar.md`:** largura, bordas de texto em x=16 e x=40, contagens em x=232, alturas de 28 px, fixados com fio, rodapé e faixa recolhida. O protótipo mostra a árvore de pastas, que fica para a etapa 09.
   - **Cores** de `--bg`, `--sidebar-bg`, `--text-3` e `--accent` pelo DevTools (`getComputedStyle`), contra `tokens.py`.
   - **Tipografia:** Inter com `cv05` (o "l" com cauda) e `ss03`, títulos 30/36 600 e interface 13/20.
   - **Telas:** seletor, ⌘K, menu Você, Visão geral, Índice, Lixeira, Perfil, documento e desenho no shell, e toasts no canto inferior direito.
2. **Teclado:** G P, G 1, G V, G Q, G L, ⌘\, F6, `/`, ? e a sequência do Esc. Nenhuma navegação por Esc.
3. **Larguras:** 1024 px (faixa e sobreposição) e emulação de Pixel 7 (barra superior e sobreposição).
4. **Sem piscar:** recarregar no tema Escuro com o sistema em Claro, com o cache desligado e a rede limitada a "Fast 4G".
5. **Registro:** as diferenças aceitas vão para `validacao.md` (por exemplo, o quadro ainda sem restyle). As capturas vão para `docs/screens/`.
6. **Limpeza:** parar o `dev` e rodar `rm -rf "$TF_TMP"`.

## Critérios de pronto

- [ ] `check`, `test:db`, `build` e `e2e` (desktop e Pixel 7) verdes depois de cada entrega.
- [ ] Tokens gerados de uma fonte só, com contraste verificado no `check`. Tema Sistema, Claro ou Escuro persistido, sem piscar na carga, nos editores inclusive.
- [ ] Inter completa (com `cv05`, `ss03`, `case` e `tnum`) e JetBrains Mono servidas pela própria origem, sem violações de CSP.
- [ ] Toda tela fica dentro de um projeto, exceto o estado vazio, com as rotas novas. As URLs antigas redirecionam, e o aplicativo reabre no último item e na mesma rolagem.
- [ ] Lateral variante A, seletor, Buscar, ⌘K, Visão geral, Índice, Lixeira e menu Você conforme as especificações.
- [ ] Faixa recolhida (⌘\) e sobreposição em tela estreita funcionando.
- [ ] Atalhos da tabela funcionando, e o Esc fechando só a camada mais recente, sem navegar.
- [ ] Nenhum item sem projeto. A migração moveu os itens soltos para o Geral sem mudar versões, e o banco recusa projeto nulo.
- [ ] Cor e ordem dos projetos e fixados com limite de 8.
- [ ] Sem projeto ativo, o estado vazio oferece "Novo projeto" e "Desarquivar". Seletor, ⌘K, atalhos, início, cópias de recuperação e MCP se comportam como descrito.
- [ ] Exclusão definitiva e esvaziar lixeira com as regras de origem e de rascunho local.
- [ ] Documento, desenho, quadro e Perfil funcionam no shell novo, no tema escolhido.
- [ ] `styles.css`, `Library.tsx`, `Canvases.tsx`, `shell.tsx` e `ui.tsx` substituídos pelos módulos previstos.
- [ ] Saídas do MCP sem `withoutProject` e com origem excluída tratada.
- [ ] Validação no Chrome real contra o protótipo registrada, com banco temporário e portas 3481 e 5281.
- [ ] Documentação atualizada conforme a seção final.

## Divisão do trabalho

Dois subagentes. Cada entrega deixa os quatro comandos verdes. A compatibilidade transitória com `null` permite que o backend entre primeiro sem quebrar a interface atual. Ao fim, uma rodada adversarial cruzada examina a migração e a exclusão definitiva, as camadas do Esc e o fallback de celular, com reteste do que for corrigido.

**1. Backend** (primeiro). Dono de:

- `src/workspace/**` e `src/server/**`;
- `scripts/seed-sample.ts`, `scripts/projects-backup.db.test.ts` e o script `seed:sample` no `package.json` da raiz;
- em B2, só `ensureTestProject` em `e2e/support/session.ts` (cria um projeto por `rpc` quando não há nenhum ativo).
  - Assim a interface antiga continua criando itens pelo E2E, com o `null` mapeado ao projeto de teste.
  - Se uma spec antiga depender de itens "sem projeto" (por exemplo, o filtro "Sem projeto"), B2 ajusta só essa asserção e registra no commit. O resto de `e2e/**` é do web.

| Ordem | Entrega (commit) |
| --- | --- |
| B1 | `refactor(workspace): split schemas and rpc by aggregate`. Sem mudança de comportamento |
| B2 | `feat(workspace): require a project for every item`. Migração 005, regras de projeto (cor, posição, `moveProject`), contratos com a compatibilidade transitória, MCP atualizado (seção MCP, com o teste do teto), `testing/projects.ts` e testes existentes passando projeto, testes da migração |
| B3 | `feat(workspace): add project trash with permanent delete`. `listTrash`, `restoreTask`, `purge*`, `emptyTrash`, origem com título, testes |
| B4 | `feat(workspace): add navigation queries and pins`. `projectNavigation`, `projectOverview`, `search` por RPC, `pinItem` e `unpinItem`, `seed:sample`, testes |

Ao terminar B4, o backend entrega ao web os contratos e exemplos reais de resposta.

**2. Web** (depois de B4). Dono de:

- `src/web/**`, inclusive `index.html`, `public/theme.js` e `vite.config.ts`;
- `e2e/**` e `docs/screens/*`;
- o script `tokens` e a troca de pacotes de fonte nos `package.json`;
- a documentação final.

| Ordem | Entrega (commit) |
| --- | --- |
| W1 | `feat(web): add Sumário tokens, fonts and theme`. Pipeline de tokens, `compat.css`, fontes, `theme.js`, editores no tema. As páginas atuais já trocam de tema |
| W2 | `refactor(web): split ui into base components`. `ui/`, `lib/use-action.ts` e `lib/use-request.ts`, toasts novos, sem mudança de fluxo |
| W3 | `feat(web): add project routes and redirects`. `router/`, `ItemRoute`, `NotFoundPage`, última localização, ajudantes de E2E e specs atualizadas |
| W4 | `feat(web): add project sidebar, switcher and Você menu`. `shell/` completo, faixa, sobreposição, barra estreita, diálogo e menu de projeto, fixados, registro de salvamento. `Library.tsx` e `Canvases.tsx` saem |
| W5 | `feat(web): add Buscar, command palette and keyboard model`. Filtro, ⌘K, atalhos, camadas do Esc, diálogo de atalhos |
| W6 | `feat(web): add Visão geral, Índice and project trash` |
| W7 | `feat(web): host editors and board in the new shell`. `PageFrame`, ajustes de documento, desenho e quadro, diálogo de tarefa global, Perfil com Aparência, login. `styles.css` sai |
| W8 | `test(e2e): cover Sumário navigation, trash and theme`, com as capturas |

**3. Backend** (depois de W8):

- B5, `refactor(workspace): drop null project compatibility`.

**4. Web** (por último):

- W9, a validação no Chrome real e `docs: record stage 08`.

## Riscos

- **E2E em massa:** todas as specs dependem do Início atual. Mitigação: ajudantes de E2E na mesma entrega que muda a navegação (W3), sem alterar o que cada teste verifica.
- **Regressões visuais ao desmontar `styles.css`:**
  - Mitigação: camada de compatibilidade, migração por página, capturas nos dois temas a cada entrega e comparação com o protótipo.
  - As páginas antigas podem ficar visualmente mistas até as etapas 10 e 11. Isso fica registrado como diferença aceita.
- **Migração de dados:** é a primeira que move conteúdo do usuário.
  - Mitigação: roteiro ensaiado, testes sobre bases de cada cenário, transação atômica e versões preservadas.
  - Recomendação de operação: fazer `pnpm backup:create` antes de subir a versão.
- **Abas e rascunhos antigos com `projectId: null`:** cobertos pela compatibilidade transitória, pela recuperação do rascunho no projeto atual e pela recusa explícita depois.
- **Atalhos de uma tecla:** podem colidir com o BlockNote e o Excalidraw. Mitigação: guardas puras testadas e cenários E2E que digitam N, P, M e G dentro do editor e do desenho sem disparar atalhos.
- **Esc em componentes de terceiros:** o React Aria interrompe a propagação; os menus do BlockNote e o Excalidraw tratam o próprio Esc. A spec `escape.spec.ts` cobre a sequência completa.
- **Fonte de 352 KB:** com `preload`, `swap` e cache imutável, o custo fica na primeira visita.
- **Telas que supõem um projeto atual:** sem projeto ativo, o projeto atual pode faltar.
  - Mitigação: `useCurrentProject()` devolve `null` de forma explícita, e cada componente do shell trata esse caso.
  - A spec `empty-state.spec.ts` e os testes de `resolveStartPath` e dos comandos cobrem o caminho.
- **Celular sem desenho:** o fallback é funcional, não aprovado, e pode mudar quando a versão de celular for desenhada.
- **Exclusão definitiva é irreversível:** confirmação com o título, envio exato dos itens no esvaziar, e backups como rede de segurança.

## Documentação ao concluir

| Documento | Atualização |
| --- | --- |
| `arquitetura.md` | Rotas e shell, pipeline de tema e fontes, consultas de navegação, regras de projeto obrigatório e exclusão definitiva. No modelo: `color`, `position`, `pinned_at`, gatilhos e origem com título. Na seção MCP: `list_projects` sem `withoutProject`, `pinned` e origem excluída de vez |
| `produto.md` | Navegação, Lixeira por projeto, projeto Geral e fixados deixam de ser planejados. O que fica para as etapas 09 a 11 continua marcado |
| `identidade-visual.md` e `interface/README.md` | Direção Sumário implementada na fundação e na lateral, com o que ainda falta (quadro, gaveta, documento) |
| `stack.md` | `inter-ui` e JetBrains Mono no lugar de `@fontsource-variable/inter`; React Aria `Autocomplete`, `Table`, `Tooltip` e `RadioGroup` |
| `implantacao.md` | Backup antes de subir a versão com a migração 005, o projeto Geral, e `seed:sample` só para validação |
| `validacao.md` | Comandos executados, cenários, a comparação com o protótipo e as diferenças aceitas |
| `decisoes.md` | Decisões de implementação que confirmarem ou mudarem as propostas técnicas desta etapa |
| `README.md` | "O que funciona" e as capturas |
| `src/workspace/README.md` | Regras de projeto, fixados, Lixeira e exclusão definitiva |
| `etapas/README.md` e esta página | Estado e critérios marcados |

## Decisões do usuário

Respostas de 2026-10-31, registradas em [decisões](../decisoes.md):

1. **O último projeto ativo pode ser arquivado.** O aplicativo trata a falta de projeto ativo com o estado vazio de `/projetos`. A proposta de impedir esse arquivamento foi descartada.
2. **Quatro cores de marca por enquanto** (Violeta, Ocre, Cinza e Verde). A partir do quinto projeto, as cores se repetem. Uma paleta maior exigirá nova rodada de cores com contraste verificado.
