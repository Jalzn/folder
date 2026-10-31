# Sumário — sistema visual (camada visual, v3)

Este documento troca só a camada visual do Sumário aprovado: tokens, tipografia, espaço, bordas, elevação, ícones, estados e movimento. **Estrutura, navegação, fluxos e conteúdo continuam como estão** (protótipo v2, capturas em `design/projeto/verify-v2/`).

O que as capturas da v2 mostram e esta versão corrige:

- **Pouca hierarquia de superfícies:** a gaveta, o quadro e a página têm quase a mesma cor, e os cards se separam só pelo contorno.
- **Texto grande demais na interface:** a barra lateral usa 15 px, o que dá ar de documento e não de ferramenta.
- **Foco do filtro azul sempre ligado,** até quando ninguém está digitando.
- **Card aberto e trecho de origem com fundo azul forte.**
- **Ícones de estado sem sistema:** cada lugar desenha o seu.

## 1. Quadro de referências

| Referência | O que tomamos | Por quê |
| --- | --- | --- |
| Linear, "How we redesigned the Linear UI" (https://linear.app/now/how-we-redesigned-the-linear-ui) | Tema gerado num espaço de cor uniforme a partir de **base, acento e contraste**. Elevação (fundo → painel → diálogo) por pequenos degraus de luminosidade. Cor de cromo contida. Texto e ícones neutros com mais contraste. Inter Display nos títulos e Inter no resto. Rótulos e ícones da barra alinhados numa grade estrita. | É o núcleo do "jeito Linear" e dá um sistema, não uma paleta solta. Usamos **OKLCH** (sucessor prático do LCH no CSS) para gerar os dois temas da mesma fonte. |
| Vercel Geist, cores (https://vercel.com/geist/colors) | Papéis fixos por degrau: fundo, hover, ativo; borda padrão, hover e ativa; texto secundário e principal. Bordas desenhadas uma vez só. Sombras translúcidas. | Dá nome e função a cada token, o que evita "cinzas soltos" e decisões caso a caso. |
| Radix Colors, escala de 12 degraus (https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | O mapa de degraus (1–2 fundos, 3–5 componentes, 6–8 bordas, 11–12 texto), com garantia de contraste nos degraus de texto. | Serve de modelo para "texto sempre legível sobre os fundos da mesma escala". Aqui a garantia é WCAG 4,5:1, verificada em todos os fundos. |
| Inter (https://rsms.me/inter/) e métricas dinâmicas (https://rsms.me/inter/dynmetrics/) | Recursos `cv05`, `ss03`, `tnum`, `case`. Eixo óptico de texto a display. Espaçamento entre letras por tamanho. | É a tipografia do gênero, com recursos para dar uma voz própria. |
| Raycast, leituras de terceiros (https://www.webdesignhot.com/design.md/raycast/, https://design.hagicode.com/designs/raycast/DESIGN.md), valores aproximados | Teclas (`kbd`) com relevo sutil, `ss03` e escada de superfícies em vez de sombra. | É o melhor exemplo de atalho de teclado com aparência de tecla. Fica com o selo de "aproximado". |
| Leitura de terceiros do "estilo Linear" (https://www.buildmvpfast.com/blog/linear-aesthetic-tokens-density-keyboard-first-ux-2026) | Densidade: texto de interface de 13 px, grade de 4 px, linhas de 32–36 px, raios de 6–8 px, superfícies em degraus de ~2% de luminosidade, fios como textura. | Confirma a densidade. **Rejeitamos** o terciário dele (~3,6:1), que reprova no AA. |
| Notas de tendência (https://bootcamp.uxdesign.cc/the-rise-of-linear-style-design-origins-trends-and-techniques-4fd96aab7646, https://blog.logrocket.com/ux-design/linear-design) | Contenção, acento raro, luz sutil no topo das superfícies elevadas, pesos médios, números tabulares. Também a crítica de que o estilo virou padrão genérico. | A crítica orienta a seção 8: o que torna isto Tinyfold. |

## 2. Cor: gerador e tokens

**Entradas do gerador (OKLCH):**

| Entrada | Escuro | Claro | Nota |
| --- | --- | --- | --- |
| Base: matiz e croma | h 262, C 0,012 | h 262, C 0,005 | Cinza frio com um traço de azul, herdeiro do grafite aprovado |
| Base: âncora de luminosidade (`fundo`) | L 0,200 | L 0,995 | Âncora 0,25 no escuro reproduz o grafite aprovado (`fundo` ≈ #1F2228), se o usuário preferir |
| Acento: matiz e croma | h 268, C 0,13 (texto) / 0,165 (sólido) | h 268, C 0,18 | **Anil**: o azul aprovado `#7FA6E8` (h ≈ 259) girado 9° para o violeta |
| Contraste | 60 | 60 | Escala a distância de luminosidade entre fundos e textos (0–100) |

**Regras de derivação:**

- **Superfícies no escuro:** sobem em degraus de +0,025 L (`lateral` 0,175 → `fundo` 0,200 → níveis 1, 2 e 3).
- **Superfícies no claro:** são brancas; a elevação vem de fio e sombra (seção 4).
- **Hover e ativo:** hover = +0,04 L sobre a própria superfície no escuro (−0,035 no claro); ativo = +0,07 (−0,055).
- **Seleção:** usa o matiz do acento com croma de 0,045 (escuro) ou 0,025 (claro).
- **Fios:** `fio` = fundo ±0,10 L; `fio-forte` = ±0,155. A `borda-campo` tem no mínimo 3:1 contra todas as superfícies.
- **Texto:** os três níveis ficam a ≥ 4,5:1 sobre todos os fundos (lateral, fundo, níveis, hover, ativo, seleção). O gerador falha a construção se algum par cair abaixo disso.
- **Semânticas:** mesmas L e C nos dois temas, com matiz próprio: atraso 25°, ok 152°, aviso 78°, conflito 330°. Os fundos das faixas usam L 0,275 (escuro) ou 0,965 (claro).

**Mudanças sobre a identidade aprovada** (`docs/identidade-visual.md`), a confirmar com o usuário:

- **Acento:** `#7FA6E8` passa a `#86A5FB` no escuro e `#3856C8` no claro.
- **Fundo escuro:** `#202329` passa a `#13161C`. Os níveis sobem até `#24272D`, perto do antigo `#282D35`.
- **Conclusão:** `#8CC79A` passa a `#6AD18A`.

### Tokens

O contraste mínimo é medido sobre `lateral`, `fundo`, `nível-1/2/3`, `hover`, `hover-nível`, `ativo` e `seleção`.

| Token | Escuro | Claro | OKLCH escuro / claro | Uso | Contraste mín. (escuro / claro) |
| --- | --- | --- | --- | --- | --- |
| `lateral` | `#0E1116` | `#F5F7FA` | 0.175 0.012 262 / 0.975 0.005 262 | Barra lateral, faixa recolhida | — |
| `fundo` | `#13161C` | `#FDFDFE` | 0.200 0.012 262 / 0.995 0.005 262 | Canvas: documento, quadro, páginas | — |
| `nível-1` | `#191D22` | `#FFFFFF` | 0.228 0.012 262 / 1.000 0.000 262 | Nível 1: cards, campos, blocos de código | — |
| `nível-2` | `#1F2228` | `#FFFFFF` | 0.252 0.012 262 / 1.000 0.000 262 | Nível 2: gaveta, menus, popovers, ⌘K | — |
| `nível-3` | `#24272D` | `#FFFFFF` | 0.272 0.012 262 / 1.000 0.000 262 | Nível 3: diálogos | — |
| `hover` | `#1C1F25` | `#F0F2F5` | 0.240 0.012 262 / 0.960 0.005 262 | Hover sobre canvas e barra | — |
| `hover-nível` | `#25292E` | `#F2F3F7` | 0.278 0.012 262 / 0.965 0.005 262 | Hover dentro de nível 1–2 | — |
| `ativo` | `#23262C` | `#E9EBEF` | 0.268 0.012 262 / 0.940 0.005 262 | Pressionado; item atual da barra | — |
| `seleção` | `#202941` | `#E8EEFF` | 0.285 0.045 268 / 0.950 0.025 268 | Selecionado / aberto na gaveta (tinta do acento) | — |
| `fio` | `#2B2E34` | `#E1E3E6` | 0.300 0.012 262 / 0.915 0.005 262 | Fio fino: divisórias, contorno de card | — |
| `fio-forte` | `#383C42` | `#CFD1D4` | 0.355 0.012 262 / 0.860 0.005 262 | Fio de cabeçalho de coluna, hover de card | — |
| `borda-campo` | `#6F737A` | `#8A8C8F` | 0.555 0.012 262 / 0.640 0.005 262 | Borda de campo, checkbox (não texto) | 3,4 / 3,1 (não texto) |
| `texto` | `#ECF0F8` | `#18191C` | 0.955 0.012 262 / 0.215 0.005 262 | Texto principal | 12,6 / 14,7 |
| `texto-2` | `#BEC3CA` | `#47494C` | 0.815 0.012 262 / 0.405 0.005 262 | Texto secundário, valores | 8,1 / 7,6 |
| `texto-3` | `#9A9FA6` | `#636568` | 0.700 0.012 262 / 0.505 0.005 262 | Meta, rótulos, placeholders | 5,4 / 4,9 |
| `ícone` | `#ADB1B9` | `#595B5E` | 0.760 0.012 262 / 0.470 0.005 262 | Ícones neutros | 6,7 / 5,7 |
| `acento` | `#86A5FB` | `#3856C8` | 0.735 0.130 268 / 0.500 0.180 268 | Links, foco, item ativo, progresso | 6,0 / 5,3 |
| `acento-sólido` | `#4B6BD4` | `#3856C8` | 0.560 0.165 268 / 0.500 0.180 268 | Fundo do botão primário | 3,8 / 6,2 (forma) |
| `acento-sólido-hover` | `#4260C8` | `#2F4ABA` | 0.525 0.165 268 / 0.460 0.180 268 | Hover do botão primário | — |
| `sobre-acento` | `#FAFCFF` | `#FFFFFF` | 0.990 0.012 262 / 1.000 0.000 262 | Texto no botão primário | 4,7 / 6,3 |
| `atraso` | `#F98078` | `#C22826` | 0.735 0.150 25 / 0.530 0.190 27 | Prazo vencido, falha | 5,8 / 4,8 |
| `atraso-fundo` | `#3D1D1B` | `#FEF0EE` | 0.275 0.050 25 / 0.965 0.022 27 | Faixa de falha | — |
| `ok` | `#6AD18A` | `#21763C` | 0.780 0.140 152 / 0.500 0.120 150 | Concluído, "Salvo" com ícone | 7,6 / 4,7 |
| `ok-fundo` | `#152E1C` | `#E8F9EB` | 0.275 0.045 152 / 0.965 0.025 150 | Faixa de sucesso | — |
| `aviso` | `#F2B95A` | `#8F5A04` | 0.820 0.130 78 / 0.515 0.110 70 | Aviso (rascunho recuperado) | 8,2 / 4,8 |
| `aviso-fundo` | `#342611` | `#FFF4E2` | 0.280 0.040 78 / 0.970 0.030 80 | Faixa de aviso | — |
| `conflito` | `#E38FDB` | `#982F93` | 0.760 0.140 330 / 0.500 0.180 330 | Conflito de versão | 6,3 / 5,6 |
| `conflito-fundo` | `#352033` | `#FDEEFB` | 0.280 0.045 330 / 0.965 0.022 330 | Faixa de conflito | — |
| `perigo-sólido` | `#CA3638` | `#C22826` | 0.560 0.185 25 / 0.530 0.190 27 | Botão destrutivo | texto 5,0 / 5,8 |
| `toast` | `#2B2E34` | `#202224` | 0.300 0.012 262 / 0.250 0.005 262 | Fundo do toast | — |
| `sobre-toast` | `#EDF2FA` | `#F8FAFE` | 0.960 0.012 262 / 0.985 0.005 262 | Texto do toast | 12,1 / 15,3 |

- **Pares das faixas:**
  - Escuro: atraso 6,0 · ok 7,7 · aviso 8,3 · conflito 6,6.
  - Claro: atraso 5,2 · ok 5,2 · aviso 5,3 · conflito 5,9.
  - `texto` sobre qualquer faixa: ≥ 12,8.
- **Translúcidos:**
  - Seleção de texto (`::selection`) em `acento` com alfa .30 (escuro) ou .22 (claro).
  - Véu de diálogo: `rgb(4 6 10 / .55)` no escuro e `rgb(16 18 27 / .18)` no claro.
- **Desabilitado:** o componente fica com opacidade .45. A regra de contraste não se aplica a elementos desabilitados.

**Etiquetas:** o chip tem o nome em `texto-2` (passa nos números de `texto-2`). A cor aparece só num quadradinho de 7 px, com ≥ 3:1 sobre os fundos.

| Etiqueta | Escuro | Claro | Contraste mín. do quadrado (escuro / claro) |
| --- | --- | --- | --- |
| mcp | `#6FB6FE` | `#1577C8` | 6,7 / 4,0 |
| backend | `#A7B2C5` | `#6B7587` | 6,8 / 4,0 |
| editor | `#BE9DF7` | `#835CBE` | 6,4 / 4,3 |
| kanban | `#0DCBC3` | `#048681` | 7,1 / 3,8 |
| operação | `#E5A14B` | `#A06604` | 6,5 / 4,1 |
| fornecedores | `#F69370` | `#BA4E25` | 6,4 / 4,3 |
| compras | `#8CC36D` | `#4A871B` | 7,0 / 3,8 |

**Marcas de projeto:** quadrado de 20 px, raio 6, letra Inter 600 11 px.

| Marca de projeto | Escuro (fundo / letra) | Claro (fundo / letra) | Contraste da letra |
| --- | --- | --- | --- |
| T Tinyfold (violeta) | `#382B4D` / `#C2A7F4` | `#EEE7FF` / `#68449C` | 6,2 / 6,0 |
| R Reforma do escritório (âmbar) | `#462D0B` / `#E5AB66` | `#FBE8D3` / `#7E4F04` | 6,3 / 5,8 |
| G Geral (cinza) | `#31363D` / `#B7BECB` | `#E5E8ED` / `#474D58` | 6,5 / 6,9 |
| S Site pessoal 2024 (verde) | `#193B22` / `#82CB92` | `#DCF2DF` / `#046E30` | 6,5 / 5,4 |

## 3. Tipografia

- **Famílias:**
  - **Inter** (variável, eixos `wght` 100–900 e `opsz` 14–32) para tudo.
  - Títulos usam o corte display pelo eixo óptico (`font-optical-sizing: auto`). Em fontes sem esse eixo, usar `font-variation-settings: "opsz" 32` a partir de 20 px.
  - **JetBrains Mono** para código, token e comando.
- **Recursos de Inter, em todo o app:** `font-feature-settings: "cv05", "ss03", "calt"`.
  - `cv05` é o l minúsculo com cauda, que desfaz a confusão entre l, I e 1 em títulos e tokens.
  - `ss03` arredonda aspas e vírgulas e dá uma voz mais macia.
- **Recursos por contexto:**
  - `tnum` em datas, contagens, progresso, tabelas e prazos.
  - `case` em sequências com maiúsculas e números (por exemplo "G 1" e `kbd`).
- **Espaçamento entre letras:** segue a fórmula de métricas dinâmicas de Inter, `−0,0223 + 0,185·e^(−0,1745·tamanho)` em em. Os valores estão na tabela.
- **Pesos:** a interface usa 450 no escuro e 400 no claro (o texto claro sobre escuro parece mais fino). Ênfase em 500, títulos em 600. Sem 700.
- **Hospedagem:**
  - No app real, servir `InterVariable.woff2` (e o itálico) e `JetBrainsMono` da própria origem, com `font-display: swap`, preload do Inter e subconjuntos latin e latin-ext.
  - O protótipo usa Google Fonts (`Inter:opsz,wght@14..32,100..900`). Se o Google Fonts não servir `cv05` e `ss03`, o protótipo segue sem eles; o arquivo do rsms tem todos.

| Papel | Tamanho/linha | Peso | Espaçamento | Recursos |
| --- | --- | --- | --- | --- |
| Título de página (documento, desenho, Visão geral, Quadro, Perfil, índices) | 30/36 | 600 | −0,021em | opsz display |
| Título da tarefa (gaveta) | 20/28 | 600 | −0,017em | opsz display |
| H1 · H2 · H3 no documento | 24/32 · 19/26 · 16/24 | 600 | −0,020 · −0,016 · −0,011em | |
| Corpo do documento | 15/24 | 400 | −0,009em | Coluna de 680 px |
| Descrição da tarefa | 14/22 | 400 | −0,006em | |
| Interface: itens da barra, menus, botões, propriedades | 13/20 | 450 (escuro) / 400 (claro); ênfase 500 | −0,003em | |
| Título de card | 13/18 | 500 | −0,003em | |
| Rótulo de seção (barra, Visão geral, menus) | 12/16 | 500 | 0 | Caixa normal, `texto-3` |
| Meta, datas, contagens, etiquetas | 12/16 | 450 / 400 | 0 | `tnum` |
| Micro: `kbd`, contadores do seletor | 11/14 | 500 | +0,005em | `tnum`, `case` |
| Código e token | JetBrains Mono 13/20 | 400 | 0 | Zero com ponto (padrão da fonte) |

## 4. Espaço, alturas, raios, bordas e elevação

- **Grade:** 4 px. Espaçamentos: 4, 8, 12, 16, 24, 32, 48.
- **Alturas:**
  - Linhas da barra lateral: 28 px.
  - Itens de menu e resultados do ⌘K: 30 e 36 px.
  - Linhas de lista (Visão geral, índice): 36 px.
  - Botões: 28 px (24 px nos densos).
  - Campos: 28 px na barra e 32 px nos formulários.
  - Cabeçalho de página: 44 px; cabeçalho da gaveta: 52 px.
- **Raios:** 4 (chip de etiqueta, `kbd`, checkbox), 6 (botões, campos, linhas da barra, itens de menu), 8 (cards, incorporados, faixas, toasts), 10 (menus, popovers), 12 (⌘K, diálogos e cantos superiores da gaveta).
- **Bordas:** 1 px sempre, uma borda por elemento e nenhuma borda dupla entre vizinhos. O foco é um contorno de 2 px em `acento`, com afastamento de 2 px. Campos focados trocam a borda por `acento` e ganham um halo `0 0 0 3px` em `acento` com alfa .25.
- **Elevação no escuro:** é luminosidade, não sombra. Cada nível sobe +0,025 L e tem `fio`.
  - Superfícies flutuantes (menus, popovers, ⌘K, gaveta, toasts, botão primário) recebem **luz no topo**: `inset 0 1px 0 rgb(255 255 255 / .05)`.
  - A sombra fica só no que flutua: `0 8px 24px rgb(0 0 0 / .45)`; na gaveta, `0 −12px 32px rgb(0 0 0 / .40)`.
- **Elevação no claro:** as superfícies são brancas sobre `fundo` quase branco.
  - Card: `fio` e `0 1px 0 rgb(16 18 27 / .04)`.
  - Flutuantes: `0 4px 16px rgb(16 18 27 / .08), 0 1px 3px rgb(16 18 27 / .06)`.
  - Gaveta: `0 −8px 24px rgb(16 18 27 / .08)`.
  - Sem luz no topo.
- **Degradês:** nenhum. Um degradê claro no botão primário reduziria o contraste do texto no escuro, que tem só 4,7:1 de folga. A "luz no topo" é só o fio interno de 1 px, que não passa sob o texto.
- **Barras de rolagem:** sobrepostas, com polegar de 6 px em `fio-forte` (raio 3) e trilho transparente. Aparecem com o hover.

## 5. Ícones

- **Conjunto:** **Lucide**, traço 1,5, cantos arredondados, em 16 px na interface e 14 px na meta. Não usar ícones preenchidos.
- **Cores:** `ícone` por padrão; `texto` no hover ou quando ativo; `acento` só no item atual ou numa ação primária. Os ícones semânticos usam a cor do estado.
- **Ícones de estado próprios** (14 px, desenhados em SVG): o **anel de coluna**.
  - Primeira coluna: círculo vazio (`ícone`).
  - Colunas intermediárias: círculo com setor preenchido em `acento`, proporcional à posição (índice ÷ (n − 1)). Com A fazer, Em andamento, Revisão e Concluído, isso dá 0, ⅓ e ⅔.
  - Coluna de conclusão: círculo cheio em `ok` com check em `fundo`.
  - O mesmo ícone aparece no cabeçalho da coluna, no card, no incorporado, na Visão geral e na gaveta.
- **Progresso do checklist:** anel de 14 px, traço 2, trilho `fio-forte` e valor `acento` (`ok` quando completo), mais o texto "2/5" em `tnum`.

## 6. Componentes, estado por estado

### Barra lateral (248 px, fundo `lateral`, fio à direita)

```
x: 8   12        36                                  236
   │   │         │                                     │
   ├───┴─────────┴─────────────────────────────────────┤ 28 px
   │   ◧   Visão geral                                  │  ícone 16 em x=12, texto em x=36
   │   ▦   Quadro                           1 atrasada  │  contagem à direita, tnum
   │                                                    │  8 px
   │   Documentos ›                                 3 + │  rótulo 12/16 em x=12 (› e + no hover)
   │       Visão do produto                         ⌖   │  itens sem ícone, texto em x=36
   │       MCP somente leitura                          │
```

| Elemento | Repouso | Hover | Ativo/atual | Foco (teclado) |
| --- | --- | --- | --- | --- |
| Linha (28 px, raio 6, margem lateral 8) | `texto-2`, sem fundo | fundo `hover`, `texto` | fundo `ativo`, `texto` 500 | anel interno de 2 px `acento` |
| Ícone fixo (Visão geral, Quadro, Lixeira) | `ícone` | `texto` | `texto` | — |
| Rótulo de seção | `texto-3` 12/16 500 | `texto-2`; aparecem "›" (gira ao recolher) e "+" | — | anel |
| Contagem | `texto-3` 12 `tnum` | igual | igual | — |
| Fixado | ícone de alfinete 12 px `texto-3` à direita; 4 px de espaço antes dos demais, sem fio | | | |
| Pendente ou falha | ponto de 6 px em `atraso` depois do nome | | | |

- **Filtro:** 28 px, raio 6. No escuro, fundo `nível-1`; no claro, branco. Borda `borda-campo`, ícone de lupa 14 px e `kbd` "/".
  - Foco: borda `acento` e halo.
  - O foco só aparece quando o campo está realmente focado. A v2 deixava o anel aceso: corrigir.
- **Rodapé:** "Lixeira" (ícone e contagem) e "Você" (avatar redondo de 20 px em `ativo` com a inicial 11/14 500, e "⌄").
- **Faixa recolhida (48 px):** botões de 32 px, raio 6, ícones de 16 px.

**Seletor de projeto:**

- **Gatilho:** 36 px, marca de 20 px, nome em 13/20 600 e "⌄" em `ícone`; o hover usa `hover`.
- **Popover:** 300 px, `nível-2`, raio 10 e sombra de flutuante.
- **Campo de filtro:** sem borda e com fio inferior.
- **Linhas:** 30 px, raio 6. À direita, "1 atrasada" (`atraso`) e "G 1" em `kbd`. O projeto atual ganha um check `acento` no lugar do atalho. O hover e a linha ativa por teclado usam `hover-nível`.
- **Grupos:** rótulos de 11/14 500 `texto-3`.

### Botões

| Tipo | Repouso | Hover | Pressionado | Foco | Desabilitado |
| --- | --- | --- | --- | --- | --- |
| Primário (28 px, raio 6, padding 0 12) | `acento-sólido`, texto `sobre-acento` 13/20 500, luz no topo (fio interno de 1 px) | `acento-sólido-hover` | translada 0,5 px para baixo | anel `acento` com afastamento 2 | opacidade .45 |
| Secundário | escuro: `nível-1` + `fio`; claro: branco + `fio` + `0 1px 0 rgb(16 18 27/.04)`; texto `texto` | fundo `hover-nível`, borda `fio-forte` | fundo `ativo` | anel | .45 |
| Fantasma | sem fundo, `texto-2` | `hover`, `texto` | `ativo` | anel | .45 |
| Ícone (28×28, ícone 16) | `ícone` | `hover`, `texto` | `ativo` | anel | .45 |
| Destrutivo | `perigo-sólido` + `sobre-acento` | `perigo-sólido` com brilho .92 | — | anel | .45 |

- **`kbd`:** 18 px de altura, `min-width` 18, raio 4, fundo `nível-1`, borda `fio` com `inset 0 −1px 0 fio-forte` (relevo de tecla) e texto 11/14 `texto-3`.

### Campos e checkbox

- **Campos:** 32 px, raio 6, fundo `nível-1` (escuro) ou branco (claro), borda `borda-campo` e placeholder `texto-3`. Hover: borda `texto-3`. Foco: borda `acento` e halo. Erro: borda `atraso`, com a mensagem 12/16 `atraso` abaixo.
- **Checkbox:** 14 px, raio 4, borda de 1,5 px `borda-campo`. Marcado: fundo `acento-sólido` e check `sobre-acento`. Hover: borda `texto-3`.

### Menus, popovers e ⌘K

- **Menu ou popover:** `nível-2`, borda `fio`, raio 10, padding 4, sombra de flutuante e luz no topo (escuro).
  - Item: 30 px, raio 6, padding 0 8, ícone 16 `ícone` e texto 13 `texto`; o atalho fica à direita em `kbd`.
  - Hover e item ativo por teclado: `hover-nível`. Item perigoso: texto e ícone `atraso`.
  - Separador: `fio`, com margem de 4. Rótulo de grupo: 11/14 500 `texto-3`.
- **⌘K:**
  - Painel de 640 px a 12vh do topo, `nível-2`, raio 12, sombra e luz no topo, sobre o véu.
  - Campo de 48 px, em 15/22, sem borda e com fio inferior.
  - Resultados de 36 px (raio 6, margem 0 6), com título 13 `texto` e trecho 12 `texto-3`. O termo encontrado aparece em `texto` 600, sem fundo amarelo.
  - Rodapé de 32 px com `kbd` ↑↓ ↵ esc.

### Quadro

```
◔ Em andamento  2                     card (nível-1, fio, raio 8, padding 10/12)
                                      ┌──────────────────────────────────────┐
                                      │ ◔  Gerar token pessoal no Perfil     │  título 13/18 500
                                      │    04 nov   ◔ 2/5   [▪ mcp] [▪ backend]│  meta 12/16, 8 px entre itens
                                      └──────────────────────────────────────┘
```

- **Cabeçalho da coluna (28 px):** anel de coluna de 14 px, nome em 13/20 500 `texto`, contagem em 12 `tnum` `texto-3` e, no hover, "+" e "⋯".
  - Sem fio embaixo: a densidade e o alinhamento bastam.
  - As colunas não têm fundo e ficam a 12 px umas das outras. Ao arrastar sobre uma coluna, ela ganha fundo `hover` com raio 10.
- **Card:**

| Estado | Escuro | Claro |
| --- | --- | --- |
| Repouso | `nível-1`, borda `fio` | branco, borda `fio`, sombra `0 1px 0 /.04` |
| Hover | `hover-nível`, borda `fio-forte`; o ⋯ aparece | borda `fio-forte`, `0 1px 3px /.08` |
| Foco | anel `acento` com afastamento 2 | igual |
| Aberto na gaveta | fundo `seleção`, borda `acento` com alfa .35 | igual |
| Arrastando | sombra de flutuante e opacidade .92; o lugar de origem vira tracejado `fio-forte` | igual |
| Concluído | título `texto-2`, anel `ok`, sem destaque de prazo | igual |

- **Prazo:** "04 nov" em 12 `tnum` `texto-3`. Atrasado: ícone de relógio de 12 px e "28 out" em `atraso` 500; o `aria-label` traz "atrasada desde 28 out".
- **Chip de etiqueta:** 20 px, raio 4, padding 0 6 0 5, borda `fio` e fundo transparente. Leva um quadradinho de 7 px (raio 2) na cor da etiqueta e o nome em 12/16 `texto-2`. No máximo 2 por card, depois "+n". Na gaveta, o chip é editável: hover com borda `fio-forte` e "×".
- **Rodapé da coluna de conclusão:** "Mais 23 concluídas antes de 16 out →" em 12 `texto-3`, com hover `texto` e sublinhado.

### Gaveta da tarefa

- **Moldura:**
  - `nível-2` (escuro) ou branca (claro), com cantos superiores de raio 12.
  - Fio superior `fio`, luz no topo e sombra para cima.
  - Alça de 32×4 px (raio 2) em `fio-forte`, que vira `borda-campo` no hover.
- **Cabeçalho (52 px):**
  - Anel de coluna de 16 px e título em 20/28 600.
  - À direita, o estado "Salvo" em 12 `texto-3`. Falha: ícone e `atraso`, com o botão secundário "Tentar de novo".
  - Botão secundário "Concluir", com ícone de círculo com check; a tooltip mostra "⌘↵".
  - Botões de ícone ⋯ e ✕.
- **Propriedades:**
  - Coluna de 300 px, grade de 88 px + 1fr com linhas de 30 px. Rótulo em 12/16 `texto-3`; valor em 13/20.
  - O valor é um botão fantasma (hover `hover-nível`, raio 6, padding 0 6, margem −6).
  - Checklist: barra de 64×4 px, raio 2, `acento` sobre `fio-forte`.
  - Origem: link `acento`, e o trecho em 12/18 `texto-2` cortado em 3 linhas.
- **Descrição:** 14/22. Itens de checklist com 28 px. Item feito: `texto-3`, riscado em `fio-forte`.
- **Divisória vertical:** 1 px `fio`.

### Documento: itens incorporados

- **Tarefa:** card `nível-1`, borda `fio` e raio 8, com padding 10/12.
  - Linha 1: anel de coluna e título em 14/20 500.
  - Linha 2: a meta do card e, à direita, a coluna em 12 `texto-3`.
  - Hover: borda `fio-forte`. Aberta: `seleção` com borda `acento` .35, e "aberta abaixo" em `texto-3`.
- **Desenho:** moldura com raio 8, borda `fio` e fundo `fundo`. Legenda em 12/16 `texto-3`, "Figura 1 — …". "Abrir ↗" em `acento` aparece no hover da figura.
- **Indisponível:** borda tracejada `fio-forte`, sem fundo, texto `texto-2` e as ações em botões fantasma de 24 px.
- **Marcador de origem:** botão de 18 px, raio 4, com o anel de coluna de 12 px em `acento`.
  - Hover: fundo `seleção`, e o trecho ganha um sublinhado pontilhado `acento` de 1 px com afastamento de 3 px.
  - O trecho **não** recebe mais fundo azul, como acontecia na v2.

### Toasts e faixas

- **Toast:**
  - Fundo `toast`, raio 8, padding 8 8 8 12, sombra de flutuante, texto 13/20 `sobre-toast` e no máximo 360 px.
  - Ação: botão de 24 px com borda `rgb(255 255 255 / .18)` e texto `sobre-toast`.
  - Fica no canto inferior direito da área de conteúdo (como no refino).
- **Faixa** (falha, conflito, rascunho, arquivado):
  - Altura mínima de 36 px, raio 8, fundo `*-fundo`, ícone 16 na cor do estado, texto 13 `texto` e ação em botão secundário de 24 px.
  - Sem borda lateral colorida.
  - Fica fixa sob o cabeçalho, com 8 px de margem.

## 7. Movimento

| O quê | Duração | Curva | Detalhe |
| --- | --- | --- | --- |
| Cor e fundo de hover | 100 ms | `ease-out` | Só `background-color`, `color` e `border-color` |
| Menus, popovers, seletor | 140 ms | `cubic-bezier(.2,.8,.2,1)` | Escala de .98 a 1 e opacidade; origem no gatilho |
| ⌘K | 160 ms | idem | Desce 6 px e aparece; o véu entra em 120 ms |
| Gaveta | 200 ms ao abrir, 160 ms ao fechar | idem | Sobe 16 px; o conteúdo acima reflui sem salto |
| Card movido (teclado ou soltar) | 150 ms | idem | Técnica FLIP |
| "Mais n" e seções da barra | 120 ms | `ease-out` | Altura e opacidade; o chevron gira 90° |
| Toast | 180 ms ao entrar, 140 ms ao sair | idem | 8 px para cima |
| Salvando → Salvo | 120 ms | linear | Troca de texto com fade cruzado |

Com `prefers-reduced-motion`: sem translação nem escala, só fades de até 80 ms.

## 8. O que faz isto ser Tinyfold, e não uma cópia do Linear

1. **Acento anil derivado do azul aprovado** (h 259 → 268), e não o azul-violeta do Linear. Tem quatro papéis só: ação primária, foco, item atual e progresso.
2. **O anel de coluna:** o estado da tarefa se desenha pela posição da coluna. Ele vem do modelo próprio de colunas configuráveis e aparece igual no quadro, no documento, na gaveta e na origem.
3. **Motivo do quadrado arredondado:** marcas de projeto, quadradinhos de etiqueta, checkbox e `kbd` compartilham a mesma forma. Não usamos pontos redondos.
4. **Claro e escuro com o mesmo peso,** do mesmo gerador. O escuro tem elevação por luminosidade; o claro, papel branco com sombra mínima.
5. **O documento é o herói:** texto de leitura em 15/24 numa coluna de 680 px, incorporados como cards calmos e o marcador de origem discreto. O gênero costuma ser centrado em listas.
6. **Disciplina de contraste:** até o terciário passa de 4,5:1 em todos os fundos, coisa que a leitura comum do estilo não cumpre.
7. **A voz de Inter com `cv05` e `ss03`:** l com cauda e pontuação arredondada, mais macias que o Inter padrão.
