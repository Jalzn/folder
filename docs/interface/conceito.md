# Tinyfold — Sumário (Margem, 2ª iteração)

## 1. Nome e tese

**Sumário.** Cada projeto é um caderno com sumário. A barra lateral é o índice do projeto, a página é o texto e as ligações aparecem na margem. Nenhuma tela fica fora de um projeto.

**Suposições desta iteração** (o usuário confirma):

1. Todo item pertence a um projeto e não existem itens soltos. A captura rápida (N, ⌘K "Novo…") cria no projeto atual, e o projeto **Geral** guarda o que é avulso.
2. Não há quadro geral nem visão de prazos entre projetos. Entre projetos, só o seletor (com a contagem de atrasadas) e o ⌘K.
3. O app abre no último projeto, no último item aberto e na mesma rolagem. Trocar de projeto pelo seletor abre a **Visão geral** do projeto escolhido: abrir o app é continuar, e trocar de projeto é se orientar.
4. Dados de exemplo: "Ideias soltas", "Rabisco de logo" e "Renovar domínio" (A fazer, 15/11) passam para o projeto **Geral**.

**O que muda em relação à Margem:**

| Peça | Margem | Sumário |
| --- | --- | --- |
| Navegação | Trilho de projetos à esquerda | **Barra lateral do projeto** (260 px), com o seletor no topo |
| Início, Soltos, quadro geral | Existiam | Removidos (suposições 1 e 2) |
| Barra de estado | Busca, salvamento e tema | **Removida.** O salvamento vai para o cabeçalho da página e da gaveta, o ⌘K para o topo da barra lateral e o tema para o menu "Você" |
| Página do projeto | Agora, Fixados, Documentos, Desenhos | **Visão geral** (Agora, Editados recentemente, Concluídas). As listas passam para a barra lateral |
| Cabeçalho de página | Ícone, capa, título 40/700, trilha com ícones | Linha de contexto, título serifado de peso regular e um fio. Sem ícone, capa nem trilha |
| Marca do projeto | Ícone de traço (cubo, casa) | **Marca tipográfica**: a inicial do projeto num quadrado de 20 px na cor dele |
| Etiquetas | Chip de fundo colorido | Quadrado de cor de 8 px e o nome |
| Tipografia | Inter | Source Serif 4, Source Sans 3 e Source Code Pro |
| Ficam | — | Gaveta inferior, regra do Esc, teclado (com os deltas da seção 5), Concluídas, Lixeira e Desfazer |

## 2. Identidade

A hierarquia vem da tipografia e do espaço, não da moldura. As decisões:

- **Superfamília Source:** **Source Serif 4** (Display nos títulos, Text no corpo), **Source Sans 3** na interface e **Source Code Pro** em código e token. As três foram feitas para conviver; a serifa no texto separa escrever de operar e afasta o "editor genérico em sans".
- **Título grande e calmo:** serifa de peso 400, uma linha de contexto pequena acima ("Documento · editado hoje") e um fio abaixo. Sem negrito, sem ícone e sem capa.
- **Grade com margem:** toda página tem uma coluna de margem de 160 px, 32 px de calha e 680 px de texto. A margem guarda os rótulos de seção, a numeração das seções, "Tarefa", "Figura 1" e as notas de origem. É o nome Margem levado ao pé da letra.
- **Fios no lugar de caixas:** seções, linhas de lista e itens incorporados são separados por fios de 1 px. Só os cards do quadro têm contorno.
- **Números tabulares** (`tabular-nums`) em datas, contagens e progresso, alinhados à direita.
- **Azul com parcimônia:** só em links, notas de margem, foco, marcador do item atual, botão primário e progresso.
- **Barra lateral sem caixas cinza:** fundo quase igual ao da página no claro (grafite aprovado no escuro), separada por um fio. O hover muda só a cor do texto; o item atual ganha peso 600 e o marcador "•" azul.

### Tokens (claro / escuro)

Os tokens marcados com * mudaram ou são novos. O contraste mínimo é medido sobre `fundo`, `lateral`, `superfície`, `poço`, `hover` e `seleção`, e todo texto passa de 4,5:1 nos dois temas.

| Token | Claro | Escuro | Uso | Contraste mín. (claro / escuro) |
| --- | --- | --- | --- | --- |
| `fundo` | `#FFFFFF` | `#202329` | Página | — |
| `lateral`* | `#FAFAFB` | `#17191D` | Barra lateral | — |
| `superfície` | `#FFFFFF` | `#282D35` | Gaveta, menus, campos, cards do quadro | — |
| `poço`* | `#F4F5F7` | `#282D35` | Código, token | — |
| `hover` | `#F1F3F6` | `#2A2F37` | Só botões e itens de menu | — |
| `seleção` | `#E7EEFB` | `#2A3B57` | Texto selecionado, item aberto na gaveta | — |
| `fio`* | `#E2E5EA` | `#3C434E` | Fios de seção e contorno de card | decorativo |
| `fio-fino`* | `#EEF0F3` | `#2D323A` | Fios entre linhas de lista | decorativo |
| `borda-campo`* | `#848D9B` | `#757E8C` | Campos, checkbox | 3,2 / 3,4 (não texto) |
| `texto` | `#1D2025` | `#ECEFF4` | Principal | 14,0 / 9,8 |
| `texto-2` | `#454C58` | `#ACB5C3` | Secundário | 7,4 / 5,5 |
| `texto-3` | `#5E6673` | `#9DA6B4` | Contexto, meta, rótulos de margem | 5,0 / 4,6 |
| `acento` | `#3563B8` | `#7FA6E8` | Links, notas de margem, foco, marcador | 5,0 / 4,6 |
| `sobre-acento` | `#FFFFFF` | `#14171C` | Botão primário | 5,8 / 7,3 |
| `ok` | `#2F7A45` | `#8CC79A` | Conclusão, "Salvo" | 4,5 / 5,8 |
| `atraso` / fundo | `#B42318` / `#FDECEA` | `#F28C80` / `#3B2729` | Prazo vencido, falha | 5,6 / 4,8 |
| `aviso` / fundo | `#8A5300` / `#FDF3E1` | `#E2B866` / `#3A3224` | Conflito, rascunho | 5,4 / 6,1 |

**Marcas de projeto:** quadrado de 20 px, raio 2, com a inicial em Source Serif 4 600.

| Projeto | Cor | Claro (fundo / letra) | Escuro (fundo / letra) | Contraste da letra |
| --- | --- | --- | --- | --- |
| **T** Tinyfold | violeta | `#F0E9FB` / `#5B3A99` | `#362B4F` / `#CDB8F5` | 7,1 / 7,3 |
| **R** Reforma do escritório | ocre | `#FCEFDF` / `#8A4A0B` | `#3D2F1D` / `#F0C48F` | 6,1 / 8,0 |
| **G** Geral | cinza | `#ECEEF1` / `#3D4450` | `#30353D` / `#C3CAD5` | 8,4 / 7,5 |
| **S** Site pessoal 2024 (arquivado) | verde | `#E8F3E0` / `#3D6B1F` | `#263821` / `#B5DB9A` | 5,5 / 8,1 |

**Etiquetas:** um quadrado de 8 px na cor e o nome em `texto-2`. Os quadrados medem no mínimo 3,9:1 contra o fundo e servem de apoio, porque o nome sempre aparece.

| Etiqueta | Claro | Escuro |
| --- | --- | --- |
| mcp | `#2563C9` | `#86B8FF` |
| backend | `#5B6472` | `#ACB5C3` |
| editor | `#7A4FC4` | `#BB9BF8` |
| kanban | `#13857B` | `#52D8C4` |
| operação | `#B86E00` | `#EBB55E` |
| fornecedores | `#B4472A` | `#F1987C` |
| compras | `#4C8A2A` | `#A6DC76` |

**Escala tipográfica** (Google Fonts):

| Uso | Fonte | Tamanho/linha · peso |
| --- | --- | --- |
| Título de página (documento, desenho, Visão geral) | Source Serif 4 Display | 40/46 · 400, −0,01em |
| Título do quadro, de Perfil e da tarefa na gaveta | Source Serif 4 Display | 30/36 · 26/32 · 400 |
| Linha de contexto ("Documento · editado hoje") | Source Sans 3 | 14/20 · 500, `texto-3` |
| H2 · H3 no documento | Source Serif 4 · Source Sans 3 | 24/32 · 600 · 17/24 · 700 |
| Corpo do documento e da descrição | Source Serif 4 Text | 18/30 · 400 (coluna de 680 px) |
| Interface e itens da barra lateral | Source Sans 3 | 15/22 · 400; item atual 600 |
| Rótulos de seção e de margem | Source Sans 3 | 13/18 · 600, `texto-3`, caixa normal |
| Meta e números | Source Sans 3 | 13/18 · 400, `tabular-nums` |
| Código, token | Source Code Pro | 14/22 |

**Forma e estados:**

- Grade de 8 px. Raios: 2 (marca, quadrado de etiqueta), 4 (botões, campos, cards) e 6 (menus, diálogos). A gaveta não tem raio: só o fio superior e a sombra.
- Ícones Tabler de traço 1,5, apenas em ações e estados. As listas não têm ícone de tipo, porque a seção já diz o tipo.
- Hover: só a cor do texto (`texto-2` → `texto`). Botões e menus usam `hover`.
- Foco: anel de 2 px em `acento`, só por teclado.

**Tema:** o menu **Você**, no pé da barra lateral, tem Tema (Sistema, Claro, Escuro). Perfil › Aparência e o comando "Tema…" no ⌘K repetem a escolha.

## 3. Barra lateral e seletor

**Barra lateral normal** (Tinyfold, na Visão geral) e **Visão geral:**

```
┌──────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ [T] Tinyfold           ▾ │                                                                     ⋯  │
│ ⌕ Filtrar              / │                                                                        │
│                          │                Visão geral                                             │
│ • Visão geral            │                Tinyfold                                                │
│   Quadro  5 · 1 atrasada │                5 tarefas abertas, 1 atrasada. Último texto editado:    │
│                          │                Visão do produto, hoje.                                 │
│ Fixados                  │  ────────────────────────────────────────────────────────────────────  │
│   Visão do produto       │  Agora          ○ Configurar backup externo         28 out  atrasada   │
│   Navegação com proj…    │                  A fazer · operação                                    │
│                          │                ◔ Gerar token pessoal no Perfil      04 nov  2/5        │
│ Documentos  3       ⋯  + │                  Em andamento · mcp, backend                           │
│   Visão do produto       │                ◑ Colunas configuráveis no quadro            3/3        │
│   MCP somente leitura    │                  Revisão · kanban                                      │
│   Notas de arquitetura   │                ○ Expor documentos em Markdown…      12 nov             │
│                          │                  A fazer · mcp                                         │
│ Desenhos  2         ⋯  + │                Mais 1 em A fazer sem prazo.          Abrir quadro →    │
│   Fluxo do autosave      │  ────────────────────────────────────────────────────────────────────  │
│   Navegação com proj…    │  Editados       Visão do produto                    hoje               │
│                          │  recentemente    Espaço pessoal e minimalista para conduzir…           │
│                          │                MCP somente leitura                  ontem              │
│                          │                Notas de arquitetura                 27 out             │
│                          │  ────────────────────────────────────────────────────────────────────  │
│                          │  Concluídas     ✓ Corrigir foco ao fechar diálogo                      │
│ Lixeira                1 │  14 dias        Ver todas no quadro →                                  │
│ Você                   ⋯ │                                                                        │
└──────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

- **Ordem:** seletor; filtro; Visão geral; Quadro (abertas · atrasadas); Fixados; Documentos; Desenhos. No pé, Lixeira (com contagem) e Você.
- **Seções:** cada uma recolhe ao clicar no rótulo (ou com ←/→ no rótulo focado), e o estado fica lembrado por projeto.
- **Ordenação:** o ⋯ da seção escolhe Recentes (padrão), A–Z ou Criação. O "+" cria no projeto.
- **Salvamento pendente:** um item com alteração não salva ou falha mostra um ponto `atraso` depois do nome. Assim nada se perde, mesmo com o item fora da tela.

**Projeto grande** (40 documentos e 15 desenhos) e **filtro** (`/`, digitando "mcp"):

```
┌──────────────────────────┐   ┌──────────────────────────┐
│ [T] Tinyfold           ▾ │   │ [T] Tinyfold           ▾ │
│ ⌕ Filtrar              / │   │ ⌕ mcp▌               esc │
│                          │   │                          │
│   Visão geral            │   │ Documentos  2 de 40      │
│   Quadro  5 · 1 atrasada │   │   MCP somente leitura    │
│                          │   │   Visão do produto       │
│ Fixados                  │   │     …servidor MCP somen… │
│   Visão do produto       │   │                          │
│   Navegação com proj…    │   │ Desenhos  0 de 15        │
│                          │   │                          │
│ Documentos  40      ⋯  + │   │ ↵ abre o primeiro        │
│ • Visão do produto       │   │ Esc limpa o filtro       │
│   MCP somente leitura    │   │                          │
│   Notas de arquitetura   │   │                          │
│   Documento de carga 01  │   │                          │
│   Documento de carga 02  │   │                          │
│   Documento de carga 03  │   │                          │
│   Documento de carga 04  │   │                          │
│   Documento de carga 05  │   │                          │
│   Mais 32 ↓              │   │                          │
│                          │   │                          │
│ ▸ Desenhos  15      ⋯  + │   │                          │
│ Lixeira                1 │   │ Lixeira                1 │
│ Você                   ⋯ │   │ Você                   ⋯ │
└──────────────────────────┘   └──────────────────────────┘
```

- Cada seção mostra até 8 itens, mais "Mais 32 ↓", que expande no lugar. Uma seção pode ficar recolhida ("▸ Desenhos 15").
- Clicar no **número** de "Documentos 40" abre a página **Índice de documentos**: uma tabela com título, trecho, data de edição e tarefas incorporadas, ordenável, para quando a lista curta não basta.
- O filtro procura título e texto em Fixados, Documentos e Desenhos e mostra "2 de 40". ↵ abre o primeiro resultado.

**Barra recolhida** (⌘\):

```
┌───┬────────────────────────────────────────────────────────────────────────┐
│ T │                                                    ✓ Salvo · hoje   ⋯  │
│ ≡ │                                                                        │
│ ⌕ │                Documento · editado hoje                                │
│   │                Visão do produto                                        │
│   │  ────────────────────────────────────────────────────────────────────  │
│   │                Espaço pessoal e minimalista para conduzir projetos,    │
│   │                de software ou não…                                     │
│   │                                                                        │
└───┴────────────────────────────────────────────────────────────────────────┘
```

- Sobra uma faixa de 44 px com a marca (que abre o seletor), "≡" (que expande) e "⌕" (⌘K). O estado fica lembrado.
- Abaixo de 1100 px, a barra começa recolhida e, ao abrir, sobrepõe a página.

**Seletor de projeto** (clique no nome do projeto, ou G P):

```
┌──────────────────────────────────────────┐
│ ⌕ Trocar de projeto…                     │
│                                          │
│ Ativos                                   │
│ [T] Tinyfold            1 atrasada   G 1 │
│ [R] Reforma do escritório            G 2 │
│ [G] Geral                            G 3 │
│                                          │
│ Arquivados                               │
│ [S] Site pessoal 2024                    │
│                                          │
│ + Novo projeto                           │
└──────────────────────────────────────────┘
```

- Popover ancorado no topo da barra lateral, com campo de filtro.
- Mostra os projetos ativos, com a marca, as atrasadas em `atraso` e o atalho G n. Depois vêm Arquivados e "+ Novo projeto", que pede nome e cor da marca.
- Escolher um projeto abre a Visão geral dele. Um projeto arquivado abre com a faixa "Projeto arquivado. O conteúdo está preservado. Desarquivar", sem botões "+".

**A "casa" do projeto** é a Visão geral (G V, ou "Visão geral" na barra). O app em si abre no último item (suposição 3).

## 4. Telas

### 4.1 Visão geral

Wireframe na seção 3. Três seções, com os rótulos na margem e um fio entre elas:

- **Agora:** a mesma regra da Margem. Para cada tarefa: título, uma linha de meta (coluna · etiquetas) e, à direita, prazo e progresso em números tabulares. ↵ abre a gaveta.
- **Editados recentemente:** os 5 documentos ou desenhos editados por último, com trecho. É o "continuar de onde parei" dentro do projeto.
- **Concluídas:** as dos últimos 14 dias, com "Ver todas no quadro →". No protótipo, as concluídas do exemplo contam como desta semana.
- **Reforma do escritório:** Agora mostra Escolher luminária (1/3) e Pedir orçamento do marceneiro (03 nov).
- **Geral:** Agora fica vazio ("Nada pede atenção agora.") e o rodapé diz "Mais 1 em A fazer: Renovar domínio, 15 nov".

### 4.2 Documento com a gaveta

```
┌──────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ [T] Tinyfold           ▾ │                                                    ✓ Salvo · hoje   ⋯  │
│ ⌕ Filtrar              / │                                                                        │
│                          │                Documento · editado hoje                                │
│   Visão geral            │                Visão do produto                                        │
│   Quadro  5 · 1 atrasada │  ────────────────────────────────────────────────────────────────────  │
│                          │  4             Acesso pelo Claude Code                                 │
│ Fixados                  │                Um servidor MCP somente leitura deixa o Claude Code     │
│   Visão do produto       │                consultar documentos, desenhos e tarefas.               │
│   Navegação com proj…    │  Tarefa        ────────────────────────────────────────────────────    │
│                          │                ○ Gerar token pessoal no Perfil             aberta ↓    │
│ Documentos  3       ⋯  + │                  Em andamento · 04 nov · 2/5 · ■ mcp ■ backend         │
│ • Visão do produto       │                ────────────────────────────────────────────────────    │
│   MCP somente leitura    │  Tarefa        ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│   Notas de arquitetura   │                ⊘ Na lixeira: Esboçar tela de boas-vindas.              │
│                          │                  Restaurar · Remover do documento                      │
│ Desenhos  2         ⋯  + │                ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│   Fluxo do autosave      │════════════════════════════════════════════════════════════════════════│
│   Navegação com proj…    │  Tarefa · Tinyfold                    ✓ Salvo   [Concluir ⌘↵]   ⋯   ✕  │
│                          │  Gerar token pessoal no Perfil                                         │
│                          │  ────────────────────────────────────────────────────────────────────  │
│                          │  Descrição                        │ Coluna     Em andamento ▾          │
│                          │                                   │ Prazo      qua 04 nov 2026         │
│                          │  Token somente leitura para o     │            em 5 dias               │
│                          │  MCP. Guardar só o hash do valor. │ Etiquetas  ■ mcp ■ backend  +      │
│                          │                                   │ Projeto    Tinyfold ▾              │
│                          │  ☑ Tabela de tokens com hash      │                                    │
│                          │  ☑ Gerar valor e mostrar uma vez  │ Origem     MCP somente leitura ↗   │
│                          │  ☐ Botão de copiar                │            “O acesso usa um token  │
│ Lixeira                1 │  ☐ Revogar token                  │            pessoal somente…”       │
│ Você                   ⋯ │  ☐ Registrar último uso           │                                    │
└──────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

- **Cabeçalho:** o salvamento ("✓ Salvo · hoje", "Salvando…", "Não salvou · Tentar de novo ⌘S") e o ⋯ (Criar tarefa, Exportar .md, Importar .md, Fixar, Mover para projeto…, Mover para a lixeira). As faixas de falha, conflito e rascunho ficam fixas sob o cabeçalho.
- **Margem:**
  - O número da seção ao lado de cada H2.
  - "Tarefa" e "Figura 1" ao lado dos itens incorporados.
  - **Notas de origem** em `acento`, ao lado do trecho que originou uma tarefa. Em "MCP somente leitura": "Originou: Gerar token pessoal no Perfil →". Clicar abre a gaveta.
- **Tarefa incorporada:** um bloco entre dois fios, sem caixa.
  - Linha 1: estado, título e "↗".
  - Linha 2: coluna · prazo · progresso · etiquetas.
  - Atrasada: "◷ 28 out · atrasada" em `atraso`. Aberta na gaveta: fundo `seleção` e "aberta ↓".
- **Desenho incorporado:** figura sem moldura pesada, com a legenda em Source Sans 13 "Figura 1 · Navegação com projeto no centro — Abrir".
- **Indisponível:** entre fios tracejados, "Na lixeira: Esboçar tela de boas-vindas." com "Restaurar · Remover do documento". O título é um marcador do protótipo, porque o brief não nomeia essa tarefa.
- **Gaveta:** ocupa a área de conteúdo, sem raio, com o comportamento da Margem. No cabeçalho, "Tarefa · Tinyfold", título serifado de 26, salvamento, "Concluir ⌘↵", ⋯ e ✕. Descrição na serifa de texto; propriedades em Source Sans tabular.

### 4.3 Quadro

```
┌──────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ [T] Tinyfold           ▾ │                                          + Nova tarefa   + Coluna   ⋯  │
│ ⌕ Filtrar              / │                                                                        │
│                          │  Tinyfold                                                              │
│   Visão geral            │  Quadro                                                                │
│ • Quadro  5 · 1 atrasada │  Etiquetas ▾                                   6 tarefas · 1 atrasada  │
│                          │  ────────────────────────────────────────────────────────────────────  │
│ Fixados                  │  A fazer       3 │ Em andamento  1 │ Revisão       1 │ ✓ Concluído   1 │
│   Visão do produto       │  ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │
│   Navegação com proj…    │  │Configurar   │ │ │Gerar token  │ │ │Colunas con- │ │ │✓ Corrigir   │ │
│                          │  │backup       │ │ │pessoal no   │ │ │figuráveis no│ │ │foco ao      │ │
│ Documentos  3       ⋯  + │  │externo      │ │ │Perfil       │ │ │quadro       │ │ │fechar       │ │
│   Visão do produto       │  │◷ 28 out     │ │ │04 nov · 2/5 │ │ │3/3          │ │ │diálogo      │ │
│   MCP somente leitura    │  │atrasada     │ │ │■ mcp        │ │ │■ kanban     │ │ │■ editor     │ │
│   Notas de arquitetura   │  │■ operação   │ │ │■ backend    │ │ └─────────────┘ │ └─────────────┘ │
│                          │  └─────────────┘ │ └─────────────┘ │ + Nova tarefa   │ Últimos 14 dias │
│ Desenhos  2         ⋯  + │  ┌─────────────┐ │ + Nova tarefa   │                 │ Ver todas →     │
│   Fluxo do autosave      │  │Expor docu-  │ │                 │                 │                 │
│   Navegação com proj…    │  │mentos em    │ │                 │                 │                 │
│                          │  │Markdown pelo│ │                 │                 │                 │
│                          │  │MCP          │ │                 │                 │                 │
│                          │  │12 nov       │ │                 │                 │                 │
│                          │  │■ mcp        │ │                 │                 │                 │
│                          │  └─────────────┘ │                 │                 │                 │
│                          │  ┌─────────────┐ │                 │                 │                 │
│                          │  │Renderizar   │ │                 │                 │                 │
│                          │  │desenho      │ │                 │                 │                 │
│                          │  │incorporado  │ │                 │                 │                 │
│                          │  │no documento │ │                 │                 │                 │
│                          │  │■ editor     │ │                 │                 │                 │
│ Lixeira                1 │  └─────────────┘ │                 │                 │                 │
│ Você                   ⋯ │  + Nova tarefa   │                 │                 │                 │
└──────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

- Só o projeto, sem seletor de escopo; o único filtro é Etiquetas.
- Colunas separadas por fios verticais, com cabeçalho em Source Sans 15/600 e contagem tabular. Cards com contorno `fio`, raio 4 e etiquetas com quadrado de cor.
- A coluna de conclusão mostra os últimos 14 dias; "Ver todas →" abre **Concluídas do projeto**.
- Mover pelo teclado e pelo menu, excluir coluna com destino e ⌘Z: iguais à Margem.

### 4.4 Perfil e token, Lixeira, Desenho

- **Perfil e token:** o menu **Você** (pé da barra lateral) tem Perfil e token, Tema ▸, Atalhos (?) e Sair. O Perfil abre como página, com a barra lateral do projeto atual ainda visível; qualquer item da barra volta ao projeto. Conteúdo e token mostrado uma vez seguem a Margem, com a tipografia nova e o token em Source Code Pro num `poço`.
- **Lixeira:** agora é por projeto, no pé da barra lateral (G L), e o comportamento é o mesmo. Restaurar devolve o item ao projeto.
- **Desenho:** cabeçalho igual ao do documento (contexto "Desenho · editado hoje", título serifado de 32, Exportar ▾ e ⋯), com o canvas Excalidraw seguindo o tema. O salvamento fica no cabeçalho.

## 5. Teclado e Esc

| Atalho | Mudança |
| --- | --- |
| G I, G S, G T | Removidos (Início, Soltos, quadro geral) |
| G 1–9 | Mantidos: projetos na ordem do seletor |
| G P · G V | Novos: seletor de projeto · Visão geral |
| ⌘\ | Novo: recolhe ou expande a barra lateral |
| `/` (fora de texto) | Passa a filtrar a barra lateral |
| ←/→ no rótulo de seção | Novo: recolhe ou expande a seção |
| F6 / ⇧F6 | Ciclo barra lateral → página → gaveta |
| N | Cria no projeto atual (menu Documento, Desenho, Tarefa) |
| ⌘K, ⌘S, ⌘⌥T, ⌘↵, ⇧ + setas, M, P, ⌥↑/⌥↓, G Q, G L | Iguais |

**Esc:** a regra continua: fecha a camada mais recente, nunca navega, nunca apaga e nunca confirma. Entram camadas novas:

- O seletor de projeto, que fecha.
- O filtro da barra lateral: o primeiro Esc limpa o texto, o segundo devolve o foco à página.
- A barra lateral em sobreposição (abaixo de 1100 px), que se recolhe.

O Esc nunca recolhe a barra lateral fixa.

## 6. Roteiro do protótipo

1. **Abrir:** o app cai em Tinyfold › Visão do produto, com a rolagem restaurada e o "•" no item da barra lateral.
2. **Gaveta:** clicar no card "Gerar token pessoal no Perfil" abre a gaveta. Marcar "Botão de copiar": o salvamento aparece no cabeçalho da gaveta e 3/5 no card e na Visão geral (G V).
3. **Origem:** "MCP somente leitura ↗" abre o documento com a gaveta ainda aberta. Ver a nota de margem "Originou: Gerar token pessoal no Perfil →". Esc fecha a gaveta.
4. **Seletor:** G P mostra "1 atrasada" em Tinyfold. Abrir Reforma do escritório (visão geral, marca R ocre) e depois Geral (Renovar domínio no rodapé de Agora).
5. **Escala:** de volta a Tinyfold (G 1), rodar "Simular projeto grande" no ⌘K. Ver "Documentos 40", "Mais 32 ↓", depois `/` e "mcp" (2 de 40). ↵ abre o primeiro e Esc limpa. Clicar em "40" abre o Índice de documentos.
6. **Barra recolhida:** ⌘\ recolhe e ⌘\ expande.
7. **Quadro:** G Q; ⇧→ move um card; "Ver todas →" abre as Concluídas do projeto. Excluir a coluna Revisão com destino e desfazer com ⌘Z.
8. **Falha:** rodar "Simular falha": aparece a faixa sob o cabeçalho e um ponto `atraso` no item da barra lateral. ⌘S tenta de novo.
9. **Tema e Perfil:** Você › Tema › Escuro, repetindo os passos 2 e 4. Você › Perfil e token: gerar, copiar e revogar.

## 7. Perguntas para o usuário

1. O app deve abrir no **último item** (proposto) ou sempre na **Visão geral** do último projeto?
2. A **serifa no corpo** dos documentos fica, ou você prefere sans também no texto?
3. Na barra lateral, **Fixados** vem antes de Documentos e Desenhos (proposto), ou some quando estiver vazio?
4. Sem visão entre projetos, a **contagem de atrasadas no seletor** basta, ou faz falta um resumo mínimo de prazos?
5. As **notas de margem** (número da seção, "Figura 1", "Originou:") ajudam, ou pesam? Dá para deixar só as notas de origem.
