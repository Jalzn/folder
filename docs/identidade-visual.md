# Tinyfold — Identidade visual

**Direção aprovada (2026-10-31):** Sumário. Limpa, moderna e tipográfica, no gênero de ferramentas como o Linear, com tema claro e escuro gerados pelo mesmo sistema. Implementada na [etapa 08](etapas/08-fundacao.md): tokens, temas, fontes, componentes base, lateral, seletor, ⌘K, Visão geral, Índice, Lixeira e Perfil. A [etapa 09](etapas/09-pastas.md) levou a lateral à grade de 256 px do protótipo, com texto em x=52, e trocou Documentos e Desenhos pela árvore Itens, com as pastas. A [etapa 10](etapas/10-quadro-tarefa.md) implementou o quadro e a gaveta da tarefa nas medidas da visual.md e do protótipo: colunas com cabeçalho de 28 px, cards com raio 8 e título 13/18, a gaveta com cabeçalho de 52 px e a descrição em 14/22. As páginas de documento e desenho receberam só um restyle por tokens; o desenho completo delas chega com a etapa 11.

[Protótipo Sumário](https://claude.ai/artifact/1DfmsQAVUE7Tek6pYCkcvW). A especificação completa está em [interface/visual.md](interface/visual.md); a organização das telas, em [interface](interface/README.md).

## Cores

As cores são geradas em OKLCH a partir de três entradas: base cinza fria (matiz 262), acento anil (matiz 268) e contraste 60. No escuro, as superfícies sobem em degraus de luminosidade; no claro, são brancas e se separam por fios e sombras mínimas. Todo texto tem pelo menos 4,5:1 sobre todos os fundos, e elementos que não são texto têm pelo menos 3:1.

| Uso | Escuro | Claro |
| --- | --- | --- |
| Lateral | `#0E1116` | `#F2F4F9` |
| Fundo de trabalho | `#13161C` | `#FDFDFE` |
| Cards e campos (nível 1) | `#191D22` | `#FFFFFF` |
| Gaveta, menus e popovers (nível 2) | `#1F2228` | `#FFFFFF` |
| Fio | `#2B2E34` | `#E1E3E6` |
| Texto principal | `#ECF0F8` | `#18191C` |
| Texto secundário | `#BEC3CA` | `#47494C` |
| Texto terciário | `#9A9FA6` | `#636568` |
| Destaque | `#86A5FB` | `#3856C8` |
| Botão primário | `#4B6BD4` | `#3856C8` |
| Atraso | `#F98078` | `#C22826` |
| Conclusão | `#6AD18A` | `#21763C` |

A tabela completa, com estados, faixas, etiquetas e marcas de projeto, está em [interface/visual.md](interface/visual.md); os tons próprios da lateral estão em [interface/sidebar.md](interface/sidebar.md).

## Tipografia e forma

- **Tipografia:** Inter variável em tudo, com o corte display nos títulos. JetBrains Mono no código e no token.
- **Escala principal:** títulos de página 30/36 em peso 600; interface 13/20; corpo do documento 15/24 e descrição da tarefa 14/22; datas, contagens e etiquetas 12/16 com algarismos tabulares.
- **Pesos:** 450 no escuro e 400 no claro, ênfase 500, sem 700.
- **Forma:**
  - Grade de 4 px.
  - Linhas de 28 px na lateral, 30 px nos menus e 36 px nas listas.
  - Raios de 4 a 12 px conforme o elemento.
  - Sem degradês.
- **Ícones e movimento:** ícones Lucide com traço de 1,5 px; movimento de 100 a 200 ms, reduzido a esmaecimentos quando o sistema pede menos movimento.
- **Fontes:** servidas pela própria origem, com o arquivo completo da Inter (`inter-ui`) para ter `cv05`, `ss03`, `case` e algarismos tabulares, e JetBrains Mono da Fontsource.

## Histórico

Em 2026-10-29 foi aprovada a direção escura em grafite, cinzas frios e azul discreto: [referência Documento primeiro](https://claude.ai/artifact/4XiM1V8GwWfJTEB6MWKyi6). Ela foi a interface implementada até a etapa 07. A direção Sumário a substituiu na etapa 08:

| Uso | Antes | Sumário (escuro) |
| --- | --- | --- |
| Fundo de trabalho | `#202329` | `#13161C` |
| Destaque | `#7FA6E8` | `#86A5FB`; `#3856C8` no claro |
| Conclusão | `#8CC79A` | `#6AD18A` |

As alternativas exploradas antes da aprovação estão em [interface](interface/README.md).

Próximas explorações de design devem ser feitas pelo Claude, usando `claude-infinity-0` e o sistema nativo de artefatos, com o link retornado por ele.
