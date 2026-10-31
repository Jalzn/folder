# Sumário — barra lateral: três variantes

A organização não muda: seletor no topo, Visão geral, Quadro, Documentos e Desenhos com os fixados primeiro, Lixeira e Você no pé, filtro, recolher para faixa e escala para 40 documentos e 15 desenhos. Mudam só a forma e o ritmo. Os tokens são os da v3 (`visual.md`) mais os da barra listados abaixo. Os tamanhos de fonte, pesos e espaçamentos de letra seguem a tabela de tipografia da v3: Inter, `tnum` em contagens e datas, 450 no escuro e 400 no claro.

## Crítica da barra v3

Capturas em `verify-v3/`, claro e escuro, projeto normal e grande.

1. **O filtro é o elemento mais alto da barra:** uma caixa de largura total com borda `borda-campo` e a tecla "/". O olho cai nela antes do projeto e da navegação.
2. **Linhas misturadas:** Visão geral, Quadro e Lixeira têm ícone; documentos e desenhos não. A lista começa na borda de texto dos itens com ícone (x≈36), enquanto o rótulo de seção fica em x≈12. Isso lê como uma árvore de páginas, que é justamente o que a arquitetura recusa.
3. **Duas bordas direitas:** as contagens de seção terminam em x≈215 e as das linhas em x≈235.
4. **Paredão de 40 itens:** "Mostrar todos" expande no lugar e empurra Visão geral e Quadro para fora da tela. Na captura do projeto grande a navegação sumiu e Desenhos foi parar no rodapé. A única saída é o "Mostrar menos".
5. **Alfinete:** o ícone de 12 px em `texto-3` na ponta direita parece ruído, briga com o corte do título ("Navegação com projeto no…") e é o único ícone dessas linhas.
6. **Ritmo irregular:** as linhas têm 28 px, mas a pílula ativa e o separador dos fixados somam 2 a 4 px, então os espaços pulam (190 → 222 → 250 px). Os rótulos de seção têm 8 px acima e 0 abaixo.
7. **Cabeçalho fraco:** nome de 13 px, marca de 20 px e um ícone de recolher solitário. O projeto, centro do produto, pesa menos que o filtro logo abaixo.
8. **Rodapé apertado e desconectado:** duas linhas empilhadas (Lixeira com ícone e contagem; Você com avatar e chevron), atrás de um fio, com bordas de texto diferentes das da lista.
9. **No claro, a barra não se separa:** `#F5F7FA` contra o canvas `#FDFDFE` é quase igual, e só o fio separa as duas áreas, o que dá aparência de inacabado. No escuro, a separação funciona.

## Tokens novos da barra

| Token | Claro | Escuro | Uso | Contraste mín. do texto (claro / escuro) |
| --- | --- | --- | --- | --- |
| `barra-a-fundo` | `#F2F4F9` | `#0E1116` | Fundo da variante A | `texto-3` 5,3 / 7,1 |
| `barra-a-hover` | `#E9EBEF` | `#161A1F` | Hover da A | `texto-3` 4,9 / 6,6 |
| `barra-a-ativo` | `#E3E5EA` | `#1D2126` | Ativo e pressionado da A | `texto-3` 4,6 · `atraso` 4,6 / 6,1 · 6,5 |
| `aba-sublinhado` | `acento` | `acento` | Aba ativa da B (2 px) | 6,2 / 7,6 contra `fundo` (não texto) |
| `marcador` | `acento` | `acento` | Quadrado de 6 px da C | 6,2 / 7,6 (não texto) |

A B e a C usam `fundo`, `hover` e `seleção` da v3, e todos os textos já passam sobre eles. O ponto de salvamento pendente (6 px, `atraso`) mede ≥ 4,6:1 em todos os fundos. Não há um tom "pressionado" mais escuro na A, porque no claro ele derrubaria `texto-3` para 4,4.

## Variante A — Coluna de ícones

**Conceito:** a barra clássica do gênero, refinada: um ícone em **toda** linha, uma borda de texto só, pílulas discretas, e listas curtas com "Ver todos".

Em cada par de wireframes: projeto normal, projeto grande e faixa recolhida. "▒" marca a linha ativa e "┈" o fio entre os fixados e os demais.

```
┌────────────────────────────────┐  ┌────────────────────────────────┐  ┌───┐
│ [T] Tinyfold ⌄               ◫ │  │ [T] Tinyfold ⌄               ◫ │  │ T │
│                                │  │                                │  │   │
│ ⌕  Buscar                    / │  │ ⌕  Buscar                    / │  │ ⌕ │
│ ◫  Visão geral                 │  │ ◫  Visão geral                 │  │ ◫ │
│ ▦  Quadro           1 atrasada │  │ ▦  Quadro           1 atrasada │  │ ▦ │
│                                │  │                                │  │   │
│ Documentos                   3 │  │ Documentos                  40 │  │ ▤ │
│ ▤  Visão do produto            │  │ ▤  Visão do produto            │  │ ◇ │
│     ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈      │  │     ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈      │  │   │
│▒▤  MCP somente leitura ▒▒▒▒▒▒▒▒│  │▒▤  MCP somente leitura ▒▒▒▒▒▒▒▒│  │   │
│ ▤  Notas de arquitetura        │  │ ▤  Notas de arquitetura        │  │   │
│                                │  │ ▤  Documento de carga 01       │  │   │
│ Desenhos                     2 │  │ ▤  … (8 recentes)              │  │   │
│ ◇  Navegação com proj…         │  │ ›  Ver todos                40 │  │   │
│     ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈      │  │                                │  │   │
│ ◇  Fluxo do autosave           │  │ Desenhos                    15 │  │   │
│                                │  │ ◇  Navegação com proj…         │  │   │
│                                │  │     ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈      │  │   │
│                                │  │ ◇  Fluxo do autosave           │  │   │
│                                │  │ ◇  … (8 recentes)              │  │   │
│                                │  │ ›  Ver todos                15 │  │───│
│                                │  │                                │  │ ⌫ │
│────────────────────────────────│  │────────────────────────────────│  │ V │
│ (V) Você ⌄                 ⌫ 1 │  │ (V) Você ⌄                 ⌫ 1 │  │ ⇥ │
└────────────────────────────────┘  └────────────────────────────────┘  └───┘
```

**Medidas:**

| Elemento | Valor |
| --- | --- |
| Largura e fundo | 248 px, `barra-a-fundo`, com fio `fio` à direita |
| Grade horizontal | Padding de 8; linha com padding de 8; ícone de 16 em x=16; texto em x=40; contagens alinhadas à direita em x=232 (uma borda só) |
| Cabeçalho | 44 px. Seletor de 32 px de altura, raio 6: marca de 20 (raio 6), 8 px, nome, 4 px, chevron 12. Botão recolher de 28 px, visível no hover do cabeçalho ou com foco |
| Linhas | 28 px, raio 6, 0 px entre elas |
| Ritmo vertical | Cabeçalho → Buscar: 4. Navegação → primeira seção: 16. Entre seções: 16. Rótulo de seção: 24 px (texto em x=16) |
| Fio dos fixados | 1 px `fio`, de x=40 a 232, com 4 px acima e abaixo. Sem alfinete: o hover mostra o botão "Desafixar" (alfinete 14) no lugar da contagem |
| Rodapé | 44 px, com fio superior. Avatar redondo de 20 em x=16, "Você" em x=44 e chevron 12. À direita, um botão de 28 com lixeira 16 e contagem 11/14 |
| Faixa recolhida | 52 px, botões de 32 (raio 6) com ícones de 16 |

**Tipografia:**

- Nome do projeto: 13/20 600.
- Linhas: 13/20 em `texto-2`.
- Rótulo de seção: 12/16 500 `texto-3`.
- Contagens: 12/16 `tnum` `texto-3` ("1 atrasada" em `atraso`).
- `kbd` "/": 11/14.

**Estados:**

| Estado | Linha | Ícone | Texto |
| --- | --- | --- | --- |
| Repouso | sem fundo | `ícone` | `texto-2` |
| Hover | `barra-a-hover` | `texto` | `texto` |
| Ativo e pressionado | `barra-a-ativo` | `texto` | `texto` 500 |
| Foco por teclado | `inset 0 0 0 2px acento` | — | — |
| Pendente | ponto de 6 px `atraso` antes da borda direita | | |

**Comportamento:**

- **Buscar:** é uma linha da navegação, com lupa e "/". Clicar nela, ou apertar "/", a transforma num campo no mesmo lugar e com a mesma altura: fundo `nível-1` no escuro ou branco no claro, borda `acento` e halo. Os resultados substituem as seções; Esc volta.
- **Seções:**
  - O rótulo recolhe ou expande a seção. No hover aparecem um chevron de 12 à direita do rótulo e um "+" de 20 antes da contagem.
  - Cada seção mostra os fixados e os 8 mais recentes pela ordem escolhida. "Ver todos · 40" abre o Índice na área principal. A barra nunca vira paredão.
- **Fixos:** cabeçalho, Buscar e navegação ficam fixos no topo e o rodapé fica fixo embaixo. Só as seções rolam.
- **Seletor:** popover da v3 ancorado no botão de 32 px, com a largura da barra menos 16.
- **Faixa recolhida:** os ícones de Documentos e Desenhos abrem um popover com a mesma lista curta e "Ver todos".

## Variante B — Uma lista por vez

**Conceito:** a navegação fica fixa e uma única lista longa ocupa o resto, trocada por abas. As linhas mostram data, como uma caixa de correio. A barra tem a cor do canvas.

```
┌────────────────────────────────┐  ┌────────────────────────────────┐  ┌───┐
│ [T] Tinyfold               ⌄ ◫ │  │ [T] Tinyfold               ⌄ ◫ │  │ T │
│                                │  │                                │  │   │
│ ◫  Visão geral                 │  │ ◫  Visão geral                 │  │ ◫ │
│ ▦  Quadro           1 atrasada │  │ ▦  Quadro           1 atrasada │  │ ▦ │
│                                │  │                                │  │   │
│ Documentos 3   Desenhos 2      │  │ Documentos 3   Desenhos 2      │  │ ▤ │
│ ‾‾‾‾‾‾‾‾‾‾‾‾                   │  │ ‾‾‾‾‾‾‾‾‾‾‾‾                   │  │ ◇ │
│ ⌕ Filtrar…          Recentes ⌄ │  │ ⌕ Filtrar…          Recentes ⌄ │  │ ⌕ │
│                                │  │                                │  │   │
│ Fixados                        │  │ Fixados                        │  │   │
│   Visão do produto        hoje │  │   Visão do produto        hoje │  │   │
│                                │  │                                │  │   │
│ Todos                          │  │ Todos                          │  │   │
│▒  MCP somente leitura  ontem ▒ │  │▒  MCP somente leitura  ontem ▒ │  │   │
│   Notas de arquitetura  27 out │  │   Notas de arquitetura  27 out │  │   │
│                                │  │   Documento de carga 01  26 out│  │   │
│                                │  │   Documento de carga 02  26 out│  │   │
│                                │  │   Documento de carga 03  25 out│  │   │
│                                │  │   …                          ┃ │  │   │
│                                │  │   (rola aqui; 40 itens)      ┃ │  │   │
│                                │  │   Documento de carga 37  10 out│  │   │
│                                │  │                                │  │───│
│────────────────────────────────│  │────────────────────────────────│  │ ⌫ │
│ ⌫ Lixeira 1         (V) Você ⌄ │  │ ⌫ Lixeira 1         (V) Você ⌄ │  │ V │
└────────────────────────────────┘  └────────────────────────────────┘  └───┘
```

**Medidas:**

| Elemento | Valor |
| --- | --- |
| Largura e fundo | 264 px, `fundo` (igual ao canvas), com fio `fio` à direita |
| Grade | Padding de 10. Navegação: ícone em x=18, texto em x=42. Lista: texto em x=18 (sem ícone, porque a aba já diz o tipo). Data alinhada à direita em x=246 |
| Cabeçalho | 52 px. Marca de 24 (raio 7), nome em 14/20 600, chevron; recolher aparece no hover |
| Navegação | Linhas de 30, raio 6 |
| Abas | Linha de 36 px. "Documentos 3" e "Desenhos 2" com 16 px entre elas. Sublinhado `aba-sublinhado` de 2 px, 6 px abaixo da linha de base, na largura do rótulo |
| Filtro | Linha de 32 px. Lupa de 14 em x=18 e campo sem borda ("Filtrar documentos", em `texto-3`). Com foco: fundo `nível-1` (escuro) ou `hover` (claro) e halo. À direita, "Recentes ⌄" em 12/16 `texto-3` |
| Lista | Grupos "Fixados" e "Todos" em 11/16 500 `texto-3`, com 24 px e fixos ao rolar. Linhas de 30, raio 6: título em 13/20 e data em 12/16 `tnum` `texto-3` |
| Rodapé | 44 px, com fio superior. À esquerda, "Lixeira 1" como botão fantasma; à direita, avatar de 20, "Você" e "⌄" |
| Faixa recolhida | 52 px |

**Estados:**

- **Linhas:** repouso sem fundo e `texto-2`; hover `hover` e `texto`; ativo `seleção` e `texto` 500, com a data em `texto-2`; foco com anel interno de 2 px `acento`.
- **Abas:** inativa `texto-2` (hover `texto`); ativa `texto` 500 com sublinhado. Teclado: ←/→.

**Comportamento:**

- A região da lista tem rolagem própria, virtualizada, com barra de rolagem sobreposta. Os 40 documentos ficam navegáveis por inteiro, sem empurrar nada.
- A aba ativa fica lembrada por projeto.
- O filtro vale para a aba ativa e mostra "2 de 40". A última linha oferece "Buscar em tudo ⌘K".

## Variante C — Índice tipográfico

**Conceito:** um sumário de livro, sem ícones nas linhas. A hierarquia vem só do peso, do espaço e de fios-guia. Busca por botão. É a variante que mais se afasta do Linear.

```
┌────────────────────────────────┐  ┌────────────────────────────────┐  ┌───┐
│  T  Tinyfold                 ⌕ │  │  T  Tinyfold                 ⌕ │  │ T │
│                                │  │                                │  │   │
│                                │  │                                │  │ ⌕ │
│   Visão geral                  │  │   Visão geral                  │  │   │
│   Quadro            1 atrasada │  │   Quadro            1 atrasada │  │   │
│                                │  │                                │  │   │
│   Documentos ┈┈┈┈┈┈┈┈┈┈┈┈    3 │  │   Documentos ┈┈┈┈┈┈┈┈┈┈┈    40 │  │   │
│   Visão do produto  (500)      │  │   Visão do produto  (500)      │  │   │
│ ▪ MCP somente leitura          │  │ ▪ MCP somente leitura          │  │   │
│   Notas de arquitetura         │  │   Notas de arquitetura         │  │   │
│                                │  │   Documento de carga 01        │  │   │
│   Desenhos ┈┈┈┈┈┈┈┈┈┈┈┈┈┈    2 │  │   Documento de carga 02        │  │   │
│   Navegação com proj… (500)    │  │   Documento de carga 03        │  │   │
│   Fluxo do autosave            │  │   Ver os 40 →                  │  │   │
│                                │  │                                │  │   │
│                                │  │   Desenhos ┈┈┈┈┈┈┈┈┈┈┈┈┈    15 │  │   │
│                                │  │   Navegação com proj… (500)    │  │   │
│                                │  │   Fluxo do autosave            │  │   │
│                                │  │   Desenho de carga 01          │  │   │
│                                │  │   Ver os 15 →                  │  │   │
│                                │  │                                │  │ ⌫ │
│                                │  │                                │  │ V │
│   Lixeira 1  ·  Você ⌄         │  │   Lixeira 1  ·  Você ⌄         │  │ ⇥ │
└────────────────────────────────┘  └────────────────────────────────┘  └───┘
```

**Medidas:**

| Elemento | Valor |
| --- | --- |
| Largura e fundo | 240 px, `fundo` nos dois temas, com fio `fio` à direita |
| Grade | Uma borda de texto só, em x=24, para navegação, seções, itens e rodapé. Calha de x=12 a 20 para o marcador. Contagens à direita em x=228 |
| Cabeçalho | 56 px. Marca de 18 (raio 5) em x=24, nome em 15/20 600 em x=50. Botão ⌕ de 28 à direita; chevron e recolher no hover |
| Linhas | 26 px, texto 13/22, sem fundo e sem raio |
| Cabeçalho de seção | 28 px, com 16 acima. Rótulo em 12/16 500 `texto-3`, fio-guia de 1 px `fio` do fim do rótulo (+8) até a contagem (−8), e contagem 12 `tnum` |
| "Ver os 40 →" | 26 px, 12/16 500 `texto-3`; no hover, `acento` com sublinhado |
| Rodapé | 40 px, sem fio: "Lixeira 1 · Você ⌄" em 12/16 `texto-3`, como dois botões de texto |
| Faixa recolhida | 44 px: marca, ⌕; embaixo, lixeira, avatar e expandir |

**Estados:**

- **Repouso:** `texto-2`.
- **Fixado:** `texto` 500. O peso diz "fixado", sem ícone.
- **Hover:** `texto`, sem fundo.
- **Ativo:** `texto` 600 e o `marcador` (quadrado de 6 px, raio 2, `acento`) na calha.
- **Foco:** contorno de 2 px `acento`, com afastamento de 2 e raio 4 em volta do texto.
- **Pendente:** ponto de 6 px `atraso` depois do nome.

**Comportamento:**

- ⌕ ou "/" transformam o cabeçalho num campo de 32 px (fundo `nível-1` ou `hover`, com halo), que filtra as listas no lugar. Esc devolve o cabeçalho.
- Cada seção mostra os fixados e os 6 mais recentes; "Ver os 40 →" abre o Índice.
- Clicar no rótulo recolhe a seção, que então mostra "Documentos ┈┈ 40 ›".

## Recomendação: A, Coluna de ícones

- **Corrige todos os pontos da crítica:**
  - Uma coluna de ícones e uma borda de texto acabam com a mistura e com a cara de árvore.
  - Uma borda direita só alinha as contagens.
  - As listas curtas com "Ver todos" acabam com o paredão.
  - O fio no lugar do alfinete tira o ruído.
  - O filtro vira uma linha como as outras.
  - O cabeçalho ganha peso e o rodapé cabe numa linha.
  - O fundo da barra se separa do canvas também no claro.
- **Mantém Documentos e Desenhos visíveis ao mesmo tempo,** como a organização pede. A B esconde uma das listas atrás de uma aba.
- **Tem as melhores pistas para o mouse:** hover e ativo com fundo. A C depende só da cor do texto, que é mais fraca.
- **É a mais próxima do espírito Linear pedido e a mais barata de construir:** reaproveita a estrutura da v3 e troca só a pele.

**Quando preferir as outras:**

- **B,** se os projetos grandes forem a regra: ela navega 40 itens com datas, sem sair da barra.
- **C,** se o usuário quiser uma identidade mais própria e silenciosa.

Vale prototipar a A e deixar a B atrás de um comando PROTÓTIPO ("Barra: uma lista por vez") para comparar com dados de carga.
