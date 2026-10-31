# Sumário — pastas

**Pastas mistas de um nível:** uma pasta agrupa documentos e desenhos de um mesmo assunto. Pastas não contêm pastas, e tarefas não entram em pastas. As seções Documentos e Desenhos saem da barra lateral, e o tipo passa a ser dito pelo ícone da linha. O sistema visual é o da variante A (`sidebar.md`) com os tokens de `visual.md`.

## 1. Barra lateral com pastas

```
┌──────────────────────────────────┐  ┌──────────────────────────────────┐  ┌────┐
│   [T] Tinyfold ⌄               ◫ │  │   [T] Tinyfold ⌄               ◫ │  │  T │
│                                  │  │                                  │  │    │
│    ⌕  Buscar                   / │  │    ⌕  Buscar                   / │  │  ⌕ │
│    ◫  Visão geral                │  │    ◫  Visão geral                │  │  ◫ │
│    ▦  Quadro          1 atrasada │  │    ▦  Quadro          1 atrasada │  │  ▦ │
│                                  │  │                                  │  │    │
│   Itens                        5 │  │   Itens                       55 │  │  ☰ │
│▒   ▤  Visão do produto ▒▒▒▒▒▒▒▒▒▒│  │    ▤  Visão do produto           │  │    │
│       ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │  │       ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │  │    │
│  ›  ▢  MCP                     1 │  │  ›  ▢  Produto                11 │  │    │
│  ⌄  ▣  Arquitetura             2 │  │░ ›  ▢  MCP ░░░░░░░░░░░░░░░░ • 12 │  │    │
│     │  ▤  Notas de arquitetura   │  │  ⌄  ▣  Arquitetura            18 │  │    │
│     │  ◇  Fluxo do autosave      │  │     │  ▤  Notas de arquitetura   │  │    │
│    ◇  Navegação com projeto…     │  │     │  ◇  Fluxo do autosave      │  │    │
│                                  │  │     │  ▤  Documento de carga 21  │  │    │
│                                  │  │     │  ▤  … (8 recentes)         │  │    │
│                                  │  │     │  ›  Ver todos           18 │  │    │
│                                  │  │  ›  ▢  Operação                8 │  │    │
│                                  │  │    ◇  Navegação com projeto…     │  │    │
│                                  │  │    ◇  Desenho de carga 13        │  │    │
│                                  │  │    ▤  Documento de carga 35      │  │    │
│                                  │  │    ▤  Documento de carga 36      │  │    │
│                                  │  │    ▤  Documento de carga 37      │  │────│
│                                  │  │                                  │  │  ⌫ │
│──────────────────────────────────│  │──────────────────────────────────│  │  V │
│   (V) Você ⌄                 ⌫ 1 │  │   (V) Você ⌄                 ⌫ 1 │  │  ⇥ │
└──────────────────────────────────┘  └──────────────────────────────────┘  └────┘
```

Legenda:

- Barra normal, projeto grande e faixa recolhida.
- ▤ documento · ◇ desenho · ▢ pasta fechada · ▣ pasta aberta · › e ⌄ chevron.
- ▒ item ativo (`barra-a-ativo`).
- ░ pasta fechada que contém o item ativo (`barra-a-hover`, nome em 500).
- • ponto de "não salvo" (`atraso`).
- │ guia da pasta aberta.
- ┈ fio dos fixados.

**Ordem:** primeiro os **fixados da raiz**, depois um fio, depois as **pastas** (em ordem manual) e por fim os **itens soltos na raiz**.

- Dentro de uma pasta, os itens fixados sobem para o topo da pasta. Assim nada aparece duas vezes.
- Os itens soltos e os filhos de cada pasta seguem a ordenação do projeto: Recentes (padrão), A–Z ou Criação, escolhida no ⋯ de "Itens".
- O cabeçalho **"Itens n"** substitui os antigos rótulos de seção e reúne "+" (Documento, Desenho, Pasta) e ⋯ (Ordenar, Recolher todas as pastas). No esboço, havia uma linha em branco nesse lugar.

**Grade:** a largura passa de 248 para 256 px para abrir uma coluna de chevron. Continua havendo **uma única coluna de ícones** e **uma única borda de texto por nível**.

| Elemento | Posição e medida |
| --- | --- |
| Coluna de chevron | x 12–24, chevron de 12 centrado em x=18. Aparece só em pastas; nas outras linhas fica vazia |
| Ícone de raiz | x 28–44 (16 px), em todas as linhas: navegação, fixados, pastas e itens soltos. A marca do seletor fica centrada em x=36 |
| Texto de raiz | x=52 |
| Filho de pasta | O ícone fica em x 52–68, **sobre a borda de texto do pai**; o texto em x=76 |
| Guia da pasta aberta | 1 px `fio` em x=36 (centro do ícone da pasta), da linha da pasta até o último filho |
| Contagens e ações | À direita em x=240. No hover, "+" e "⋯" (botões de 20 px, ícones de 14) substituem a contagem |
| Linhas | 28 px, raio 6, sem espaço entre elas. Cabeçalho "Itens" com 24 px. Fio dos fixados de x=52 a 240, com 4 px acima e abaixo |

**Linha de pasta:**

| Estado | Fundo | Ícone | Nome | Direita |
| --- | --- | --- | --- | --- |
| Fechada | — | `folder`, cor `ícone` | `texto-2` 13/20 | contagem 12 `tnum` `texto-3` |
| Aberta | — | `folder-open` | `texto-2` | contagem |
| Hover | `barra-a-hover` | `texto` | `texto` | "+" e "⋯" |
| Fechada com o item ativo dentro | `barra-a-hover` | `texto` | `texto` 500 | contagem |
| Fechada com item não salvo dentro | — | — | — | ponto de 6 px `atraso` antes da contagem; tooltip "1 item não salvo" |
| Foco por teclado | anel interno de 2 px `acento` | | | |
| Alvo de arrastar | `seleção` com anel interno de 1 px `acento` | | | |
| Renomeando | campo inline de 24 px (`nível-1` no escuro, branco no claro), borda `acento` e halo | | | |

**Pasta e chevron:**

- O chevron (12 px, `ícone`) gira 90° em 120 ms.
- Clicar em qualquer ponto da linha da pasta abre ou fecha a pasta, exceto em "+" e "⋯". Uma pasta **não tem página**.

**Estado aberto ou fechado:**

- O estado fica lembrado **por projeto**, no dispositivo.
- Na primeira visita, todas as pastas começam fechadas, exceto a que contém o item ativo.
- Abrir um item de uma pasta fechada (pela busca ou por um link) expande a pasta e rola até ele.

**Escala** (projeto grande):

- Cada pasta aberta mostra no máximo **8 filhos** e a linha "Ver todos · n", que abre o Índice filtrado por aquela pasta.
- A raiz mostra no máximo **8 itens soltos** e "Ver todos na raiz · n".
- Os fixados ficam limitados a 8; ao tentar fixar o nono, aparece "Máximo de 8 fixados".
- O item ativo aparece **sempre**: se estiver além dos 8, entra como uma nona linha, logo acima de "Ver todos".
- Só a lista rola. Cabeçalho, Buscar, navegação e rodapé ficam fixos.

**Pasta vazia** (aberta): uma linha filha com "Pasta vazia · + Documento · + Desenho" em 12/16 `texto-3`, com links que viram `texto` no hover. Fechada, a pasta não mostra contagem.

**Faixa recolhida:** os ícones de Documentos e Desenhos dão lugar a um só, **Itens** (Lucide `folder-tree`). Ele abre um popover de 280 px com a mesma árvore: fixados, pastas que expandem e raiz com limite. O ponto "não salvo" também aparece nesse ícone.

## 2. Ações de pasta

- **Criar:**
  - Pelo "+" de "Itens" › Pasta, pelo menu Novo (N) › Pasta, pelo ⌘K "Nova pasta" ou por "Mover para pasta… › Nova pasta…", que cria a pasta e já move o item.
  - A pasta nova entra no topo das pastas, em modo de edição, com "Nova pasta" selecionado.
  - Nome vazio cancela a criação. Nome repetido no projeto mostra o erro inline "Já existe uma pasta MCP."
- **Renomear:** duplo clique no nome, F2 ou ⋯ › Renomear. ↵ salva e Esc desfaz.
- **Cor e ícone:** **nenhum.** As pastas são todas iguais, porque a cor já identifica o projeto e menos escolha mantém a barra calma. Fica como possível evolução.
- **Reordenar:** arrastar a linha da pasta, ⌥↑/⌥↓ com a pasta em foco, ou ⋯ › Mover para cima/baixo. A ordem das pastas é sempre manual.
- **Excluir:** o conteúdo nunca se perde.
  - **⋯ › Excluir pasta:** os itens **vão para a raiz**, sem diálogo. Aparece o toast "Pasta “MCP” excluída. 1 item foi para a raiz. Desfazer ⌘Z", e o Desfazer recria a pasta com os mesmos itens.
  - **⋯ › Excluir pasta e itens…** (perigo) abre um AlertDialog: "Excluir “MCP” e 1 item? Os itens vão para a Lixeira e podem ser restaurados por lá. A pasta deixa de existir." Botões [Cancelar] e [Excluir pasta e itens].
- **Mover itens:**
  - **Arrastar:**
    - Soltar sobre uma pasta destaca a linha (estado "alvo").
    - Uma pasta fechada abre depois de 600 ms sob o cursor.
    - Entre linhas, o indicador de inserção (2 px `acento`) começa na borda de texto do nível de destino, em x=52 ou 76.
    - Soltar no cabeçalho "Itens" ou entre itens soltos leva o item para a raiz.
    - Uma pasta nunca aceita outra pasta: sem indicador e com cursor de "não permitido".
  - **Teclado ou menu:** M, ou ⋯ do item › "Mover para pasta…", abre o popover abaixo. Depois aparece o toast "Movido para MCP. Desfazer".

```
┌──────────────────────────────────┐
│ ⌕ Mover para pasta…              │
│                                  │
│ ✓  Raiz do projeto               │
│ ▢  Produto                    11 │
│ ▢  MCP                        12 │
│ ▢  Arquitetura                18 │
│ ▢  Operação                    8 │
│ ─────────────────────────────    │
│ +  Nova pasta…                   │
│ ⇄  Outro projeto…                │
└──────────────────────────────────┘
```

- **Criar um item dentro de uma pasta:**
  - O "+" da pasta oferece Documento e Desenho.
  - N com o foco numa pasta ou num filho cria naquela pasta.
  - Na página de um item que está numa pasta, o menu Novo propõe "Novo documento em MCP".

## 3. Onde as pastas aparecem

| Lugar | Tratamento |
| --- | --- |
| Cabeçalho do documento ou desenho | À esquerda, rótulo discreto com o ícone de pasta (14 px) e "MCP" em 12/16 `texto-3`; o chevron aparece no hover. Clicar abre "Mover para pasta…". Na raiz: "Sem pasta" |
| ⌘K | Os resultados mostram o caminho "Tinyfold › MCP" à direita, em 12 `texto-3`. As pastas também são resultados ("MCP · pasta · 12 itens"): ↵ expande a pasta na barra e foca o primeiro filho. Comandos novos: "Nova pasta", "Mover para pasta…", "Recolher todas as pastas" |
| Índice | Vira um só "Índice", com coluna Tipo e filtros Tipo e Pasta. "Agrupar por pasta" vem ligado, com cabeçalhos (pasta e contagem) e "Sem pasta" por último. "Índice de documentos" passa a ser o Índice com Tipo = Documentos |
| Visão geral › Editados recentemente | A meta mostra o tipo e a pasta: "Documento · MCP", "Desenho · Arquitetura" |
| Lixeira | A coluna Origem mostra "Tinyfold › MCP". Restaurar devolve o item à pasta; se a pasta não existir mais, o item vai para a raiz com o aviso "A pasta “MCP” foi excluída; o item voltou para a raiz." |
| Filtro da barra | Os resultados vêm em lista plana, sem árvore, com o nome da pasta à direita (12 `texto-3`). As pastas cujo nome combina aparecem primeiro, num grupo "Pastas"; ↵ numa delas a expande e limpa o filtro |
| Popovers da faixa recolhida | A mesma árvore da barra (seção 1) |

## 4. Teclado

A lista vira uma árvore no padrão WAI-ARIA, com o componente `Tree` do React Aria: pastas com `aria-expanded` e itens com `aria-level` 1 ou 2.

| Tecla | Ação |
| --- | --- |
| ↑ / ↓, Home / End | Linha visível anterior ou seguinte; primeira ou última |
| → | Expande a pasta; se já estiver aberta, vai ao primeiro filho |
| ← | Recolhe a pasta; num filho, volta para a pasta |
| ↵ | Abre o item; numa pasta, alterna aberto e fechado |
| Letras | Vai à próxima linha que começa com a letra digitada |
| F2 | Renomeia a pasta |
| M | Mover para pasta… |
| ⌥↑ / ⌥↓ | Reordena a pasta em foco |
| N · P | Novo no contexto (dentro da pasta) · fixar ou desafixar o item |

**Esc não muda:** fecha a camada mais recente. Cancela a renomeação (restaurando o nome), fecha o popover "Mover para pasta…" e limpa o filtro. Esc **nunca** recolhe pastas nem navega.

## 5. Dados de exemplo

| Projeto | Fixados na raiz | Pastas | Itens soltos na raiz |
| --- | --- | --- | --- |
| Tinyfold | Visão do produto (documento) | **MCP**: MCP somente leitura · **Arquitetura**: Notas de arquitetura, Fluxo do autosave (desenho) | Navegação com projeto no centro (desenho) |
| Reforma do escritório | Planta do escritório (desenho) | **Compras**: Orçamento e fornecedores, Lista de compras | — |
| Geral | — | nenhuma (mostra que pasta é opcional) | Ideias soltas, Rabisco de logo |
| Projeto grande (simulação) | Visão do produto | **Produto** 11 (8 documentos + 3 desenhos) · **MCP** 12 (10 + 2) · **Arquitetura** 18 (12 + 6) · **Operação** 8 (6 + 2) | 5 (3 documentos + 2 desenhos) — total de 55 itens |

No esboço do usuário, "Produto" aparece com "Visão do produto" dentro. Com só 5 itens no Tinyfold, "Visão do produto" fica fixado na raiz e "Produto" existe apenas no projeto grande, para não haver uma pasta de um item só.

## 6. Nota de produto

- As pastas criam **um único nível fixo**: projeto › pasta › item. Pasta não é página: não tem conteúdo, propriedades nem subpastas. Cada documento ou desenho está em no máximo uma pasta, e tarefas ficam fora.
- Isso continua dentro de "sem hierarquias profundas de páginas": a profundidade é constante e rasa, a navegação não vira árvore recursiva e a pasta funciona como um agrupamento com lugar, mais próximo de uma etiqueta do que de uma página-mãe.
- **Atualizar o `produto.md`:**
  - Projetos ganham "pastas de um nível para documentos e desenhos".
  - O MCP passa a devolver o campo `pasta` nas listagens e na busca.
- **Modelo:** tabela `pasta` (`id`, `projeto_id`, `nome`, `ordem`, com `nome` único por projeto) e `pasta_id` opcional em documentos e desenhos. Mover um item para outro projeto limpa `pasta_id`.
