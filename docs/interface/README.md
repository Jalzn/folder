# Tinyfold — Interface

**Estado:** direção aprovada em 2026-10-31. A [etapa 08](../etapas/08-fundacao.md) implementou o sistema visual, a lateral variante A sem pastas, o seletor, o ⌘K, a Visão geral, o Índice, a Lixeira e o Perfil; as diferenças aceitas em relação ao protótipo estão na [validação](../validacao.md#validação-no-chrome-real-contra-o-protótipo), e as capturas, em `docs/screens/`. Ainda faltam as pastas (etapa 09), o quadro e a gaveta da tarefa (etapa 10) e as páginas novas de documento e desenho (etapa 11). A versão de celular não foi desenhada; o aplicativo tem um fallback funcional.

Protótipo navegável aprovado: [Sumário](https://claude.ai/artifact/1DfmsQAVUE7Tek6pYCkcvW), versão "Pastas". Ele roda com dados de exemplo em memória; o editor de texto e o de desenho são simulações.

Cópia local em `prototipo/sumario.html`, que abre direto no navegador e carrega as fontes do Google Fonts. `prototipo/tokens.py` é o gerador das cores em OKLCH, com os valores exatos de [visual.md](visual.md). A pasta `prototipo/` fica fora do lint do Biome por ser material de referência gerado.

## Especificações

As especificações foram escritas em rodadas sucessivas. Quando duas se contradizem, vale a mais recente, que aparece primeiro na tabela.

| Arquivo | Conteúdo |
| --- | --- |
| [pastas.md](pastas.md) | Pastas mistas de documentos e desenhos, com um nível, na lateral e no restante do aplicativo |
| [sidebar.md](sidebar.md) | Lateral do projeto. Aprovada a variante A, Coluna de ícones; as variantes B e C foram descartadas |
| [visual.md](visual.md) | Sistema visual: cores geradas em OKLCH, tokens claro e escuro, Inter, espaço, ícones, componentes e movimento |
| [refino.md](refino.md) | Refino da lateral, do quadro, da gaveta da tarefa e do documento sem coluna de margem. A tipografia Libre Franklin foi substituída pela Inter de `visual.md` |
| [conceito.md](conceito.md) | Estrutura e fluxo: só projeto, lateral do projeto, Visão geral, quadro, gaveta da tarefa, Lixeira e Perfil. A serifa e a coluna de margem foram substituídas por `refino.md` e `visual.md` |
| [brief.md](brief.md) | Telas obrigatórias, estados e dados de exemplo usados em todos os protótipos |

As capturas e os scripts de verificação citados nas especificações ficaram na sessão de exploração e não foram versionados.

## Histórico da exploração

| Data | Protótipo | Resultado |
| --- | --- | --- |
| 2026-10-30 | [Bancada](https://claude.ai/artifact/55osmyBM25Rg6PmzSEzmef) | Trilho de projetos, teclado primeiro, escuro com âmbar. Foi a mais próxima da ideia entre as três primeiras |
| 2026-10-30 | [Sanfona](https://claude.ai/artifact/5nnKBB862P2GKxxAgg2jxZ) | Projeto como folha dobrada em painéis, papel claro. Descartada |
| 2026-10-30 | [Lente](https://claude.ai/artifact/Eqpui9YPHcGdecmnehgEM9) | Níveis de zoom e cor por projeto. Descartada |
| 2026-10-30 | [Margem](https://claude.ai/artifact/LrmqskTZWRQYEp3hLeALum) | Visual limpo inspirado no Notion, a partir da Bancada. Aprovada a direção, mas parecida demais com o Notion |
| 2026-10-30 a 31 | [Sumário](https://claude.ai/artifact/1DfmsQAVUE7Tek6pYCkcvW) | Só projeto, lateral do projeto, visual inspirado no Linear e pastas. Aprovado |

Cada protótipo foi verificado no Google Chrome sem interface, em 1440×900 e 1280×800, nos dois temas quando havia. Essas verificações valem para os protótipos, não para o aplicativo.
