# Sumário — refino visual

Base: o protótipo Sumário (capturas em `design/projeto/verify/`, claro e escuro, 1440 e 1280) e o CSS em `design/projeto/build/01-head.html`. Decisões do usuário: **só sans-serif** e **sem coluna de margem**. O foco é a barra lateral, o quadro e a gaveta, com o mesmo cuidado nos dois temas.

## 1. Crítica e correções

| # | Onde | O que está errado (protótipo atual) | Correção |
| --- | --- | --- | --- |
| 1 | Barra | "Visão do produto" aparece em Fixados **e** em Documentos, com dois marcadores "•" e dois pontos de falha. | Remover a seção Fixados. Um item fixado sobe para o topo da própria seção, com um ícone de fixado de 12 px, e um fio fino o separa dos demais. Cada item aparece uma vez só. |
| 2 | Barra | Três bordas de texto diferentes: itens em x=28, rótulos de seção em x=34 (depois do chevron) e rodapé em x=16. | Uma borda só, em x=28, para tudo. Chevron e marcador "•" dividem uma calha de 16 px (x 10–26). |
| 3 | Barra | "Quadro 5 · 1 atrasada": o "5 ·" fica órfão e há dois números disputando o mesmo lugar. | Um valor por linha, à direita: "1 atrasada" em `atraso` quando houver; senão, a contagem de abertas ("5") em `texto-3`. O resto vai para a tooltip. |
| 4 | Barra | Projeto grande lista os 40 documentos inteiros; não existe "Mais 32". | Mostrar até 8 itens e uma linha "Mais 32", que expande no lugar. O cabeçalho da seção fica fixo enquanto se rola. |
| 5 | Barra | Duas entradas de busca: o ícone ⌕ do topo e o filtro. | Tirar o ⌕. O filtro termina sempre com a linha "Buscar em todos os projetos ⌘K". |
| 6 | Barra | O rodapé empilha Lixeira, Você e um botão "Protótipo" tracejado, que fica com anel de foco permanente. | O rodapé fica com Lixeira e "Você". Os controles do protótipo vão para o grupo PROTÓTIPO do ⌘K e para Você › Protótipo. |
| 7 | Barra | O "•" do item atual tem 5 px e é fraco. | Ponto de 6 px em `acento`, centrado na calha e alinhado à primeira linha do texto, com o item em `texto` 600. |
| 8 | Quadro | O título serifado vem com o sobretítulo "Tinyfold", que repete a barra. | Só "Quadro", no estilo de título (seção 2), sem sobretítulo. |
| 9 | Quadro | Fios demais: um horizontal sob o cabeçalho e verticais de altura total entre as colunas. | Só um fio `fio-forte` sob o cabeçalho de cada coluna. As colunas ficam separadas por 20 px, sem fios verticais. |
| 10 | Cards | A meta usa "·" entre data e progresso, mas não antes das etiquetas. | Nada de pontos médios nos cards. Os dados ficam separados por 12 px, na ordem prazo, progresso, etiquetas, e quebram de linha se precisar. |
| 11 | Cards | Card aberto na gaveta (claro) tem fundo azul **e** borda azul, o que pesa; no escuro, o ⋯ fica sempre visível. | Aberto = fundo `seleção`, com a borda inalterada. O ⋯ só aparece no hover ou no foco. |
| 12 | Concluído | Repete o check no cabeçalho e em cada card, oferece "+ Nova tarefa" e mostra "Últimos 14 dias. Ver todas (1)" mesmo sem nada antigo. | O check fica só no cabeçalho. Sem "Nova tarefa" nessa coluna. O rodapé "Mais 23 concluídas antes de 16 out →" só aparece quando existem concluídas antigas. |
| 13 | Gaveta | "Tarefa · Tinyfold" repete o contexto. | Remover a linha. O cabeçalho fica com o ícone de estado e o título. |
| 14 | Gaveta | "✓ Salvo" e "✓ Concluir" lado a lado, com o mesmo ícone, e o ⌘↵ dentro do botão. | O estado é só texto ("Salvo"); o ícone aparece apenas em falha. "Concluir" usa o ícone de círculo com check, e o ⌘↵ vai para a tooltip. |
| 15 | Gaveta | "2/5" flutua no meio da coluna, no fim de "Descrição". | O progresso passa a ser uma linha das propriedades ("Checklist ▰▰▱▱▱ 2 de 5"). O rótulo "Descrição" sai e o texto começa direto. |
| 16 | Gaveta | Rótulos em negrito desalinhados da linha de base, e "em 5 dias" sozinho numa linha. | Grade de 96 px + 1fr com linhas de 32 px centradas e rótulos em 400. A data relativa vai na mesma linha: "qua 04 nov 2026 · em 5 dias". |
| 17 | Gaveta | A 1280, a citação da origem é cortada na borda inferior. | Um único contêiner de rolagem para as duas colunas. Abaixo de 1200 px de conteúdo, as propriedades viram uma faixa de duas colunas acima da descrição. |
| 18 | Documento | Os números de seção, "Tarefa" e "Figura 1" na margem não alinham com o texto. | Sem coluna de margem (seção 7): números saem; "Figura n" vai para a legenda; "Tarefa" sai; a origem vira marcador no texto. |
| 19 | Documento | O sobretítulo "Documento · editado hoje" repete o "Salvo · hoje" do cabeçalho. | Sem sobretítulo. "Editado hoje" fica só no estado de salvamento. |
| 20 | Global | O toast aparece embaixo à esquerda, por cima de cards, listas e índice. | Ancorar o toast no canto inferior **direito** da área de conteúdo, a 16 px das bordas e 12 px acima da gaveta quando ela estiver aberta. Largura máxima de 360 px, 6 s, pausa no hover ou no foco. |
| 21 | Visão geral | Os trechos quebram em duas linhas no claro e numa só no escuro. | Uma linha sempre, com reticências (`-webkit-line-clamp: 1`). |

## 2. Tipografia

**Família: Libre Franklin** (Google Fonts, variável de 100 a 900) e **JetBrains Mono** só em código e token.

- **Caráter sem moldura:** é a herança da Franklin Gothic, o grotesco dos jornais: "g" de dois andares, maiúsculas estreitas, cor de texto firme. Lê como editorial, não como o sans neutro de SaaS (Inter, Source Sans).
- **Hierarquia por peso:** a faixa de pesos permite títulos grandes em **300** contra rótulos pequenos em **600**.
- **Recursos tipográficos:** tem algarismos tabulares e versaletes (`tnum`, `smcp`, `c2sc`) para números alinhados e rótulos discretos sem caixa alta.
- **Verificação no build:** confirmar que o Google Fonts serve `tnum` e `smcp`. Se `smcp` não vier, os rótulos de seção ficam em caixa normal 12/16 600, com `font-synthesis: none`.

**Algarismos:** `font-variant-numeric: tabular-nums lining-nums` em datas, contagens, progresso e na tabela do índice. Datas na forma "04 nov"; "qua 04 nov 2026" só na gaveta.

| Papel | Tamanho/linha | Peso | Espaçamento | Notas |
| --- | --- | --- | --- | --- |
| Título de página (documento, desenho, Visão geral, Quadro, Perfil, índices) | 34/40 | 300 | −0,02em | Sem sobretítulo |
| Título da tarefa (gaveta) | 22/28 | 500 | −0,01em | |
| H1 · H2 · H3 no documento | 26/32 · 21/28 · 17/24 | 600 | −0,015 · −0,01 · 0em | |
| Corpo do documento | 17/28 | 400 | 0 | Coluna de 660 px (~72 caracteres) |
| Descrição da tarefa | 15/24 | 400 | 0 | |
| Interface, itens da barra, menus | 14/20 | 400; item atual 600 | 0 | |
| Título de card | 14/20 | 500 | 0 | No máximo 3 linhas |
| Rótulo de seção (barra, Visão geral, Perfil) | 12/16 | 600 | +0,04em | `all-small-caps`, `texto-3` |
| Rótulo de propriedade (gaveta) | 13/20 | 400 | 0 | `texto-3` |
| Meta, datas, contagens | 12/16 | 500 | +0,01em | Tabular |
| Botões | 13/20 | 500 | +0,01em | |
| Código, token | JetBrains Mono 13/20 | 400 | 0 | |

## 3. Tokens que mudam

Ficam iguais à iteração anterior: `fundo`, `lateral`, `superfície`, `poço`, `hover`, `seleção`, `fio`, `fio-fino`, `borda-campo`, os três níveis de texto, `acento` e os estados. Medidas novas:

| Token | Claro | Escuro | Uso | Contraste |
| --- | --- | --- | --- | --- |
| `fio-forte` (novo) | `#C9CED6` | `#4A525E` | Fio sob o cabeçalho de coluna e sob o título | decorativo |
| `toast` / `sobre-toast` (novo) | `#1D2025` / `#FFFFFF` | `#343A44` / `#ECEFF4` | Toast | 16,3 / 9,9 |
| `sobre-toast-2` (novo) | `#C9CED6` | `#C3CAD5` | Texto secundário do toast | 10,3 / 6,9 |
| Card aberto | `seleção`, sem borda `acento` | idem | Estado "aberto na gaveta" | `texto-3` sobre `seleção`: 5,0 / 4,6 |
| Anel de foco sobre `seleção` | `acento` | `acento` | Foco por teclado | 5,0 / 4,6 (não texto) |
| Barra de progresso | `acento` sobre `fio` | `acento` sobre `fio` | Checklist | 4,6 / 4,0 (não texto) |
| Marca do projeto | mesmas cores, letra em Libre Franklin 700 12 px | idem | Barra, seletor | 5,5 ou mais |

## 4. Barra lateral

```
┌──────────────────────────┐  ┌──────────────────────────┐  ┌───┐
│[T] Tinyfold ⌄          ◫ │  │[T] Tinyfold ⌄          ◫ │  │ T │
│⌕ Filtrar               / │  │⌕ Filtrar               / │  │ ◫ │
│                          │  │                          │  │   │
│  Visão geral             │  │  Visão geral             │  │   │
│  Quadro       1 atrasada │  │  Quadro       1 atrasada │  │   │
│                          │  │                          │  │   │
│⌄ Documentos            3 │  │⌄ Documentos           40 │  │   │
│  Visão do produto      ▴ │  │  Visão do produto      ▴ │  │   │
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │  │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │  │   │
│• MCP somente leitura     │  │• MCP somente leitura     │  │   │
│  Notas de arquitetura    │  │  Notas de arquitetura    │  │   │
│                          │  │  Documento de carga 01   │  │   │
│⌄ Desenhos              2 │  │  Documento de carga 02   │  │   │
│  Navegação com proj…   ▴ │  │  Documento de carga 03   │  │   │
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │  │  Documento de carga 04   │  │   │
│  Fluxo do autosave       │  │  Documento de carga 05   │  │   │
│                          │  │  Mais 32                 │  │───│
│                          │  │› Desenhos             15 │  │ ⌫ │
│──────────────────────────│  │──────────────────────────│  │ V │
│  Lixeira               1 │  │  Lixeira               1 │  └───┘
│(V) Você                ⌄ │  │(V) Você                ⌄ │
└──────────────────────────┘  └──────────────────────────┘
```

Legenda: barra normal, projeto grande e faixa recolhida. "▴" é o ícone de fixado (Tabler `pin`, 12 px, `texto-3`); "┈" é o fio fino entre os fixados e o resto.

**Medidas:**

- Largura de 264 px, com padding horizontal de 10 px.
- Calha de 16 px (x 10–26) para o chevron e o marcador; o texto começa em x=28; a contagem fica alinhada à direita em x=252.
- Linhas de item com 30 px. Cabeçalhos de seção com 28 px e 16 px acima.

**Topo:**

- O seletor ocupa a linha (40 px): marca de 22 px, nome em 14/20 600 e "⌄". À direita fica o botão recolher (◫, 28 px).
- O filtro tem 30 px, borda `borda-campo` e "/" à direita.

**Navegação:**

- "Visão geral" e "Quadro" ficam sem ícone.
- O Quadro mostra à direita um único valor (crítica 3).

**Seções:**

- O rótulo é um versalete 12/16 600 `texto-3` com o chevron na calha. A contagem fica à direita (tabular, `texto-3`); clicar nela abre o índice.
- "+" e "⋯" aparecem no hover ou no foco, à esquerda da contagem.
- Os fixados ficam no topo, com "▴" à direita, seguidos do fio fino. Depois, até 8 itens e "Mais n".

**Estados:**

- **Hover:** só a cor do texto (`texto-2` → `texto`), em 120 ms.
- **Atual:** `texto` 600 e o ponto `acento` de 6 px.
- **Foco por teclado:** anel de 2 px `acento`, por dentro, raio 4.
- **Salvamento pendente ou falha:** ponto `atraso` de 6 px depois do nome, com `aria-label` "não salvo".

**Rodapé:** um fio `fio` em cima. Duas linhas de 30 px: "Lixeira", com a contagem à direita, e "(V) Você ⌄", com avatar circular de 20 px e a inicial em 11/1 600; o menu inclui Tema e Protótipo.

**Seletor de projeto** (popover de 320 px, sem a barra de acento à esquerda do item atual):

- Linhas de 32 px com marca, nome e, à direita, "1 atrasada" em `atraso` e "G 1" em `texto-3`.
- O item atual fica em 600, com um check à direita no lugar do G n.
- Grupos "Ativos" e "Arquivados" em versalete. "+ Novo projeto" fica no fim, separado por um fio.

**Faixa recolhida:** 48 px, com a marca (abre o seletor) e ◫ (expande) no topo. Embaixo, um fio, a Lixeira (ícone e contagem em tooltip) e o avatar.

## 5. Quadro

```
                                                                                       + Nova tarefa   ⋯

Quadro

Etiquetas ⌄                                                                       6 tarefas · 1 atrasada

A fazer             3   Em andamento        1   Revisão             1   ◉ Concluído         1   + Coluna
━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━

┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│Configurar backup  │   │Gerar token pessoal│   │Colunas configurá- │   │Corrigir foco ao   │
│externo            │   │no Perfil          │   │veis no quadro     │   │fechar diálogo     │
│◷ 28 out           │   │04 nov   ◔ 2/5     │   │● 3/3   ▪ kanban   │   │▪ editor           │
│▪ operação         │   │▪ mcp  ▪ backend   │   └───────────────────┘   └───────────────────┘
└───────────────────┘   └───────────────────┘
                                                + Nova tarefa
┌───────────────────┐   + Nova tarefa
│Expor documentos em│
│Markdown pelo MCP  │
│12 nov   ▪ mcp     │
└───────────────────┘

┌───────────────────┐
│Renderizar desenho │
│incorporado no     │
│documento          │
│▪ editor           │
└───────────────────┘

+ Nova tarefa
```

**Cabeçalho da página:**

- "Quadro" no estilo de título (34/40, 300).
- Abaixo, a linha de filtros: "Etiquetas ⌄" e, à direita, "6 tarefas · 1 atrasada" (12/16 tabular, com "1 atrasada" em `atraso`).
- "+ Nova tarefa" e ⋯ no topo à direita. "+ Coluna" vira uma coluna fantasma no fim da fileira.

**Coluna:**

- Colunas flexíveis de 208 a 280 px, com 20 px entre elas e sem fundo. A 1440 ficam com ~263 px; a 1280 cabem 4 colunas de ~223 px. A coluna fantasma "+ Coluna" (120 px) rola para fora quando não cabe.
- Cabeçalho de 32 px: nome em 14/20 600 e contagem tabular `texto-3` logo depois. O ⋯ fica à direita, no hover.
- Embaixo do cabeçalho, um fio `fio-forte` de 1 px e 12 px até o primeiro card.

**Anatomia do card:**

- Fundo `superfície`, borda `fio`, raio 4, padding 10/12 e 8 px entre cards.
- **Título:** 14/20 500, no máximo 3 linhas.
- **Meta** (12/16 500 tabular, 12 px entre itens, 6 px abaixo do título):
  - **Prazo:** "04 nov" em `texto-3`. Atrasada: ícone de relógio de 12 px, "28 out" em `atraso` e "Atrasada desde 28 out" na tooltip e no `aria-label`.
  - **Progresso:** anel de 12 px e "2/5". Completo: anel cheio em `ok` e "3/3" em `ok`.
  - **Etiquetas:** quadrado de 6 px (raio 1) e nome em `texto-2`, com no máximo 2 e depois "+n".

**Estados do card:**

- **Hover:** borda `borda-campo`; o ⋯ aparece.
- **Foco:** anel de 2 px `acento` com afastamento de 2.
- **Aberto na gaveta:** fundo `seleção`, borda inalterada.
- **Arrastando:** opacidade 0,4 e indicador de inserção de 2 px `acento`.

**Coluna de conclusão:**

- O ícone de círculo com check em `ok` fica só no cabeçalho. Os títulos dos cards vão em `texto-2`, sem prazo destacado e sem "+ Nova tarefa".
- Mostra os concluídos dos últimos 14 dias. Se houver mais antigos, aparece o rodapé "Mais 23 concluídas antes de 16 out →".

**"+ Nova tarefa":** em 13/20 `texto-3`, sempre visível nas colunas vazias e, nas demais, no hover da coluna ou no foco.

**Vazios:** "Nada aqui." e, com filtro, "Nenhuma tarefa com mcp.", em 13/20 `texto-3`.

## 6. Gaveta da tarefa

```
────────────────────────────────────────────  ▬▬▬  ────────────────────────────────────────────
  ◔  Gerar token pessoal no Perfil                           Salvo    [◎ Concluir]    ⋯    ✕

  Token somente leitura para o MCP. Guardar só o hash   │  Coluna      Em andamento ⌄
  do valor.                                             │  Prazo       qua 04 nov 2026 · em 5 dias
                                                        │  Etiquetas   ▪ mcp   ▪ backend   +
  ☑ Tabela de tokens com hash                           │  Projeto     [T] Tinyfold ⌄
  ☑ Gerar valor e mostrar uma vez                       │  Checklist   ▰▰▱▱▱  2 de 5
  ☐ Botão de copiar                                     │  ───────────────────────────────────
  ☐ Revogar token                                       │  Origem      MCP somente leitura ↗
  ☐ Registrar último uso                                │              “O acesso usa um token pessoal
                                                        │              somente leitura, criado e…”
```

**Moldura:** fundo `superfície`, fio `fio` em cima e sombra `0 -8px 24px` (`.06` no claro, `.35` no escuro). A alça mede 40×3 em `fio` (em `borda-campo` no hover). O padding horizontal é de 32 px, alinhado ao conteúdo da página.

**Cabeçalho (56 px):**

- O ícone de estado (16 px) é um botão que abre "Mover para…". O título vem em 22/28 500, editável.
- À direita:
  - **Estado:** "Salvo" em `texto-3` 12/16, sem ícone. "Salvando…" fica igual. A falha aparece com ícone e `atraso`: "Não salvou · Tentar de novo".
  - **"Concluir":** botão secundário de 28 px com ícone de círculo com check; vira "Reabrir".
  - **⋯ e ✕:** ícones de 28 px.
- Não há fio sob o cabeçalho: o espaço de 8 px e a mudança de fundo bastam.

**Corpo:**

- Um único contêiner de rolagem, com a descrição (1fr, até 640 px) à esquerda e as propriedades (320 px) à direita, separadas por um fio vertical `fio` de 1 px com 24 px de cada lado.

**Propriedades:**

- Grade de 96 px + 1fr com linhas de 32 px, alinhadas ao centro. Rótulos em 13/20 400 `texto-3`; valores em 14/20 tabular.
- Os valores editáveis são botões que mostram `hover` só no hover; "⌄" aparece no hover.
- **Checklist:** barra de 64×4 px (`acento` sobre `fio`; completa em `ok`) e "2 de 5".
- **Origem:** depois de um fio fino, o link do documento em `acento` 14/20 e o trecho em 13/20 `texto-2`, entre aspas, sem itálico e cortado em 3 linhas.

**Descrição e checklist:**

- Texto em 15/24.
- Itens de checklist com 28 px e caixa de 16 px (raio 3, `borda-campo`; marcada com fundo `acento` e check em `sobre-acento`).
- Item feito: texto `texto-3`, riscado em `fio-forte`.

**Abaixo de 1200 px de conteúdo:** as propriedades viram uma faixa de duas colunas acima da descrição, e o fio vertical some.

## 7. Documento sem coluna de margem

```
                                                                 Salvo · editado hoje    ⋯

            Visão do produto
            ────────────────────────────────────────────────────────────  (fio-forte, 660 px)
            Espaço pessoal e minimalista para conduzir projetos, de software ou não…

            Acesso pelo Claude Code
            Um servidor MCP somente leitura deixa o Claude Code consultar
            documentos, desenhos e tarefas.
            ────────────────────────────────────────────────────────────
            ◔  Gerar token pessoal no Perfil                      aberta abaixo
               04 nov   ◔ 2/5   ▪ mcp   ▪ backend        Em andamento
            ────────────────────────────────────────────────────────────
            ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
            ⊘  Na lixeira: Esboçar tela de boas-vindas      Restaurar   Remover
            ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
            [ desenho, versão atual ]
            Figura 1 — Navegação com projeto no centro                   Abrir ↗

  Em "MCP somente leitura":
            O acesso usa um token pessoal somente leitura, criado e revogado
            no Perfil. ◔
                       └ marcador de origem
```

- **Coluna:** uma só, de 660 px, centrada na área de conteúdo, com 72 px de respiro no topo.
- **Bloco do título:** título em 34/40 300, com 16 px até um fio `fio-forte` da largura da coluna e 24 px até o texto. Sem sobretítulo nem ícone.
- **Tarefa incorporada:** bloco entre fios `fio`, sem caixa.
  - Linha 1: ícone de estado, título em 15/22 500 e, à direita, "aberta abaixo" (`texto-3`, só quando aberta).
  - Linha 2: o mesmo grupo de meta do card, com a coluna à direita em `texto-3`.
  - Hover: o título vai para `acento` e o cursor vira ponteiro. Aberta: fundo `seleção`. O rótulo "Tarefa" sai.
- **Indisponível:** o mesmo bloco, com fios tracejados `borda-campo`, ícone de círculo cortado, o texto em `texto-2` e as ações "Restaurar" e "Remover" como links `acento` 13/20.
- **Figura:** o desenho, sem moldura, com 12 px até a legenda em 12/16 `texto-3`, "Figura 1 — Navegação com projeto no centro". "Abrir ↗" fica à direita em `acento` e o clique na figura também abre. A numeração é automática, por ordem no documento.
- **Origem:**
  - O trecho que originou uma tarefa termina com um **marcador de origem**: um botão inline de 16 px com o ícone de estado da tarefa em `acento`, alinhado à linha de base.
  - No hover ou no foco, o trecho ganha um sublinhado pontilhado `acento` e a tooltip "Originou: Gerar token pessoal no Perfil · Em andamento".
  - Clicar abre a gaveta. O `aria-label` é "Tarefa originada aqui: Gerar token pessoal no Perfil, Em andamento. Abrir".
  - Se a tarefa for excluída, o marcador some e o trecho fica intacto.

## 8. Consistência no resto

- **Sans em toda parte:** o título de cada tela (Visão geral, Índice, Concluídas, Lixeira, Perfil, desenho) passa ao estilo de título, e os sobretítulos "Tinyfold", "Tinyfold · Quadro" e "Você" saem.
- **Visão geral, Perfil, Concluídas e Lixeira:** sem coluna de margem. Cada seção ganha um rótulo em versalete acima do conteúdo e um fio `fio` entre seções, numa coluna de 720 px.
- **Linhas da Visão geral:** título em 14/20 500; trecho e meta em 12/16 `texto-3` numa linha; números alinhados à direita, tabulares.
- **Índice de documentos:** cabeçalhos de tabela em versalete e números tabulares à direita. As linhas ficam em 36 px, com fio `fio-fino`.
- **Ícones:** Tabler de traço 1,5 em 16 px na interface e 12 px na meta, sempre na cor do texto vizinho.
- **Botões:**
  - Secundário: 28 px, borda `fio`, 13/20 500 e hover `hover`.
  - Primário: `acento` com `sobre-acento`.
  - Os atalhos de teclado ficam na tooltip, não dentro do botão.
- **Toasts:** ancorados conforme a crítica 20, com o texto em 13/20 e a ação sublinhada em `sobre-toast`.
- **Movimento:** cor em 120 ms; gaveta em 160 ms (`ease-out`); expansão de "Mais n" em 120 ms. Com `prefers-reduced-motion`, sem deslocamento.
