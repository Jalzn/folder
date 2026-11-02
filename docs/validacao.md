# Tinyfold — Validação local

Validação local a partir de 29 de outubro de 2026. A primeira versão foi implementada com três subagentes — backend, workspace e interface — e duas rodadas de revisão cruzada; cada etapa seguinte tem sua seção, a mais recente primeiro. Nenhuma publicação na nuvem foi realizada.

## Etapa 11: documento e desenho

A etapa foi implementada entre 2026-11-01 e 2026-11-02 por dois subagentes, backend (B1 a B4) e web (W1 a W7), primeiro em worktrees próprias e, a partir dos pontos de integração, em `feat/documento`. Três revisores adversariais examinaram, cada um, dados e MCP; o editor (teclado, acessibilidade e foco); e segurança e qualidade. Os achados passaram por cinco rodadas de correção, todas retestadas pelo próprio revisor. Os bancos usados são temporários, criados na pasta temporária do sistema; `data/tinyfold.sqlite` não foi aberto, e as portas 3370 e 5170 não foram usadas.

| Verificação | Resultado, em `959a8cc` |
| --- | --- |
| `mise exec -- pnpm check` | Biome; tipos de todos os pacotes, dos E2E e dos scripts; dependency-cruiser sem violações em 866 módulos; 648 testes unitários em 105 arquivos, com tokens, contraste e paridade com `tokens.py` |
| `mise exec -- pnpm test:db` | 264 testes em 37 arquivos, com SQLite temporário |
| `mise exec -- pnpm build` | Bundle de produção aprovado |
| `E2E_PORT=5191 mise exec -- pnpm e2e` | 200 aprovados e 116 pulados, em 158 testes por perfil (desktop e Pixel 7). No celular, pulam os testes que precisam do desktop: o teclado do editor e dos incorporados, o hover, o arrastar, a faixa e as larguras. No desktop, pulam os que são só do celular |

Os testes de unidade e de banco cobrem, além do que já existia:

- **Domínio:**
  - **Blocos:** só com a opção `embeds`, com `props` estritas e IDs em minúsculas, sem conteúdo nem filhos, e o 201º recusado. O texto, o lead e o trecho ficam sem eles.
  - **Trecho e números:** `excerptEnd` com formatação, espaços colapsados e trecho repetido; `figureNumbers`.
  - **Markdown:** o serializador com o resolvedor, o escape do texto do link e `[Item indisponível]` (`embed-resolver.test.ts`); `isCanvasId`.
- **Banco:**
  - **Estados** (`embeds.db.test.ts`): os três estados de tarefas e desenhos; item na lixeira, excluído de vez, com outro projeto ou outra pasta, e projeto arquivado; prévia atual, defasada e ausente; cena vazia; 201 IDs; IDs repetidos; nenhum registro de pedido.
  - **Escritas:** salvar e criar documentos com incorporados, e a descrição que os recusa.
  - **Rota da prévia** (`files.db.test.ts`): 401 sem sessão, também com um bearer do MCP; 404 para desenho na lixeira, excluído, inexistente ou sem prévia; 400 para ID inválido; 200 com `image/png`, `ETag`, `nosniff` e `private, no-cache`; 304; e a rota antes do fallback da SPA.
  - **MCP:** os links e `[Item indisponível]` no `read_document`; o cursor recusado quando uma tarefa incorporada muda entre as páginas; o teto de 45.000 caracteres com 200 incorporados de títulos pesados, metade na lixeira, lidos até a última página.
  - **Backup e exemplo:** um backup com incorporados, e o exemplo guardado pelo seed (`seed-sample.db.test.ts`).
- **Web:**
  - **Incorporados:** a limpeza dos inválidos e dos filhos (`sanitize-embeds`, `embed-paste`); os lugares das setas (`embed-places`); o texto copiado (`embed-text`); o que cada estado mostra (`embed-view`); o lugar do Desfazer (`embed-removal`).
  - **Markdown e marcador:** a exportação e a importação de volta (`document-markdown`); os lugares do marcador, com o editor real (`origin-places`).
  - **Exemplo:** passa pelo BlockNote real nos dois esquemas (`sample-documents`).
  - **Menus e atalhos:** o grupo do menu `/` (`insert-menu`), "editado hoje" (`edited-phrase`), os rótulos dos atalhos (`Kbd`) e o ⌘⌥T no editor, no campo e no Excalidraw (`keyboard`).
  - **ProseMirror:** a cópia única e o `domObserver.flush` (`prosemirror-copy` e `prosemirror-internals`).

### Fluxos no Chrome

Os E2E rodam no Google Chrome instalado, no desktop (1440×1000) e na emulação do Pixel 7, digitando com teclas reais, inclusive o `/tarefa`, o filtro do seletor e os títulos. Os da etapa:

1. **Inserir** (`embeds.spec.ts`):
   - `/tarefa` e `/desenho`, com um item existente ou novo, e o seletor com o projeto do documento primeiro;
   - ↵ no seletor com o texto digitado, um título existente e um título repetido em dois projetos;
   - o ⌘K "Incorporar tarefa…".

   Os resultados são conferidos no servidor.
2. **Card, figura e indisponíveis:**
   - o card segue a gaveta (coluna, etiquetas, checklist e "aberta abaixo") e diz o outro projeto;
   - as figuras se renumeram ao reordenar;
   - Restaurar, e Remover com Desfazer;
   - o documento de um projeto arquivado sem ações;
   - ⌘C de um card e a colagem na descrição;
   - um incorporado colado com ID recusado.
3. **Teclado** (`embed-keys.spec.ts`):
   - **Setas:** atravessam sequências de cards e figuras, no começo, no meio e no fim, sem pausa e com 200 ms entre as teclas, e um documento misto nos dois sentidos.
   - **Edição:** Tab sob um card; ⌫ e Delete; ⌫ logo depois de ⌘←; digitar e compor um acento num card selecionado.
   - **Restaurar:** com o foco e as setas depois dele.
   - **⇧, ⌘ e Page:** ⇧↑ e ⇧↓ seguidos, que crescem e encolhem a faixa um bloco por vez, ⌘↓ e ⌘↑ de cada card de uma sequência e Page Down, a partir de um incorporado, ao ritmo de uma pessoa.
   - **Letras ao lado:** letras digitadas no começo do texto depois de um card e no fim do texto antes dele saem uma a uma com ⌫ e Delete, e só a borda seleciona o card.
   - **Teclas que passam:** ⌘↓, ⌘↑ e uma seleção posta no DOM.
4. **Figura** (`drawing-embed.spec.ts`): a imagem pela rota, com 200 e depois 304; a prévia ausente gerada pelo documento; o filtro do escuro; o clique do meio em outra aba; e o arrastar, que não solta texto no documento.
5. **Marcador** (`origin-marker.spec.ts`): o marcador depois do trecho, com o nome e a gaveta. Ele vai ao fim do bloco quando o trecho muda e sai com a tarefa na lixeira. Também:
   - "Incorporar no documento" põe o card abaixo, e só com o documento aberto;
   - o marcador fica fora do Tab, e o hover redesenha sem quebrar.
6. **Página do documento** (`document-page.spec.ts`): a barra e o ⋯, o ⌘⌥T, o popover "Tarefas · n" com as setas, ↵ e Esc, a faixa fixa, `/tarefas/<id>` e o `.md` exportado e importado de volta.
7. **Página do desenho** (`drawing-page.spec.ts`): "Exportar ▾" com PNG e `.excalidraw`, e o ⋯ que começa com Importar.
8. **Exemplo** (`seed-sample.spec.ts`): abrir cada documento e desenho do exemplo não envia `saveDocument` nem `saveCanvas`, e todos continuam na versão 1.
9. **MCP e celular:** o Claude Code lê os incorporados como links e segue um até `read_task`. No Pixel 7, os incorporados ocupam a largura, um toque no card abre a gaveta, Restaurar aparece e a figura abre o desenho.

### Validação no Chrome real contra o protótipo

```sh
TF_TMP="$(mktemp -d -t tinyfold-11)"
export OWNER_PASSWORD='validacao-documento-11' PORT=3521 WEB_PORT=5321 \
  APP_ORIGIN=http://localhost:5321 COOKIE_SECURE=false BACKUP_DIR="$TF_TMP/backups"
# 1. Atualização: um banco criado pelo código da etapa 10, numa worktree na pasta de rascunho
git worktree add "$SCRATCH/tf-10" 7624a8f
(cd "$SCRATCH/tf-10" && mise exec -- pnpm install --frozen-lockfile \
  && DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm seed:sample)
DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm dev   # sem migração; conferido e parado
# 2. Exemplo da etapa 11
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm seed:sample
DATABASE_PATH="$TF_TMP/grande.sqlite" mise exec -- pnpm seed:sample --grande
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm dev
```

**Ensaio de atualização.** O log confirmou `Banco: <TF_TMP>/antigo.sqlite` e `Tinyfold em http://127.0.0.1:3521`. A subida não aplicou migração: continuaram as 11 da etapa 10, com as mesmas datas. Os sete documentos e os quatro desenhos foram abertos um a um no Google Chrome, com os pedidos contados:

- **Documentos:** nenhum enviou `saveDocument`, e todos continuaram na versão 1 e no `format_version` 1.
- **Desenhos:** cada um se salvou uma vez (`saveCanvas` e a prévia) e passou à versão 2. É o comportamento esperado das cenas do exemplo antigo, gravadas sem a normalização do Excalidraw. Os do exemplo novo não se salvam.
- **Tarefas:** nenhuma mudou de versão. `integrity_check` respondeu `ok`, e `foreign_key_check` não listou nada.
- **MCP:** pelo `/mcp`, com um token criado no Perfil, `read_document` leu a "Visão do produto" antiga e `read_drawing` leu "Fluxo do autosave".
- **Incorporar num documento antigo:** em "Notas de arquitetura", o `/tarefa` incorporou "Gerar token pessoal no Perfil", e o `/desenho`, "Fluxo do autosave", com teclas reais. O documento salvou duas vezes (versão 3), com os dois blocos, e o `read_document` passou a trazer `[Desenho: Fluxo do autosave](tinyfold:drawing/…)` e `[Tarefa: Gerar token pessoal no Perfil (Em andamento)](tinyfold:task/…)`.

**Exemplo da etapa 11.** Os dois bancos foram abertos sem nenhum salvamento:

- **Exemplo normal:** depois da comparação com o protótipo, nenhum documento, desenho ou tarefa mudou de versão. A figura da "Visão do produto" gravou a prévia do desenho incorporado na primeira abertura, com o desenho na versão 1.
- **Banco `--grande`:** foram abertos 25 documentos, a "Visão do produto" entre eles, e 8 desenhos. Nenhum `saveDocument` nem `saveCanvas` foi enviado, e nenhuma versão mudou; só as prévias que faltavam foram gravadas.
- **MCP:** `read_document` da "Visão do produto" trouxe `[Desenho: Navegação com projeto no centro](tinyfold:drawing/…)`, `[Tarefa: Gerar token pessoal no Perfil (Em andamento)](tinyfold:task/…)` e `[Item indisponível]`. `read_task` e `read_drawing` aceitaram os IDs desses links.

**Lado a lado.** O protótipo foi servido como UTF-8 de `127.0.0.1:5299`, e o aplicativo usou o exemplo da etapa 11. As duas telas foram abertas no Google Chrome instalado, pelo Playwright (`channel: 'chrome'`), nos dois temas, em 1440×900 e 1280×800: a "Visão do produto" com a figura, o card e o indisponível; o card aberto na gaveta; o marcador de "MCP somente leitura" com o ponteiro em cima; e a página "Navegação com projeto no centro" com "Exportar ▾" aberto. As medidas usaram `getBoundingClientRect` e `getComputedStyle` no mesmo Chrome.

As peças medidas são iguais nas duas telas, nos dois temas e nas duas larguras. No escuro, os pesos de interface sobem para 450 nas duas.

| Peça | Medidas |
| --- | --- |
| Coluna | 680 px com padding 28/160; título 600 30/36; fio com 20 px acima e 24 abaixo; corpo 15/24 |
| Card | 680 × 68 px, padding 10/12, raio 8, borda `--line` e fundo `--raised-1`; título 500 14/20; meta e coluna 12/16 `--text-3` |
| Card aberto | fundo `--selected`, borda `--accent-35` e "aberta abaixo" em 12/16, ao lado do título |
| Figura | moldura com padding 12, raio 8, borda `--line` e fundo `--bg`; legenda 12/16 `--text-3`; "Abrir ↗" em `--accent`, com opacidade 0 e 1 no hover |
| Indisponível | 680 × 44 px, padding 6 6 6 12, raio 8 e borda tracejada `--line-strong`; texto 13/20; botões de 24 px |
| Marcador | 18 × 18 px, raio 4, 4 px depois do trecho, fundo `--selected` no hover |
| Barras | 44 px com padding 0 12 0 32; salvamento 12/16 `--text-3`, com "Salvo · editado hoje"; "Exportar ▾" de 117 × 28 px, padding 0 10, raio 6 e 500 13/20 |

**Larguras e teclado:**

- **1024 px:** a coluna e os incorporados têm 680 px, e a página não rola de lado.
- **Pixel 7:** a coluna e os incorporados têm 380 px, Restaurar e Remover ficam visíveis com 24 px e a página não rola de lado.
- **Teclado:** foi percorrido à mão, pelo Playwright, no Google Chrome do Mac, com 250 ms entre as teclas:
  - em "Ideias soltas", `/tarefa` abre o seletor com o foco no campo; "backup" filtra; ↓ e ↵ incorporam "Configurar backup externo", que fica selecionado;
  - digitar escreve num parágrafo novo depois do card;
  - ↑ e ↓ passam pelo card um bloco por vez, e Page Down o mantém selecionado;
  - ⇧↓ seleciona do card ao fim do parágrafo seguinte;
  - ⌘⌥T, num trecho de um parágrafo da "Visão do produto" e num item de lista de "Ideias soltas", abre a gaveta da tarefa nova com "Incorporar no documento" marcado.
- **Não validado à mão no Chrome:**
  - o resto da tabela de teclado e a ordem do Esc, cobertos pelos E2E e pelos roteiros do revisor do editor;
  - a seleção com o VoiceOver;
  - o ditado e o painel de emoji num incorporado selecionado;
  - um aparelho físico com toque;
  - uma aba aberta com o código da etapa 10 durante a atualização, que fica como risco aceito, com a nota em [operação](implantacao.md#atualizar-para-a-etapa-11).

**Diferenças aceitas em relação ao protótipo:**

- **"Tarefas · n"** fica na barra do documento ([decisão do usuário 2](etapas/11-documento-desenho.md#decisões-do-usuário)); o protótipo não tem o botão.
- **Restaurar e Remover** do indisponível são só texto, com 73 px; no protótipo, têm os ícones de restaurar e de fechar, com 93 px.
- **A dica do marcador** é o `title` do navegador, "Originou: … · Em andamento", porque o marcador é um widget do ProseMirror fora do React; o protótipo desenha a dica dele. O sublinhado do trecho é o mesmo.
- **A figura** mostra a prévia PNG guardada, clara e filtrada no escuro, com a altura do desenho; o protótipo desenha um SVG. Os desenhos de exemplo também diferem: três caixas em linha no aplicativo e uma árvore no protótipo.
- **"Exportar ▾"** aberto pelo ponteiro não marca o primeiro item; o protótipo marca "PNG". Pelo teclado, o primeiro item é marcado nas duas.
- **A barra de ferramentas do Excalidraw** é a dele, com todas as ferramentas; o protótipo simula uma barra curta.
- **Dados de exemplo:** as etiquetas do card vêm em ordem alfabética ([etapa 10](etapas/10-quadro-tarefa.md), decisão 16), o prazo conta do dia do seed, e "MCP somente leitura" e o último parágrafo da "Visão do produto" têm o texto do brief.

| Tela | 1440, claro | 1440, escuro | 1280, claro | 1280, escuro | Pixel 7 |
| --- | --- | --- | --- | --- | --- |
| Documento com incorporados | [Captura](screens/documento-claro-1440.png) | [Captura](screens/documento-escuro-1440.png) | [Captura](screens/documento-claro-1280.png) | [Captura](screens/documento-escuro-1280.png) | [Captura](screens/documento-celular.png) |
| Marcador de origem | [Captura](screens/documento-marcador-claro-1440.png) | [Captura](screens/documento-marcador-escuro-1440.png) | [Captura](screens/documento-marcador-claro-1280.png) | [Captura](screens/documento-marcador-escuro-1280.png) | — |
| Menu `/` com "Incorporar" | [Captura](screens/documento-menu-claro-1440.png) | [Captura](screens/documento-menu-escuro-1440.png) | [Captura](screens/documento-menu-claro-1280.png) | [Captura](screens/documento-menu-escuro-1280.png) | — |
| Seletor | [Captura](screens/documento-seletor-claro-1440.png) | [Captura](screens/documento-seletor-escuro-1440.png) | [Captura](screens/documento-seletor-claro-1280.png) | [Captura](screens/documento-seletor-escuro-1280.png) | — |
| Desenho com "Exportar ▾" | [Captura](screens/desenho-claro-1440.png) | [Captura](screens/desenho-escuro-1440.png) | [Captura](screens/desenho-claro-1280.png) | [Captura](screens/desenho-escuro-1280.png) | [Captura](screens/desenho-celular.png) |

As capturas são as de W6, feitas do exemplo da etapa 11. Na validação, elas foram refeitas de um exemplo novo e comparadas pixel a pixel com as versionadas. Só o prazo do card mudou ("06 nov" para "07 nov"), porque conta do dia em que o seed roda, então as versionadas ficaram. Ao fim, o `dev` e o servidor do protótipo foram parados, a worktree `tf-10` foi removida e `$TF_TMP` foi apagado.

### Rodadas adversariais

Corrigidos e retestados:

- **Dados e MCP:** a revisão cedo de B1 e B2 achou o ID em maiúsculas, que o validador aceitava e o SQLite resolvia como excluído (`de033bb`).
- **Editor: teclado, acessibilidade e foco** (`11ff514`, `0a3fcf1`, `1bac96f`, `641ff87`, `f0d0fc2`, `fbfc7e7`, `a1bf79f`, `91d7288`, `59155c0`, `ad15aec`, `4a4ca44`, `7d2df70`, `5504b6b`, `79a48a3`, `c27fd4f`, `b22fc02`, `014814f`, `7066af2`, `43a3cf2`, `822441c`, `b271965`, `9569015`, `6bd99cf`). Os achados:
  - **Tab e documento quebrado:** Tab sob um card aninhava o parágrafo, e todo salvamento falhava.
  - **Setas:** com três incorporados seguidos, as setas voltavam ao topo ou pulavam os do meio. Depois da primeira correção, isso continuava com 80 ms ou mais entre as teclas, por causa da deriva da seleção do Chrome.
  - **⌫, Delete e Desfazer:** ⌫ e Delete removiam o incorporado com uma tecla, sem toast, também logo depois de um ⌘←. O Desfazer o devolvia ao topo ou fora do fim.
  - **Foco:** Restaurar deixava o foco na página. O marcador tomava o foco com Tab e quebrava a página.
  - **Arquivado e arrastar:** o documento de um projeto arquivado aceitava teclas. Arrastar a figura soltava a legenda no texto.
  - **Seletor:** perdia o texto digitado, criava uma segunda tarefa com o título de uma existente e marcava "Nova tarefa…" sozinho.
  - **Copiar e digitar:** um card copiado virava "Tarefa copiadaA fazer". Um acento num card selecionado ia para o parágrafo de cima.
  - **Nomes e rótulos:** os botões de vários indisponíveis tinham o mesmo nome, e o ⋯ mostrava "Ctrl⌥T" no Pixel 7.
  - **Celular e Tab:** um toque no card trazia o teclado da tela de volta, e o campo escondido do Markdown tomava uma parada de Tab.
  - **R1:** a proteção da seleção prendia ⌘↓, Home, End, ⇧↓ e as seleções de um leitor de tela.
  - **B-f:** ⇧↑, ⇧↓ e Page Down agiam a partir do primeiro texto.

  O terceiro reteste, em `20e7835` e com 150 a 600 ms entre as teclas, não achou regressão nem nada de severidade média ou maior. O quarto reteste, em `0db610f`, confirmou a correção B-f e achou B-i e B-j, corrigidos na quinta rodada com o ⌫ achado na validação (`983a5d7`, `d369832`, `959a8cc`). O quinto reteste, em `8200e19`, confirmou as três correções, sem regressão e sem achado novo.
- **Segurança e qualidade** (`7e6de9e`, `f4d5ff4`, `d3cebc3`, `e12ac46`, `d366e3c`, `1ab1572`, `e9b5f1d`, `06a5061`, `473024a`, `7bdbebd`, `20e7835`). Os achados:
  - **Duplicações:** a exportação da web resolvia os incorporados com uma cópia do resolvedor do servidor, e o menu `/` repetia o tipo dos incorporados.
  - **Regras:** a rota da prévia conferia o ID pela regra dos incorporados.
  - **Exemplo:** o teste do seed carregava código da web por URL.
  - **ProseMirror:** nada garantia uma cópia só, nem o `domObserver.flush` privado.
  - **Colagem forjada:** um `blocknote/html` com um ID inválido derrubava todo salvamento e deixava todos os cards em "Carregando…". Depois da correção, a colagem ainda perdia o que o incorporado forjado continha.
  - **Importações:** `ErrorNotice` levava o cliente HTTP ao barril da UI.

### Aceitos

Os itens aceitos estão na lista "Aceitos" de [Desvios do plano](etapas/11-documento-desenho.md#desvios-do-plano), com as diferenças em relação ao protótipo listadas acima:

- a proteção da seleção e a assinatura da deriva que ela recusa;
- Home, End e ⌃E a partir do primeiro texto;
- o `collapse()` no primeiro texto recusado;
- ⌘→, ⌥→ e ⌘← que selecionam o incorporado vizinho;
- o primeiro Esc do seletor, que limpa o campo;
- o texto sem keydown;
- os incorporados forjados que saem da colagem;
- o `domObserver.flush()` privado;
- o aviso do ProseMirror depois de ⇧↑ e ⇧↓;
- os rótulos Ctrl+… e Shift+…;
- os IDs só em minúsculas;
- o texto genérico de `VALIDATION` pelo `/rpc`;
- a prévia gravada na primeira abertura do exemplo;
- a aba antiga com `format_version` 1.

### Pendências

- Os desenhos do exemplo, que se salvavam na primeira abertura, pendência das etapas 09 e 10: fechada pelo seed normalizado e por `e2e/seed-sample.spec.ts`.
- O backup antes da atualização do banco real, que ainda está na etapa 07 ([operação](implantacao.md#atualizar-para-a-etapa-11)).
- A versão de celular da interface ainda não foi desenhada, e as pendências de hospedagem da etapa 07 continuam.

## Etapa 10: quadro e tarefa

A etapa foi implementada em 2026-11-01 por dois subagentes: backend (B1 a B6) e web (W1 a W7), em worktrees próprias até os pontos de integração e depois em `feat/quadro`. Três revisores adversariais examinaram, cada um, dados e migração, o quadro e a gaveta (teclado, acessibilidade e arrastar) e segurança e qualidade; os achados passaram por rodadas de correção, cada uma com reteste pelo próprio revisor. Os bancos usados são temporários, criados na pasta temporária do sistema; `data/tinyfold.sqlite` não foi aberto, e as portas 3370 e 5170 não foram usadas.

| Verificação | Resultado, em `248786e` |
| --- | --- |
| `mise exec -- pnpm check` | Biome, tipos de todos os pacotes, E2E e scripts, dependency-cruiser sem violações em 795 módulos, 572 testes unitários em 89 arquivos, com tokens, contraste e paridade com `tokens.py` |
| `mise exec -- pnpm test:db` | 247 testes em 34 arquivos, com SQLite temporário |
| `mise exec -- pnpm build` | Bundle de produção aprovado |
| `E2E_PORT=5171 mise exec -- pnpm e2e` | 149 aprovados e 67 pulados, em 108 testes por perfil (desktop e Pixel 7). Pulados: o que precisa do desktop (teclado, hover e arrastar do quadro e da árvore, faixa e larguras) no celular, e o que é só do celular no desktop |

Os testes de unidade e de banco cobrem, além do que já existia:

- **Executor e migração 007:** toda migração com as chaves desligadas, religadas também em falha; o `foreign_key_check` antes do `COMMIT`, que recusa só as violações novas e registra as antigas; a 007 sobre os dumps da etapa 09 (`seed:sample` e `--grande` de `1da6617`), sem perder tarefas, origens, posições, versões nem datas; e os gatilhos com SQL direto (`INSERT OR REPLACE`, `DELETE` da coluna de conclusão, `is_done` trocado por `UPDATE`, conclusão fora da coluna).
- **Colunas e etiquetas:** criar, renomear, mover, excluir com destino e restaurar, e trocar a conclusão com as datas de volta, com cada caso de pulo; nomes únicos pela chave; os limites (20 colunas, 100 etiquetas, 20 por tarefa), inclusive `restoreLabel` numa tarefa que chegou a 20.
- **Tarefas:** campos e texto gravados sem se sobrescrever, chaves desconhecidas recusadas, o `updateTask` sem mudança que não sobe a versão, `moveTask` sem revisão para o Desfazer, a revisão que só sobe com a ordem, e a descrição com o validador do documento e o checklist derivado.
- **Datas:** o fuso pelo nome canônico, os deslocamentos recusados, o fuso inválido lido como UTC, a janela de 14 dias e o atraso no fuso do dono, e o cursor `c~` de Concluídas.
- **MCP:** `list_tasks` com colunas e etiquetas pelos nomes, `read_task` em páginas, a busca na descrição e o teto de 45.000 caracteres com 20 colunas, 100 etiquetas e uma descrição de 200.000 caracteres.
- **Web:** as teclas do quadro (`board-keys`), o alvo de soltar (`board-drop`), a montagem das colunas, os textos e anúncios do quadro, a ordem das tarefas, a altura da gaveta, o rascunho do texto, as datas da tarefa, os nomes e textos das etiquetas, os grupos de Concluídas e a sessão do texto (`session-pool`: uma por tarefa, que sai quando salva e, solta sem salvar, tenta de novo quando a rede volta e avisa antes de sair).
- **`seed:sample` e backup:** cada descrição do exemplo sai do BlockNote real como o seed a grava, então abrir uma tarefa não a salva; um backup leva colunas, etiquetas, ligações, descrições, o fuso e os gatilhos.

### Fluxos no Chrome

Os E2E rodam no Google Chrome instalado, desktop (1440×1000) e emulação Pixel 7. As specs que usavam o diálogo da tarefa passaram à gaveta, digitando com teclas reais. Os da etapa:

1. **Colunas:** nova coluna nomeada no lugar, movida e com o nome repetido recusado; excluir com destino e ⌘Z; trocar a conclusão e voltar com Desfazer; a de conclusão não se exclui. Os resultados com Desfazer são conferidos no servidor (`listColumns`, `projectBoard` e `getTask`).
2. **Teclado do quadro:** setas entre cards e nomes de coluna, uma parada de Tab, ⇧ e setas com os anúncios (inclusive em rajada), M, ⇧F10, ↵ e ⌘↵ com Desfazer; todo caminho para a coluna de conclusão com Desfazer, e um movimento mais novo que o tira.
3. **Arrastar:** entre cards, para outra coluna e para o fim dela; soltar fora do quadro não move nada.
4. **Filtro e arquivamento:** o filtro fica com as tarefas que têm todas as etiquetas escolhidas; num projeto arquivado, o quadro só lê.
5. **Gaveta:** prazo pelo calendário e etiquetas pelo seletor, só com teclas; o texto salvo que aparece no card, com a descrição em 14/22; o rascunho digitado sem rede que sobrevive à recarga; ⌘↵ num bloco de código, que fica com o editor; Esc na descrição, que volta à gaveta, com ⌥↑ depois; o projeto trocado com a gaveta e o foco no lugar; ⌘↵ no seletor e no calendário, que não conclui; e uma tarefa deixada sem rede, que se salva sozinha quando a rede volta, com a gaveta em outra tarefa.
6. **Concluídas:** os grupos por mês e Reabrir com Desfazer.
7. **Etiquetas:** criar, renomear, recolorir e excluir uma etiqueta em uso, com ⌘Z.
8. **Fuso:** o Perfil com o fuso do dono e o do aparelho oferecido; uma tarefa que vence hoje não está atrasada.
9. **Celular:** o quadro rola de lado, o ⋯ move o card e a gaveta cobre a página.
10. **MCP:** `list_tasks` pelo nome da coluna e `read_task` em Markdown, do que a interface criou.
11. **⌘Z fora de um campo:** depois do Esc na descrição da gaveta e num documento, a tecla de desfazer do sistema não muda o texto, não salva e deixa a versão gravada igual, conferida por RPC (`getTask` e `getDocument`).

### Validação no Chrome real contra o protótipo

```sh
TF_TMP="$(mktemp -d -t tinyfold-10)"
export OWNER_PASSWORD='validacao-quadro-10' PORT=3501 WEB_PORT=5301 \
  APP_ORIGIN=http://localhost:5301 COOKIE_SECURE=false BACKUP_DIR="$TF_TMP/backups"
# 1. Atualização: um banco criado pelo código da etapa 09, numa worktree na pasta de rascunho
git worktree add "$SCRATCH/tf-09" 1da6617
(cd "$SCRATCH/tf-09" && mise exec -- pnpm install --frozen-lockfile \
  && DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm seed:sample)
DATABASE_PATH="$TF_TMP/antigo.sqlite" mise exec -- pnpm dev   # aplica a 007; conferido e parado
# 2. Exemplo da etapa 10
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm seed:sample
DATABASE_PATH="$TF_TMP/grande.sqlite" mise exec -- pnpm seed:sample --grande
DATABASE_PATH="$TF_TMP/grande.sqlite" mise exec -- pnpm dev
```

**Ensaio de atualização.** O log confirmou `Banco: <TF_TMP>/antigo.sqlite` e `Tinyfold em http://127.0.0.1:3501`, e a subida aplicou a 007 e a 003 do auth sobre o banco da etapa 09:

- as tarefas foram para A fazer, Em andamento e Concluído pelo estado que tinham, com as mesmas posições e versões, e a concluída recebeu `completed_at`;
- `integrity_check` respondeu `ok`, e `foreign_key_check` não listou nada;
- o quadro mostra a ordem de antes: em A fazer, "Expor documentos em Markdown pelo MCP", "Renderizar desenho incorporado no documento" e "Configurar backup externo"; em Em andamento, "Gerar token pessoal no Perfil" e "Colunas configuráveis no quadro"; em Concluído, "Corrigir foco ao fechar diálogo";
- a busca "dialogo" acha "Corrigir foco ao fechar diálogo", em Concluído;
- `list_tasks` com `columns: ['a fazer']`, pelo `/mcp` com um token criado no Perfil, responde com `columns` e a coluna de cada tarefa.

No banco da etapa 09, a única concluída foi editada no dia do seed, então a conclusão dela (a última edição) cai na janela de 14 dias. O caminho das concluídas antigas foi visto no `--grande`: o rodapé "Mais 60 concluídas antes de 19 out →" e as páginas de Concluídas. O caminho real do usuário, da etapa 07 direto para a 10 (005, 006 e 007 numa subida), foi ensaiado pelo revisor de dados, com bancos criados pelo código da etapa 07, sem achado.

**Lado a lado.** O protótipo foi servido como UTF-8 de `127.0.0.1:5299`, e o aplicativo usou o banco `--grande`. As duas telas foram abertas no Google Chrome instalado, pelo Playwright (`channel: 'chrome'`), nos dois temas, em 1440×900 e 1280×800: Quadro, gaveta, Concluídas e Visão geral. As medidas usaram `getBoundingClientRect` e `getComputedStyle` no mesmo Chrome.

- **Quadro,** igual nas duas: colunas de 271 px em 1440 e 231 px em 1280, com raio 10; cabeçalho de 28 px com o nome em 500 13/20; card de 66 px de altura, padding 10 × 12 e raio 8; título 500 13/18; meta 12/16; chip de 20 px, padding 0 6 0 5 e raio 4. Os pesos sobem para 450 no escuro nas duas.
- **Gaveta:** cabeçalho de 52 px com padding 0 16 0 32, título 600 20/28, linhas de propriedade com valor 13/20, Coluna, Prazo ("sex 06 nov 2026 · em 5 dias"), Etiquetas, Projeto e a barra do checklist "2 de 5". A descrição estava em 15/24, a do documento: corrigida para 14/22 em `2b01510`, com a medida no E2E.
- **Concluídas e Visão geral:** os grupos por mês, as linhas com coluna, prazo, etiquetas e checklist, as atrasadas em `--late` e "Concluídas · 14 dias".
- **Larguras:** em 1024 px, a lateral passa à faixa de 52 px, a gaveta tem 972 px com as propriedades em faixa, e a página não rola de lado. No Pixel 7, as colunas encaixam ao rolar (`scroll-snap-type: x`), a página não rola de lado e a gaveta cobre a página, com 412 × 795 px abaixo da barra de 44 px.
- **Não validado à mão no Chrome:** a tabela de teclado e a ordem do Esc, cobertas pelos E2E e pelos roteiros do revisor do quadro; e o Esc no meio de um arrasto real, que o Playwright não produz (como na etapa 09, o E2E confere só que soltar fora do quadro não move nada).

**Diferenças aceitas em relação ao protótipo:**

- **Propriedades da gaveta:** viram a faixa acima da descrição abaixo de 1.200 px de largura da gaveta, pelo plano e pela crítica 17 do refino; o protótipo passa à faixa abaixo de 935 px. Com a lateral aberta, a gaveta tem 1.184 px em 1440 e 1.024 px em 1280, então o aplicativo mostra a faixa e o protótipo, as duas colunas.
- **Altura da gaveta:** abre a 55% da área, como pede o plano; o protótipo abre a 45%, com as mesmas alturas de ⌥↑ e ⌥↓ (35%, 55% e 80%).
- **Origem:** uma seção com o trecho e o link do documento; o protótipo a põe numa linha de propriedade, com o link ↗ e o trecho embaixo.
- **"← Quadro"** fica no começo da barra da página, e o celular não o mostra; no protótipo, fica à direita.
- **Etiquetas** em ordem alfabética (decisão 16): "backend, mcp", onde o protótipo mostra "mcp, backend".
- **Concluídas:** o cabeçalho do mês diz "Outubro 2026 · 11"; o protótipo põe a contagem sem o separador.
- **Descrição no escuro** em peso 450, como o resto do texto de interface; o protótipo a deixa em 400.
- **Rodapé da coluna de conclusão:** o protótipo não tem concluídas antigas nos dados, e o rodapé foi conferido só contra o plano.

| Tela | 1440, claro | 1440, escuro | 1280, claro | 1280, escuro | Pixel 7 |
| --- | --- | --- | --- | --- | --- |
| Quadro | [Captura](screens/quadro-claro-1440.png) | [Captura](screens/quadro-escuro-1440.png) | [Captura](screens/quadro-claro-1280.png) | [Captura](screens/quadro-escuro-1280.png) | [Captura](screens/quadro-celular.png) |
| Arrastar um card | [Captura](screens/quadro-arrastar-claro-1440.png) | [Captura](screens/quadro-arrastar-escuro-1440.png) | [Captura](screens/quadro-arrastar-claro-1280.png) | [Captura](screens/quadro-arrastar-escuro-1280.png) | — |
| Menu da coluna | [Captura](screens/quadro-coluna-menu-claro-1440.png) | [Captura](screens/quadro-coluna-menu-escuro-1440.png) | [Captura](screens/quadro-coluna-menu-claro-1280.png) | [Captura](screens/quadro-coluna-menu-escuro-1280.png) | — |
| Excluir coluna | [Captura](screens/quadro-excluir-coluna-claro-1440.png) | [Captura](screens/quadro-excluir-coluna-escuro-1440.png) | [Captura](screens/quadro-excluir-coluna-claro-1280.png) | [Captura](screens/quadro-excluir-coluna-escuro-1280.png) | — |
| Gaveta da tarefa | [Captura](screens/gaveta-claro-1440.png) | [Captura](screens/gaveta-escuro-1440.png) | [Captura](screens/gaveta-claro-1280.png) | [Captura](screens/gaveta-escuro-1280.png) | [Captura](screens/gaveta-celular.png) |
| Calendário | [Captura](screens/calendario-claro-1440.png) | [Captura](screens/calendario-escuro-1440.png) | [Captura](screens/calendario-claro-1280.png) | [Captura](screens/calendario-escuro-1280.png) | — |
| Seletor de etiquetas | [Captura](screens/etiquetas-seletor-claro-1440.png) | [Captura](screens/etiquetas-seletor-escuro-1440.png) | [Captura](screens/etiquetas-seletor-claro-1280.png) | [Captura](screens/etiquetas-seletor-escuro-1280.png) | — |
| Etiquetas | [Captura](screens/etiquetas-claro-1440.png) | [Captura](screens/etiquetas-escuro-1440.png) | [Captura](screens/etiquetas-claro-1280.png) | [Captura](screens/etiquetas-escuro-1280.png) | — |
| Concluídas | [Captura](screens/concluidas-claro-1440.png) | [Captura](screens/concluidas-escuro-1440.png) | [Captura](screens/concluidas-claro-1280.png) | [Captura](screens/concluidas-escuro-1280.png) | [Captura](screens/concluidas-celular.png) |
| Visão geral com as atrasadas | [Captura](screens/visao-geral-claro-1440.png) | [Captura](screens/visao-geral-escuro-1440.png) | [Captura](screens/visao-geral-claro-1280.png) | [Captura](screens/visao-geral-escuro-1280.png) | [Captura](screens/visao-geral-celular.png) |
| Seletor com as atrasadas | [Captura](screens/seletor-claro-1440.png) | [Captura](screens/seletor-escuro-1440.png) | [Captura](screens/seletor-claro-1280.png) | [Captura](screens/seletor-escuro-1280.png) | [Captura](screens/seletor-celular.png) |

As capturas foram refeitas do banco `--grande` depois das correções. Ao fim, o `dev` e o servidor do protótipo foram parados, a worktree `tf-09` foi removida e `$TF_TMP` foi apagado.

### Rodadas adversariais

Corrigidos e retestados:

- **Dados e migração** (`4a62675`, `000a413`, `b69d5ce`, `0a348ad`, `1692d8f`, `d0e1e4d`, `c9df9d6`, `8298299`, `a34fea2`, `97ecf1c`): uma violação antiga de chave estrangeira impedia a atualização, e passou a aviso; uma diretiva `foreign_keys off` mal posta fazia a reconstrução apagar em cascata as origens das tarefas, e o executor passou a aplicar toda migração com as chaves desligadas; `is_done` mudado por SQL, um `DELETE` ou um `INSERT OR REPLACE` deixavam o quadro sem coluna de conclusão; `restoreLabel` passava de 20 etiquetas; as listas de Desfazer aceitavam uma conclusão no futuro e gravavam datas noutra forma ISO; um fuso gravado inválido derrubava as leituras com hoje. O segundo reteste ensaiou o caminho real, da etapa 07 numa subida só, sem achado.
- **Quadro e gaveta** (`e8842ee`, `9dec8ec`, `930f58b`, `4649840`, `3fe695d`, `8d29582`, `23d33c2`): o Esc na descrição mandava o foco à página; trocar o projeto pela gaveta deixava o foco no `body`; uma rajada de ⇧↓ perdia o anúncio do movimento; "+ Coluna" era uma segunda parada de Tab; um movimento não tirava o Desfazer do toast "Concluída"; arrastar ou "Mover para" a coluna de conclusão concluía sem toast; o celular não encaixava as colunas; e o ⌘↵ no seletor de etiquetas e no calendário concluía a tarefa. O reteste não achou regressão depois da divisão do quadro.
- **Segurança e qualidade** (`e26030a`, `1c4303a`, `9778894`, `b69ab79`, `893a7cd`, `a75660e`, `a8d1d0f`, `edf68fd`): o fuso gravado como veio, com deslocamentos fixos e caches sem limite; `BoardColumns.tsx` com 294 linhas e dois efeitos sem dependências; ajudantes repetidos e uma criação de etiqueta fora da fila de escritas; a sessão do texto viva a aba inteira e o limite de 1 MiB repetido; duas pastas `editor`; e cenários de E2E longos, sem conferência no servidor. No reteste, as chaves retiradas aceitas em silêncio nas escritas de tarefa e a sessão solta sem os ouvintes de rede e de saída.

### Aceitos

Os itens aceitos estão na lista "Aceitos" de [Desvios do plano](etapas/10-quadro-tarefa.md#desvios-do-plano): os de dados (as migrações com as chaves desligadas, as listas de Desfazer como palavra do cliente, mais de 1.000 tarefas sem Desfazer, o pedido anterior a B6 com `status`), os do quadro e da gaveta e o fallback de celular, além das diferenças em relação ao protótipo listadas acima.

### Pendências

- A dica do Quadro na lateral e o calendário em tela cheia no celular, que esperam o design do celular.
- Os desenhos do exemplo, salvos uma vez na primeira abertura: fechada na [etapa 11](#etapa-11-documento-e-desenho).
- O backup antes de subir a 007 no banco real, que está na etapa 07 ([operação](implantacao.md#atualizar-para-a-etapa-10)).
- A versão de celular da interface ainda não foi desenhada; as pendências de hospedagem da etapa 07 continuam.

## Etapa 09: pastas

A etapa foi implementada entre 2026-10-31 e 2026-11-01 por dois subagentes: backend (B1 a B5) e web (W1 a W7). Três revisores adversariais examinaram, cada um, dados e migração, a árvore (acessibilidade, teclado e arrastar) e segurança e qualidade; os achados passaram por rodadas de correção, cada uma com reteste pelo próprio revisor. Os bancos usados são temporários, criados na pasta temporária do sistema; `data/tinyfold.sqlite` não foi aberto, e as portas 3370 e 5170 não foram usadas.

| Verificação | Resultado, em `461078f` |
| --- | --- |
| `mise exec -- pnpm check` | Biome, tipos de todos os pacotes, E2E e scripts, dependency-cruiser sem violações em 640 módulos, 481 testes unitários em 69 arquivos, com tokens, contraste e paridade com `tokens.py` |
| `mise exec -- pnpm test:db` | 181 testes em 27 arquivos, com SQLite temporário |
| `mise exec -- pnpm build` | Bundle de produção aprovado |
| `E2E_PORT=5171 mise exec -- pnpm e2e` | 127 aprovados e 47 pulados, em 87 testes por perfil (desktop e Pixel 7). Pulados: o que precisa do desktop (teclado, hover e arrastar da árvore, faixa e larguras) no celular, e o que é só do celular no desktop |

Os testes de unidade e de banco cobrem, além do que já existia:

- **Migração 006:** bases 005 montadas com dados reais, migradas sem mudar versões nem datas; os gatilhos com SQL direto (item numa pasta de outro projeto ou excluída, pasta que muda de projeto ou é excluída com itens vivos, item restaurado que limpa a pasta); `integrity_check` e `foreign_key_check`; e, por `EXPLAIN QUERY PLAN`, que os gatilhos do autosave buscam a pasta pela chave primária.
- **Pastas:** criar no topo, renomear, reordenar, excluir com e sem os itens e restaurar, com cada caso de pulo de `restoreFolder` (item que mudou de pasta, de versão ou de fixado, lista desatualizada, nome tomado), `keptPin`, o fixado por escopo com pedidos simultâneos, a idempotência das respostas guardadas, os limites (200 pastas, nome de 1 a 100 caracteres) e o projeto arquivado.
- **Nomes:** colisões de `name_key` (caixa, acentos latinos, gregos e o de tonicidade cirílico, NFKD, emoji e sequências inteiras) e o que `visibleText` tira ou guarda, nos nomes, títulos e saídas do MCP.
- **Navegação e leitura:** a árvore de `projectNavigation` (limites, fixados primeiro, totais), `listTrash` com a origem, a restauração com `folderGone`, `search` com `folderId` e `folder`, e o MCP com as pastas em `list_projects` e nos cabeçalhos, dentro de 45.000 caracteres com nomes pesados.
- **Web:** as linhas da árvore (`tree-rows`), o alvo de soltar (`dropSpotAt`, para item e para pasta), o encaminhamento de teclas (`tree-keys`), os nomes acessíveis, as preferências no formato novo, os grupos do Índice, o grupo Pastas do ⌘K, os textos dos toasts, o Desfazer do toast (`toast-undo`), o registro de mudanças, a fila de escritas e o reenvio de uma resposta perdida.
- **`seed:sample --grande` e backup:** a variante grande com 55 itens em quatro pastas, e um backup com pastas restaurado sem perda.

### Fluxos no Chrome

Os E2E rodam no Google Chrome instalado, desktop (1440×1000) e emulação Pixel 7. Os da etapa:

1. **Pastas:** criar, renomear e reordenar no lugar, pelo mouse e pelo teclado (⌘K, N e o "+" de Itens com ↵), com o erro de nome repetido; excluir levando os itens à raiz e excluir com os itens, com Desfazer e ⌘Z devolvendo a pasta, a posição e os fixados.
2. **Mover:** M, ↓ e ↵ na linha, no rótulo do cabeçalho e no popover da faixa; Desfazer e ⌘Z; pasta cheia que recebe o item sem fixado; o item aberto levado à raiz com a pasta aberta ou fechada; Desfazer de mover para outro projeto que volta à pasta, ou à raiz se ela sumiu.
3. **Árvore e teclado:** `treegrid` com setas, ↵, typeahead e Esc que não faz nada; N, P, M e G P na linha; F2, ⇧F10, ⌥↑ e ⌥↓; letras da busca que não vazam ("zp", "an"); Tab e ↓ do Quadro entrando pela linha do item aberto; o campo do nome com as setas, ⇧ e espaços.
4. **Arrastar:** item numa pasta (a linha inteira) e no cabeçalho Itens; pasta entre pastas; pasta no meio de outra recusada; pasta fechada que abre sob um item que ainda se mexe; Esc cancelando.
5. **Estado e escala:** pastas abertas por projeto, chegada a um item que abre a pasta, pasta fechada sobre o item aberto que continua fechada ao voltar a lateral, oito itens e "Ver todos" no Índice filtrado, o ponto de não salvo na pasta e na faixa.
6. **Páginas:** o rótulo da pasta, o menu Novo com a pasta, o Índice agrupado, filtrado e sem agrupar com a coluna Pasta, `?pasta=`, o ⌘K com o caminho e com a pasta que abre na lateral, a Visão geral e a Lixeira com a origem e a restauração para a raiz.
7. **Falhas e repetições:** cópia de um rascunho cuja pasta sumiu, Desfazer recusado pelo servidor, ⌘Z durante uma renomeação, resposta de exclusão perdida, Desfazer de uma mudança já superada, segundo movimento recusado durante outra escrita.
8. **Celular:** a árvore sobre a página, o toque que abre uma pasta, as ferramentas visíveis e o ⋯ que move um item.
9. **MCP:** a busca do Claude Code numa pasta do que a interface arquivou ali.
10. **⌘K digitado de uma vez:** com a busca de itens respondendo 800 ms depois, "Nova pasta" e a busca de um item rodam o resultado na tela; até a resposta, os itens do texto anterior ficam esmaecidos e o Enter não roda nenhum deles; sem resultados, o Enter não faz nada; ↓ e Enter rodam a linha destacada.

### Validação no Chrome real contra o protótipo

```sh
TF_TMP="$(mktemp -d -t tinyfold-09)"
export OWNER_PASSWORD='validacao-pastas-09' PORT=3491 WEB_PORT=5291 \
  APP_ORIGIN=http://localhost:5291 COOKIE_SECURE=false BACKUP_DIR="$TF_TMP/backups"
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm seed:sample
DATABASE_PATH="$TF_TMP/grande.sqlite" mise exec -- pnpm seed:sample --grande
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm dev   # depois grande.sqlite, para a escala
```

O log confirmou `Banco: <TF_TMP>/tinyfold.sqlite` (e depois `grande.sqlite`) e `Tinyfold em http://127.0.0.1:3491`. O protótipo foi servido como UTF-8 de `127.0.0.1:5299`, na versão "Pastas", com "Simular projeto grande" para a escala. As duas telas foram abertas lado a lado no Google Chrome instalado, pelo Playwright (`channel: 'chrome'`), nos dois temas, em 1440×900 e 1280×800, e as medições usaram `getBoundingClientRect` e `getComputedStyle` no mesmo Chrome. As capturas para a documentação foram refeitas de bancos novos (`seed:sample` e `--grande`).

- **Grade da lateral,** igual nas duas: 256 px; chevron de x=12 a 24; ícones da raiz de x=28 a 44 e texto em x=52; filhos com ícone de x=52 a 68 e texto em x=76; guia em x=36; contagens terminando em x=240; linhas de 28 px; "Itens" em x=28. Fundo `#F2F4F9` no claro e `#0E1116` no escuro, `--text-3` `#636568` e `#9A9FA6`, `--accent` `#3856C8` e `#86A5FB`, nos dois.
- **Estados da pasta:** fechada, aberta, hover com "+" e "⋯", fechada com o item aberto (fundo de hover, texto 500 e ", contém o item aberto"), ponto de não salvo antes da contagem, alvo de arrastar com o contorno do acento e renomeação com o erro de nome repetido.
- **Escala,** no banco grande: Produto 11, MCP 12, Arquitetura 18 e Operação 8; oito filhos e "Ver todos · n", que abre o Índice com "18 itens em Tinyfold · Arquitetura."; o item aberto além do oitavo como nona linha, antes de "Ver todos"; e "Ver todos na raiz" com mais de oito soltos.
- **Telas:** "Mover para pasta…", o rótulo no cabeçalho, o toast de excluir com Desfazer, o AlertDialog de "Excluir pasta e itens…" (igual, texto a texto), o Índice agrupado e filtrado, a Visão geral com "Documento · MCP", a Lixeira com "Tinyfold › Arquitetura", o ⌘K com a pasta e o caminho, o filtro da lateral com o grupo Pastas e a faixa com o popover Itens.
- **Teclado:** typeahead ("a" vai a Arquitetura, "o" a Operação), M abrindo "Mover para pasta…", Esc fechando só o popover e devolvendo o foco à linha, um segundo Esc sem efeito, Esc cancelando a renomeação, o filtro (um Esc limpa, outro sai), ⌘Z depois de excluir (Operação volta com 8) e depois de mover, e ⌘Z num campo sem desfazer o movimento. Nenhum Esc recolheu pasta nem navegou.
- **Arrastar,** medido nas duas: a linha de 2 px de x=76 a 240 entre filhos e de x=52 a 240 na raiz e entre pastas, na mesma altura; a pasta e o cabeçalho Itens como alvo, com o mesmo contorno.
- **Larguras:** em 1024 px, a faixa e, com ⌘K "Nova pasta", a lateral sobre a página com o campo do nome em foco e "Nova pasta" selecionado; ↵ cria a pasta com o nome digitado e Esc não cria nada. No Pixel 7, a lateral sobre a página, o toque que abre e fecha uma pasta e o ⋯ visível sem hover, com Renomear, Mover para cima e para baixo, Excluir pasta e Excluir pasta e itens.
- **Achados corrigidos em `e877664`:** uma pasta nova começada pelo teclado perdia o campo do nome e era criada como "Nova pasta"; o ✓ do lugar atual em "Mover para pasta…" estava cinza; o botão Itens da faixa não marcava o lugar atual, não dizia os itens não salvos no nome e tinha o ponto sem o anel.
- **Não validado:** o Esc no meio de um arrasto real. No Playwright, o Esc chega à página como tecla e o arrasto emulado acaba sem `dragleave` nem `dragend`: a pasta fica marcada como alvo e abre depois de 800 ms, e às vezes o soltar seguinte ainda move o item. Num arrasto do sistema, o Chrome toma o Esc e manda os dois eventos, que limpam o alvo e o tempo de abrir (`onDropExit` e `onDragEnd`); nenhuma ferramenta disponível produz esse arrasto. O E2E confere só que nada se move.
- **⌘K digitado logo ao abrir,** da etapa 08: quando a busca de itens respondia depois da digitação, o destaque ficava numa linha da lista anterior, já fora da tela, e o ↵ não fazia nada, ou abria essa linha enquanto ela ainda aparecia. Visto primeiro à velocidade de uma máquina; na revisão, também no ritmo de uma pessoa, em 2 de 7 tentativas. Corrigido em `461078f`: os itens de um texto anterior ficam esmaecidos e sem rodar até a resposta, o primeiro resultado do texto atual recebe o destaque quando as linhas mudam, e o ↵ só roda uma linha da lista na tela. O roteiro da revisão (⌘K na Lixeira e numa página de item, "indice" e "Nova pasta" digitados logo, ↵ depois de 1 a 1,5 s) rodou o comando certo em 28 de 28 tentativas.

**Diferenças aceitas em relação ao protótipo:**

- **Semântica da árvore:** o `Tree` do React Aria é `treegrid`, com linhas e `aria-level`; o protótipo usa `tree`.
- **Arrastar:** a pasta fechada abre em 800 ms, e não em 600 ms, pelo tempo fixo do React Aria. Uma pasta arrastada para o meio de outra é recusada, com o cursor de "não permitido"; o protótipo reordena por metades sobre qualquer linha de pasta.
- **Typeahead:** no meio de uma busca por digitação (até 1 s), N, P, M e G continuam a busca; no protótipo, sempre agem.
- **Fixados:** contados por escopo, até 8 na raiz e 8 em cada pasta, pela ordem em que foram fixados (`pinned_at`); o protótipo conta 8 por projeto.
- **"Ver todos na raiz · n"** conta os fixados e os soltos da raiz, o mesmo conjunto que o Índice filtrado mostra (14 no banco grande sem Operação); o protótipo conta só os soltos (13).
- **Filtro da lateral:** os grupos dizem "Pastas · 1" e "Itens · 1", como pede o plano, e a pasta não tem chevron; o protótipo põe a contagem à direita.
- **"Mover para pasta…":** o popover fica 6 px abaixo da linha e a 12 px da borda da janela (o `containerPadding` do React Aria), contra 4 px e 8 px no protótipo; o campo de filtro é 7 px mais alto. "Nova pasta…" usa o ícone de pasta com "+" do ⌘K, e "Outro projeto…" o ⇄ de pastas.md e de "Mover para projeto…". O ↓ depois de abrir destaca a primeira linha, que o protótipo já mostra destacada.
- **⌘K:** os grupos vêm na ordem Itens, Projetos, Pastas; o protótipo põe Pastas primeiro.
- **Índice:** os cabeçalhos dos grupos ficam cerca de 2 px fora do lugar do protótipo; a coluna Pasta, sem agrupar, não ordena; as linhas de grupo recebem o foco das setas e não fazem nada. A coluna Ligações chega na etapa 11.
- **Lixeira:** abaixo de 560 px, a coluna Origem some.
- **Toasts:** "“X” restaurado." não diz "em Tinyfold".
- **Entrada pela Tab:** a árvore só entra pela linha do item aberto até uma linha receber o foco; a heurística usa 300 ms para distinguir a Tab de um clique.
- **Celular:** o filtro de "Mover para pasta…" abre o teclado do telefone. O fallback de celular é funcional, não um design aprovado.

| Tela | 1440, claro | 1440, escuro | 1280, claro | 1280, escuro | Pixel 7 |
| --- | --- | --- | --- | --- | --- |
| Árvore Itens na Visão geral | [Captura](screens/visao-geral-claro-1440.png) | [Captura](screens/visao-geral-escuro-1440.png) | [Captura](screens/visao-geral-claro-1280.png) | [Captura](screens/visao-geral-escuro-1280.png) | [Captura](screens/lateral-celular.png) |
| Renomear no lugar | [Captura](screens/pastas-renomear-claro-1440.png) | [Captura](screens/pastas-renomear-escuro-1440.png) | [Captura](screens/pastas-renomear-claro-1280.png) | [Captura](screens/pastas-renomear-escuro-1280.png) | — |
| Mover para pasta | [Captura](screens/pastas-mover-claro-1440.png) | [Captura](screens/pastas-mover-escuro-1440.png) | [Captura](screens/pastas-mover-claro-1280.png) | [Captura](screens/pastas-mover-escuro-1280.png) | [Captura](screens/pastas-mover-celular.png) |
| Arrastar sobre uma pasta | [Captura](screens/pastas-arrastar-claro-1440.png) | [Captura](screens/pastas-arrastar-escuro-1440.png) | [Captura](screens/pastas-arrastar-claro-1280.png) | [Captura](screens/pastas-arrastar-escuro-1280.png) | — |
| Excluir, com Desfazer | [Captura](screens/pastas-excluir-claro-1440.png) | [Captura](screens/pastas-excluir-escuro-1440.png) | [Captura](screens/pastas-excluir-claro-1280.png) | [Captura](screens/pastas-excluir-escuro-1280.png) | — |
| Projeto grande | [Captura](screens/pastas-grande-claro-1440.png) | [Captura](screens/pastas-grande-escuro-1440.png) | [Captura](screens/pastas-grande-claro-1280.png) | [Captura](screens/pastas-grande-escuro-1280.png) | — |
| ⌘K com uma pasta | [Captura](screens/cmdk-pasta-claro-1440.png) | [Captura](screens/cmdk-pasta-escuro-1440.png) | [Captura](screens/cmdk-pasta-claro-1280.png) | [Captura](screens/cmdk-pasta-escuro-1280.png) | — |
| Faixa com o popover Itens | [Captura](screens/faixa-itens-claro-1440.png) | [Captura](screens/faixa-itens-escuro-1440.png) | [Captura](screens/faixa-itens-claro-1280.png) | [Captura](screens/faixa-itens-escuro-1280.png) | — |
| Índice agrupado | [Captura](screens/indice-claro-1440.png) | [Captura](screens/indice-escuro-1440.png) | [Captura](screens/indice-claro-1280.png) | [Captura](screens/indice-escuro-1280.png) | [Captura](screens/indice-celular.png) |
| Lixeira com a origem | [Captura](screens/lixeira-claro-1440.png) | [Captura](screens/lixeira-escuro-1440.png) | [Captura](screens/lixeira-claro-1280.png) | [Captura](screens/lixeira-escuro-1280.png) | [Captura](screens/lixeira-celular.png) |

Ao fim, o `dev` e o servidor do protótipo foram parados e `$TF_TMP` foi apagado.

### Rodadas adversariais

Corrigidos e retestados:

- **Dados e migração:** a restauração devolvia o fixado da lista também a um item desafixado depois da exclusão e trazia da lixeira um item excluído da pasta antes dela (`70f82a5`, com `keptPin`); a recusa da lista inteira por um fixado posterior à exclusão, que um relógio que volta pode causar, deu lugar a devolver o item sem ele (`5a9bd8c`); nomes só de caracteres invisíveis, parecidos com outro ou com caracteres de controle (`9a710e2`), e depois, em quatro retestes, o que cada escrita esconde: etiquetas, *joiners*, seletores de variação, os ignoráveis do Unicode, os pontos não atribuídos, NFC e as letras cirílicas, macedônias e búlgaras que a chave do nome não pode juntar (`a72cea1` a `e5dbf30`). O MCP passou a aplicar as mesmas regras ao que devolve (`155be55`). O `INSERT OR REPLACE` que contorna os gatilhos ficou planejado para a migração 007 (`dcdd560`).
- **Árvore, acessibilidade, teclado e arrastar** (`7a9574f`, `235c175`, `b1b5fca`, `940e393`, `2281100`, `996e7e5`, `80d2e27`): o item aberto listado duas vezes, que derrubava a página; as setas e o espaço do campo do nome indo para a linha e para o typeahead; a página de erro em inglês quando a própria lateral falhava; a pasta fechada que reabria ao voltar a lateral; letras da busca que viravam atalhos ("zp", "an"); → numa pasta aberta indo ao "+"; Tab e ↓ entrando pela última linha; o arrastar sem o alvo do plano (só 9 dos 28 px de uma pasta aceitavam o item) e a abertura em 800 ms que recomeçava; o filtro de "Mover para pasta…" sem setas depois de uma correção; e o Desfazer de mover para outro projeto que não voltava à pasta.
- **Segurança e qualidade** (`4c33720`, `ef571e8`, `d29215e`, `e4f0969`, `3205808`, `80d2e27`): escritas de pasta e movimentos sem o mesmo ID de pedido nas repetições; um ⌘Z perdido durante outra escrita; a cópia que falhava para sempre quando a pasta sumia; o texto do servidor num Desfazer recusado; um Desfazer que desfazia uma mudança mais nova do mesmo item; uma resposta perdida sem o Desfazer; e, na qualidade, a árvore num arquivo de 437 linhas, laços de foco repetidos, o contexto do shell que redesenhava tudo, buscas e rótulos duplicados e o registro de mudanças como singleton de módulo.

### Aceitos

Os casos de dados estão descritos em [Desvios do plano](etapas/09-pastas.md#desvios-do-plano):

- **Dados:** um `INSERT OR REPLACE` em `workspace_folders`, só por SQL manual, contorna os gatilhos até a migração 007; `restoreFolder` confia na lista `moved` (um `keptPin` forjado, um item da raiz listado por engano, uma lista antiga contra uma exclusão mais nova); um relógio do servidor que volta entre fixar e excluir; uma pasta com mais de 1.000 itens sai sem Desfazer; e os canais de texto invisível de um bit e as remoções em excesso registrados no plano.
- **Interface:** as diferenças em relação ao protótipo listadas acima, inclusive a árvore `treegrid`, o teclado do celular com o filtro de mover, a ordem dos grupos do ⌘K, os detalhes do Índice, a Origem abaixo de 560 px, o toast de restaurar sem o projeto, a heurística de 300 ms da Tab e a abertura em 800 ms.
- **O fallback de celular** é funcional, não um design aprovado.

### Pendências

- O gatilho `BEFORE INSERT` de `workspace_folders` (migração 007, [etapa 10](etapas/10-quadro-tarefa.md#migração-srcworkspaceinframigrations007_boardsql)), feito na etapa 10.
- Os desenhos do exemplo, salvos uma vez na primeira abertura porque o Excalidraw normaliza a cena do seed: fechada na [etapa 11](#etapa-11-documento-e-desenho).
- A versão de celular da interface ainda não foi desenhada; as pendências de hospedagem da etapa 07 continuam.

## Etapa 08: fundação e lateral

A etapa foi implementada em 2026-10-31 por dois subagentes: backend (B1 a B5) e web (W1 a W9). Três revisores adversariais examinaram, cada um, dados e migração, segurança e qualidade de código, e interação; os achados passaram por duas rodadas de correção, cada uma com reteste pelo próprio revisor. Os bancos usados são temporários, criados na pasta temporária do sistema; `data/tinyfold.sqlite` não foi aberto, e as portas 3370 e 5170 não foram usadas.

| Verificação | Resultado, em `fd8ac38` |
| --- | --- |
| `mise exec -- pnpm check` | Biome, tipos de todos os pacotes, E2E e scripts, dependency-cruiser sem violações em 551 módulos, 375 testes unitários em 53 arquivos, com tokens, contraste e paridade com `tokens.py` |
| `mise exec -- pnpm test:db` | 140 testes em 24 arquivos, com SQLite temporário |
| `mise exec -- pnpm build` | Bundle de produção aprovado |
| `mise exec -- pnpm e2e` | 77 aprovados e 3 pulados, em 40 testes por perfil (desktop e Pixel 7). Pulados: a faixa recolhida e a mudança de largura não existem no celular, e a barra única não existe no desktop |

Os testes de unidade e de banco cobrem, além do que já existia:

- **Migração 005:** bases montadas com 001 a 004, itens soltos e na lixeira levados ao Geral sem mudar versões, gatilhos que recusam projeto nulo e origens com o título guardado.
- **Projetos e fixados:** cor e ordem, arquivar o último ativo, o limite de 8 fixados com pedidos simultâneos, e o que desafixa.
- **Lixeira:** a de cada projeto, `restoreTask`, a exclusão definitiva dos três tipos, o esvaziamento com item restaurado no meio-tempo, o limite único de 1.000 e a busca de cada título e trecho únicos em todas as tabelas depois da exclusão definitiva.
- **Navegação:** as seções da lateral, a Visão geral, `moveItem` e `moveTask` renumerando só o próprio projeto.
- **Web:** endereços antigos e hostis (`%E0%A4%A`, `//host`, `https:host`, `\`), a última localização, o início, a busca e os comandos do ⌘K, as seções do ⌘K e da lateral, os atalhos e a guarda de IME, os textos da Lixeira (filtro, lista cortada e contagens "1.000"), o Trecho do Índice, ids de blocos importados, rascunhos locais, a impressão digital da prévia e o autosave ao mover.
- **`seed:sample`:** recusa banco com tabelas, caminho fora das pastas temporárias, link simbólico e o banco principal.

### Fluxos no Chrome

Os E2E rodam no Google Chrome instalado, desktop (1440×1000) e emulação Pixel 7:

1. **Navegação:** seletor, G Q, G L, G V, G P, ⌘K e endereços antigos; o Índice guarda a ordem no dispositivo; `/` volta ao último lugar.
2. **Mover enquanto digita:** o documento aberto vai a outro projeto com o texto não salvo, `moveItem` não leva o conteúdo, e o item **continua** no projeto novo depois do próximo autosave e de recarregar, inclusive depois de um Desfazer.
3. **Endereços quebrados e lugar guardado hostil:** página em português dentro do shell, sem sair da origem.
4. **Esc:** uma camada por vez, o Buscar sobre a página, a composição de IME, o diálogo de tarefa alterado ("Descartar alterações?"), a lista da faixa pelo teclado (inclusive o item já aberto) e o foco de volta depois de um diálogo aberto pelo N.
5. **Barra estreita:** um nome de projeto de 40 caracteres termina antes das ações no documento, na Lixeira, no Quadro e no Índice (Pixel 7); as ações guardam o foco ao cruzar 720 px (desktop).
6. **Lixeira:** grupos por dia, filtro, "Excluir o mostrado" com o resto ficando, restaurar com "Abrir", excluir de vez avisando da tarefa que nasceu do documento, e esvaziar.
7. **Tema:** segue o sistema até uma escolha, que vale desde a primeira pintura; um toast novo substitui o anterior.
8. **Estado vazio:** sem projeto ativo, `/projetos` mostra "Nenhum projeto ativo", "Novo projeto" e os arquivados; Desarquivar abre a Visão geral do projeto com o shell completo.
9. Os fluxos das etapas anteriores (documento, Markdown, equações, desenho, conflitos, rascunhos, MCP) dentro do shell novo.

### Validação no Chrome real contra o protótipo

```sh
TF_TMP="$(mktemp -d -t tinyfold-08)"
export OWNER_PASSWORD='validacao-sumario-08' PORT=3481 WEB_PORT=5281 \
  APP_ORIGIN=http://localhost:5281 COOKIE_SECURE=false BACKUP_DIR="$TF_TMP/backups"
DATABASE_PATH="$TF_TMP/vazio.sqlite" mise exec -- pnpm dev      # "Comece um projeto"; depois parar
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm seed:sample
DATABASE_PATH="$TF_TMP/tinyfold.sqlite" mise exec -- pnpm dev
```

O log confirmou `Banco: <TF_TMP>/…sqlite` e `Tinyfold em http://127.0.0.1:3481`. Como `seed:sample` recusa um banco que já tem tabelas, o estado vazio usou um banco e o exemplo, outro. O protótipo foi servido como UTF-8 de `127.0.0.1:5299` para abrir lado a lado no Google Chrome, pela extensão Claude in Chrome; as medições repetidas e as capturas usaram o mesmo Chrome pelo Playwright.

- **Estados vazios:** banco novo com "Comece um projeto" e "Novo projeto"; com os quatro projetos do exemplo arquivados, "Nenhum projeto ativo" com os arquivados e Desarquivar, e o seletor dizendo "Nenhum projeto ativo". Desarquivados na ordem antiga, voltaram ao seletor na mesma ordem.
- **Lateral, contra a variante A:** 248 px; ícones em x=16, texto em x=40, contagens com a borda direita em x=232; linhas de 28 px; cabeçalho e rodapé de 44 px; fio sob os fixados; faixa de 52 px.
- **Cores** (`getComputedStyle`), iguais a `tokens.py` e `sidebar.md`: no escuro, `--bg` `#13161C`, `--sidebar-bg` `#0E1116`, `--text-3` `#9A9FA6`, `--accent` `#86A5FB`; no claro, `#FDFDFE`, `#F2F4F9` (`barra-a-fundo`), `#636568` e `#3856C8`. `theme-color` acompanha o tema.
- **Tipografia:** Inter carregada da própria origem, `font-feature-settings` com `cv05`, `ss03` e `calt`, título 30/36 600 com −0,021 em, interface 13/20.
- **Telas:** seletor, ⌘K, menu Você, Visão geral, Índice, Lixeira, Perfil, documento e desenho no shell, toasts no canto inferior direito, nos dois temas, em 1440×900 e 1280×800.
- **Teclado:** G P, G 1, G 2, G V, G Q, G L, ⌘\, F6, `/`, ? e a sequência do Esc (⌘K sobre Atalhos: um Esc fecha o ⌘K, outro os Atalhos, o terceiro não faz nada). Nenhuma navegação por Esc.
- **Larguras:** em 1024 px, a faixa de 52 px e, com ⌘\, a lateral sobre a página, que o Esc fecha; no Pixel 7, uma barra de 44 px, sem rolagem horizontal, e a lateral sobre a página com 320 px.
- **Sem piscar:** tema Escuro escolhido com o sistema em Claro, cache desligado e rede limitada a 165 ms e 9 Mbit/s ("Fast 4G"). No build de produção, o primeiro quadro já tem o fundo escuro, na Visão geral e no documento. No `pnpm dev`, em que o Vite injeta o CSS por JavaScript, o primeiro quadro seguia o sistema; `fd8ac38` passou a definir `color-scheme` em `theme.js`, e o primeiro quadro ficou escuro também ali.
- **Observação da ferramenta:** o texto inserido pela extensão não gera eventos de tecla, então o ⌘K não destaca o primeiro resultado e o Enter não o abre. Com teclas reais (Playwright no mesmo Chrome), o primeiro resultado fica destacado e o Enter o abre.

**Diferenças aceitas em relação ao protótipo:**

- **Lateral:** o protótipo tem 256 px, texto em x=52 e o fundo `lateral` `#F5F7FA` no claro; a etapa segue a variante A de `sidebar.md` (248 px, x=40, `barra-a-fundo` `#F2F4F9`). A árvore de pastas e a seção "Itens" ficam para a etapa 09; aqui são Documentos e Desenhos.
- **Prazos e colunas:** "atrasada" no seletor e no Quadro, prazos e progresso no Agora, "Concluídas, últimos 14 dias" e a coluna Revisão chegam com a etapa 10. O Agora mostra as tarefas em andamento.
- **Quadro e gaveta:** o quadro ganhou só um restyle por tokens; a gaveta da tarefa é um diálogo até a etapa 10.
- **Documento e desenho:** sem cabeçalho de pasta, tarefas e desenhos incorporados (etapa 11).
- **⌘K:** os itens aparecem em "Itens" (o protótipo diz "Documentos"), o comando se chama "Visão geral" (lá, "Visão geral de Tinyfold"), e a busca mostra o trecho com as palavras encontradas.
- **Lixeira:** sem a coluna de origem (pasta), que chega com a etapa 09.
- **Celular:** o fallback é funcional, não um design aprovado.

| Tela | 1440, claro | 1440, escuro | 1280, claro | 1280, escuro | Pixel 7 |
| --- | --- | --- | --- | --- | --- |
| Visão geral | [Captura](screens/visao-geral-claro-1440.png) | [Captura](screens/visao-geral-escuro-1440.png) | [Captura](screens/visao-geral-claro-1280.png) | [Captura](screens/visao-geral-escuro-1280.png) | [Captura](screens/visao-geral-celular.png) |
| Documento | [Captura](screens/documento-claro-1440.png) | [Captura](screens/documento-escuro-1440.png) | [Captura](screens/documento-claro-1280.png) | [Captura](screens/documento-escuro-1280.png) | [Captura](screens/documento-celular.png) |
| Desenho | [Captura](screens/desenho-claro-1440.png) | [Captura](screens/desenho-escuro-1440.png) | [Captura](screens/desenho-claro-1280.png) | [Captura](screens/desenho-escuro-1280.png) | [Captura](screens/desenho-celular.png) |
| Quadro | [Captura](screens/quadro-claro-1440.png) | [Captura](screens/quadro-escuro-1440.png) | [Captura](screens/quadro-claro-1280.png) | [Captura](screens/quadro-escuro-1280.png) | [Captura](screens/quadro-celular.png) |
| Índice | [Captura](screens/indice-claro-1440.png) | [Captura](screens/indice-escuro-1440.png) | [Captura](screens/indice-claro-1280.png) | [Captura](screens/indice-escuro-1280.png) | [Captura](screens/indice-celular.png) |
| Lixeira | [Captura](screens/lixeira-claro-1440.png) | [Captura](screens/lixeira-escuro-1440.png) | [Captura](screens/lixeira-claro-1280.png) | [Captura](screens/lixeira-escuro-1280.png) | [Captura](screens/lixeira-celular.png) |
| Seletor | [Captura](screens/seletor-claro-1440.png) | [Captura](screens/seletor-escuro-1440.png) | [Captura](screens/seletor-claro-1280.png) | [Captura](screens/seletor-escuro-1280.png) | [Captura](screens/seletor-celular.png) |
| ⌘K | [Captura](screens/cmdk-claro-1440.png) | [Captura](screens/cmdk-escuro-1440.png) | [Captura](screens/cmdk-claro-1280.png) | [Captura](screens/cmdk-escuro-1280.png) | — |
| Perfil | [Captura](screens/perfil-claro-1440.png) | [Captura](screens/perfil-escuro-1440.png) | [Captura](screens/perfil-claro-1280.png) | [Captura](screens/perfil-escuro-1280.png) | [Captura](screens/perfil-celular.png) |
| Faixa recolhida e lateral no celular | [Captura](screens/faixa-recolhida-claro-1440.png) | [Captura](screens/faixa-recolhida-escuro-1440.png) | [Captura](screens/faixa-recolhida-claro-1280.png) | [Captura](screens/faixa-recolhida-escuro-1280.png) | [Captura](screens/lateral-celular.png) |

Desde a etapa 09, estas capturas mostram a lateral de 256 px com a árvore Itens; as da etapa 08, com Documentos e Desenhos, ficaram no histórico do Git.

Ao fim, o `dev` e o servidor do protótipo foram parados e `$TF_TMP` foi apagado.

### Rodadas adversariais

Nenhum achado crítico ou alto. Corrigidos e retestados:

- **Dados (médios):** um limite só de 1.000 para listar e esvaziar a lixeira, com a contagem sempre exata; o texto de itens excluídos de vez que ficava nas respostas guardadas do registro de pedidos; `moveTask` que renumerava tarefas de outros projetos, mudando versão e data; `seed:sample` que migrava o banco antes de recusar. No reteste, uma tarefa que mudava de projeto mantinha a posição antiga (corrigido em `1cf81f6`) e a prévia em geração durante um movimento era descartada (`05e98e5`, com a web enviando a impressão digital da cena).
- **Segurança e qualidade:** esvaziar com filtro excluía itens fora da tela (média); lixeira acima do limite; URL com codificação quebrada derrubando o shell; última localização que levava para fora da origem; `seed:sample` antes da recusa. Na qualidade, os editores de documento e desenho com módulos paralelos já divergindo, o ⌘K montando dados e marcação no mesmo corpo, a lista da faixa duplicada, tokens ignorados no CSS, tipos de item repetidos, restos de `projectId: null`, código morto e a semântica de `AlertDialog` e `Banner`. No reteste, os textos de uma lista cortada em 1.000 ("Excluir os 1.000 mostrados", "Lixeira vazia." só sem sobras), `RequestFor` e links com cara de botão repetidos, as contagens extras para o toast e os diálogos dos editores ainda duplicados.
- **Interação:** a lista da faixa sem teclado (alta, a única); um Esc fechando duas camadas; atalhos durante a composição de IME; o menu "Mover para projeto…" sem setas; a região viva presa; o popover da faixa aberto depois da escolha; o foco depois de mover uma linha; a fila de toasts; controles só no hover em telas de toque; toasts sobre os controles do Excalidraw; a mesma tarefa pelo ⌘K; o Esc que descartava a tarefa digitada; Esc segurado; G com outra tecla; Shift+N; rádio e typeahead do Índice; páginas de erro em inglês; o tema na aba de login; duas barras abaixo de 720 px; toasts e leitor de tela; e o overscroll. No reteste, 19 de 23 corrigidos e 4 parciais, mais um achado novo (média): um nome de projeto longo passava por baixo das ações da barra estreita. Todos foram corrigidos em `b5bcc1e`, inclusive o foco depois de um Desfazer que remove a linha, de um ⋯ aberto ao cruzar 720 px e de um diálogo aberto pelo N, e o toast acima do "Voltar para o conteúdo" do Excalidraw no celular.

### Aceitos

- **Registros de pedido anteriores a `816f323`:** guardam o texto inteiro de `createDocument` e o título e o trecho das escritas de tarefa por até 30 dias. Excluir de vez um desses itens nesse período deixa o texto no banco até os registros expirarem ([operação](implantacao.md#atualizar-para-a-etapa-08)).
- **Mover um item fechado:** a web ainda baixa o item uma vez para ler a versão, o título e o fixado. O pedido de mover não leva conteúdo.
- **Órfãos criados com chaves estrangeiras desligadas** (plausível, exige adulterar o banco): a migração 005 aborta, ou o item fica invisível.
- **Um projeto já chamado "Geral"** ganha um segundo "Geral" na migração, quando há itens soltos.
- **Um pedido gravado com `projectId: null` e repetido depois de B5** recebe `VALIDATION`; o rascunho fica, e a aba recarregada mostra o conflito com a versão salva.
- **O fallback de celular** é funcional, não um design aprovado.
- **O typeahead da tabela do Índice** deixou de existir para que N, G e ? funcionem; ↑ e ↓ continuam.

### Pendências

- Restyle do quadro e a gaveta da tarefa (etapa 10), pastas (etapa 09), documento e desenho novos (etapa 11).
- A versão de celular da interface ainda não foi desenhada.
- As pendências de hospedagem da etapa 07 continuam.

## Etapa 07: MCP somente leitura

A etapa foi implementada em 2026-10-31 por dois subagentes em sequência: backend (B1 a B5) e web (W1 a W4). Seguiram-se duas rodadas adversariais cruzadas, de segurança e persistência, de protocolo e saída das ferramentas, e de qualidade de código. Cada falha confirmada recebeu correção, teste e nova verificação. Os bancos usados são temporários; `data/tinyfold.sqlite` não foi aberto.

| Verificação | Resultado |
| --- | --- |
| `mise exec -- pnpm check` | Biome, tipos de todos os pacotes, E2E e scripts, dependency-cruiser sem violações em 246 módulos e 240 testes unitários em 27 arquivos |
| `mise exec -- pnpm test:db` | 88 testes em 16 arquivos, com SQLite temporário |
| `mise exec -- pnpm build` | Bundle de produção aprovado |
| `mise exec -- pnpm e2e` | 50 testes aprovados: 25 desktop e 25 emulação Pixel 7, incluindo os 6 novos de `e2e/mcp.spec.ts` |

Os testes de unidade e de banco cobrem:

- **Tokens:**
  - formato e nome;
  - token em texto puro ausente dos bytes do arquivo principal e do WAL;
  - último uso no máximo uma vez por minuto;
  - limite de 10;
  - revogação pela redefinição de senha na mesma transação, com reversão comprovada.
- **Leitura:**
  - busca por palavras com acentos e pontuação;
  - lixeira e projetos arquivados;
  - cursores por chave estáveis com empates e edições, e o cursor do quadro recusado depois de um movimento;
  - orçamentos de saída;
  - páginas de documento com código e fórmulas cortados.
- **Markdown:**
  - o serializador do servidor lido de volta pelo parser real do BlockNote 0.56, com as perdas do parser declaradas com o resultado exato;
  - crescimento linear em 80.000 trechos.
- **Prévias:**
  - PNG completo com descompressão exata;
  - versão antiga, futura e na lixeira;
  - impressão digital da cena depois de renomear e restaurar;
  - migrações 003 e 004.
- **Servidor** (`app.fetch` com o cliente oficial e chamadas brutas na revisão 2025-06-18):
  - origem, cookie sem bearer, corpo acima de 64 KiB declarado ou em fluxo, JSON inválido e lotes, inclusive com duas marcas BOM;
  - limites por IP e por token;
  - `GET` 405 e `/.well-known` 404;
  - bearer ignorado em `/rpc`;
  - ausência do token nas respostas e no log.
- **Backup:** `scripts/mcp-backup.db.test.ts` restaura tokens e prévias em outro arquivo.

### Fluxos no Chrome

`e2e/mcp.spec.ts` roda nos dois perfis, com o cliente MCP oficial no processo do teste, sem `Origin`:

1. **Perfil:**
   - o token é mostrado uma vez e recebe o foco;
   - o comando traz a origem do teste e `/mcp` e quebra linhas sem rolagem horizontal;
   - a cópia usa a área de transferência no desktop e, no celular, seleciona o texto quando a escrita é recusada;
   - um clique fora mantém o diálogo, e Esc o fecha e devolve o foco a "Gerar token";
   - depois de recarregar, a lista mostra nome, prefixo, criação e "Nunca usado", e o segredo não está na página nem no armazenamento do navegador;
   - revogar devolve 401 ao token.
2. **Conteúdo:**
   - um documento com checklist e código, uma tarefa a partir de um trecho e um desenho com retângulo, texto e seta ligada ao texto são criados pela interface;
   - `search` acha os três;
   - `read_document` traz a tarefa, `- [ ]` e a cerca de código;
   - `read_drawing` traz a prévia da versão atual, com PNG de lado e tamanho dentro dos limites, e a estrutura com a ligação da seta;
   - `read_task` traz a origem;
   - na lixeira, o documento some da busca e da leitura;
   - o Perfil mostra o último uso, e revogar faz a chamada seguinte falhar com 401.
3. **Prévia ao reabrir:**
   - um desenho alterado por `/rpc` com o editor fechado ganha prévia atual ao ser reaberto por links internos;
   - renomeá-lo não envia outra prévia.

A suíte existente passa com o login compartilhado em `e2e/support/session.ts` e esperas pelo caminho exato de cada procedimento.

| Tela | Desktop | Celular |
| --- | --- | --- |
| Perfil, token gerado | [Captura](screens/perfil-token-desktop.png) | [Captura](screens/perfil-token-mobile.png) |

As capturas mostram um token de um banco de teste temporário, já descartado.

### Validação real com o Claude Code

Executada em 2026-10-31 sobre o commit `2b4fbb0` (fim das entregas, antes das rodadas adversariais), com o servidor de desenvolvimento num banco temporário e as portas 3471 e 5271. O log confirmou `Banco: …/tinyfold-mcp.RW13anlI27/tinyfold.sqlite` e `Tinyfold em http://127.0.0.1:3471`. Banco, token e configuração temporária foram removidos ao fim.

1. **Google Chrome**, pela extensão Claude in Chrome:
   - login;
   - um projeto, um documento com checklist, código, fórmula em linha e "R$ 0", e uma tarefa a partir de um trecho, movida para Em andamento;
   - um desenho com duas caixas rotuladas, uma seta e texto. Um salvamento gerou um único `saveCanvasPreview` (200), com `previewVersion` igual à versão;
   - um desenho denso criado por `/rpc`, com 192 elementos, ganhou prévia ao ser aberto;
   - no Perfil: estado vazio, token "Validação" mostrado uma vez e copiado. A área de transferência continha exatamente o comando mostrado. Depois, o prefixo, "Criado em", "Nunca usado" e "Último uso agora";
   - revogação com confirmação e o foco de volta a "Gerar token".
2. **Claude Code 2.1.310**, modelo `claude-opus-5-5`, em sessão não interativa:
   - **Registro:** o servidor foi registrado com o endereço e o cabeçalho do comando copiado, num `--mcp-config` temporário com `--strict-mcp-config`, sem alterar a configuração do usuário.
   - **Protocolo:** a revisão negociada foi 2026-07-28, com as seis ferramentas listadas.
   - **Respostas:** listou projetos e buscou. O Markdown chegou íntegro, com `R\$ 0` lido como R$ 0, checklist, fórmula e código.
   - **Imagem pequena:** chegou como imagem: 408×219 px, cerca de 15 KiB. O modelo descreveu as caixas e notou, pela estrutura, que a ponta da seta não estava ligada.
   - **Imagem grande:** o desenho denso caiu na escada até 768×439 px, com cerca de 235 KiB (320.564 caracteres base64). O modelo respondeu pela imagem (cor e número de linhas), sem aviso de saída grande no fluxo nem no log de depuração.
   - **Tarefas:** `list_tasks` e `read_task` trouxeram a tarefa em andamento e o trecho de origem.
   - **Revogação:** depois de revogar, o servidor aparece como `failed`, com a mensagem em português "Token inválido ou revogado…", e o Claude Code informa que o fallback OAuth fica desligado quando há `Authorization`. Uma chamada direta recebeu 401 com `error="invalid_token"`.
   - **Vazamento:** nenhuma ocorrência do token no log do servidor, nas transcrições nem nos logs de depuração.

#### Repetição sobre `709da1d`, depois das rodadas adversariais

Repetida em 2026-10-31, nas mesmas condições: banco temporário, portas 3471 e 5271, `--mcp-config` temporário com `--strict-mcp-config` e a configuração do usuário intacta. O log confirmou `Banco: …/tinyfold-mcp.EJNfAkd7ek/tinyfold.sqlite`.

1. **Google Chrome:**
   - Conteúdo criado pelo `/rpc` da própria página: um projeto, o documento "MCP somente leitura" com uma seção longa (mais de 60.000 caracteres em Markdown), duas tarefas originadas dele e uma tarefa solta.
   - Um desenho com duas caixas ligadas por uma seta e um texto: abri-lo no editor enviou uma prévia (`previewCurrent: true`). Renomeá-lo salvou a versão 2 sem novo envio de prévia, e a prévia continuou atual.
   - No Perfil:
     - o campo do nome não mostrou mais o ícone do 1Password;
     - o token "Validação HEAD" foi mostrado uma vez, e a área de transferência continha exatamente o comando;
     - a lista mostrou prefixo, criação e "Nunca usado", depois "Último uso agora";
     - nem a página nem o armazenamento do navegador continham o segredo;
     - a revogação mostrou "Token revogado." e devolveu o foco a "Gerar token".
2. **Claude Code 2.1.310**, modelo `claude-opus-5-5`, revisão negociada 2026-07-28, seis ferramentas:
   - `list_projects`.
   - `search` com "MCP ideia", palavras fora da ordem do texto ("a ideia do MCP"), achou o documento.
   - `read_drawing` trouxe a imagem da versão atual depois da renomeação (cerca de 15 KiB). O modelo respondeu que a seta liga Editor a Servidor.
   - `list_tasks` com `documentId` trouxe só as duas tarefas originadas do documento.
   - `read_document`, ainda com páginas de 60.000 caracteres, paginou em duas páginas. **O Claude Code não manteve a primeira página na conversa:** com 58,9 KB, ela foi gravada num arquivo local ("Output too large"), e o modelo recebeu só uma prévia de 2.332 caracteres. Sem permissão para ler esse arquivo na sessão não interativa, ele não chegou ao cursor da página seguinte. Numa segunda sessão com a ferramenta Read permitida, leu o arquivo, seguiu o cursor `1:59569` e recebeu a página 2 (10.307 caracteres) inline, até a última linha do documento.
   - Depois da revogação, o servidor apareceu como `failed`, com "Token inválido ou revogado…", e uma chamada direta recebeu 401 com `error="invalid_token"`.
   - Nenhuma ocorrência do token no log do servidor, nas transcrições nem nos logs de depuração. Banco, token e configuração temporária foram removidos.

#### Limite de saída do Claude Code 2.1.310

Medido em 2026-10-31 sobre `cc1d051`, nas mesmas condições isoladas, com documentos e listas de tamanhos escolhidos, uma chamada por vez e só as ferramentas MCP permitidas. Também foi lido o código do próprio Claude Code, embutido no executável instalado.

| Resultado | Caracteres de texto | No Claude Code |
| --- | --- | --- |
| `read_document` em português acentuado | 11.932 a 48.932 | Na conversa |
| `read_document` em ASCII | 48.935 | Na conversa |
| `read_document` com letras e dígitos aleatórios | 29.935 e 48.935 | Na conversa, sem corte |
| `read_document` em português ou ASCII | 50.932 e 50.935 | Arquivo: "Output too large" |
| `search` em JSON | 27.314 | Na conversa |
| `list_tasks` em JSON | 32.704 a 49.574 | Na conversa |
| `list_tasks` em JSON | 54.464 e 69.374 | Arquivo: "exceeds maximum allowed tokens" |

- **Regra de caracteres:** um resultado cujos blocos de texto somam mais de 50.000 caracteres vai para um arquivo, e o modelo recebe uma prévia de cerca de 2.000. A medida são caracteres, não bytes nem tokens: o documento em português de 48.932 caracteres (56.892 bytes) ficou na conversa, e o ASCII de 50.935 não. Resultados com imagem, como `read_drawing`, ficam isentos.
- **Regra de tokens:** `MAX_MCP_OUTPUT_TOKENS`, de 25.000 tokens por padrão, também manda o resultado para um arquivo. Com o padrão, ela só apareceu acima de 50.000 caracteres, no JSON de tarefas. Com `MAX_MCP_OUTPUT_TOKENS=5000`, um documento de 29.932 caracteres foi para um arquivo; com `100000`, o de 50.932 continuou indo pela regra de caracteres, que a variável não muda.
- **Variações:** o executável também lê um limite por ferramenta definido remotamente, e uma ferramenta pode declarar `_meta["anthropic/maxResultSizeChars"]` para subir o seu. Por isso o Tinyfold fica em 45.000, com margem.

#### Leitura longa sobre `4feae9c`

Repetida em 2026-10-31, nas mesmas condições isoladas, depois de as respostas passarem a caber em 45.000 caracteres e as páginas de documento em 36.000.

- **Documento:** um documento de 122.516 caracteres em Markdown saiu em quatro páginas: 44.100 caracteres na primeira, com o cabeçalho, depois 35.634, 35.614 e 7.168.
- **Claude Code 2.1.310:** com só as ferramentas MCP permitidas e a revisão 2026-07-28 negociada, todas as páginas ficaram na conversa. O modelo seguiu os cursores `1:35514`, `1:71037` e `1:106539` e respondeu com a última linha do documento.
- **Lista:** `list_tasks` perto do teto, com 44.682 caracteres, ficou na conversa com 68 tarefas e um `nextCursor`.
- **Limpeza:** nenhuma ocorrência do token nos logs. Banco, token e configuração temporária foram removidos.

### Rodadas adversariais

Nenhum achado crítico ou alto. Corrigidos e retestados:

- **Primeira rodada, médias:**
  - lotes JSON-RPC que levavam até 100 chamadas por requisição;
  - bloqueio por IP antes da autenticação, que barrava um token válido;
  - busca só por trecho exato;
  - prévia que não se renovava ao reabrir um desenho na mesma página;
  - teste de ida e volta que evitava as perdas do parser;
  - `read_document` quadrático numa quebra por linha;
  - Markdown que virava título ou código para um leitor CommonMark;
  - leitor concentrado num arquivo;
  - limites espalhados;
  - emissor de Markdown difícil de alterar.
- **Segunda rodada:**
  - média: duas marcas BOM furavam a recusa de lotes;
  - PNG com dados que não descomprimem;
  - links que forjavam linhas na estrutura do desenho;
  - trechos de busca que normalizavam o texto inteiro;
  - cursor do quadro que repetia tarefas depois de um movimento;
  - resíduos de ênfase, rótulo de link e cortes de página;
  - renderizações desnecessárias de prévias e uma perda não declarada do parser do BlockNote.

### Pendências

- HTTPS público, proxy real (`/mcp` com `Authorization` e `text/event-stream` sem buffer, `TRUST_PROXY`) e o Claude Code apontando para a origem pública.
- Acesso de dois aparelhos físicos na origem pública.
- `headersHelper` e a variável de ambiente no `.mcp.json`, documentados em [operação](implantacao.md#claude-code), não foram exercitados.
- O registro pelo próprio `claude mcp add` e `claude mcp list` não foram executados, para não alterar a configuração do usuário. A conexão usou o mesmo endereço e cabeçalho.
- Um usuário que baixe `MAX_MCP_OUTPUT_TOKENS` muito abaixo do padrão, ou um limite remoto menor no Claude Code, ainda faz respostas grandes irem para um arquivo. O Tinyfold não controla esses valores.

## Canvas e regressão no worktree

A etapa 06 foi implementada com três subagentes para persistência, editor e navegação, com revisão cruzada dos contratos e recuperação de rascunhos. A execução integrada usa bancos SQLite temporários e a porta 5172, preservando os servidores existentes da pasta original.

| Verificação | Resultado |
| --- | --- |
| `mise exec -- pnpm install --frozen-lockfile` | Instalação aprovada com o patch versionado de fontes |
| `mise exec -- pnpm check` | Biome, tipos, fronteiras e 105 testes unitários aprovados, em 5 arquivos |
| `mise exec -- pnpm test:db` | 38 testes aprovados, em 7 arquivos, com bancos temporários |
| `mise exec -- pnpm build` | Bundle de produção aprovado com editor sob demanda e fontes na própria origem |
| `E2E_PORT=5172 mise exec -- pnpm e2e` | 44 testes aprovados: 22 desktop e 22 emulação Pixel 7, incluindo traço por toque |

Os novos fluxos verificam desenho real com retângulo, texto e traço livre; no perfil mobile, o traço usa eventos de toque do Chrome. Exportação PNG e ida e volta de `.excalidraw` preservam o desenho, a busca encontra seu texto e as fontes não geram violações de CSP. Projetos, recentes, filtros, abas por teclado, arquivamento, lixeira e restauração também são exercitados pela interface.

| Tela | Desktop | Celular |
| --- | --- | --- |
| Canvas | [Captura](screens/canvas-desktop.png) | [Captura](screens/canvas-mobile.png) |

Os testes de falha verificam resposta perdida com reenvio idêntico, novas edições durante o pedido, recarga de rascunho, duas sessões em conflito, abas duplicadas, sessão expirada e cópia após exclusão remota. A revisão corrigiu recuperação em projetos arquivados, acesso ao rascunho de desenho excluído, acúmulo de elementos apagados, intervalo máximo de escrita local e sobreposição do título mobile.

O banco foi reaberto após reinício; migração de uma base anterior preservou documentos e tarefas. O teste de backup/restauração verificou cena, versão e projeto em outro arquivo, independente de escritas posteriores no original.

A regressão também cobre as equações que estavam em desenvolvimento no snapshot inicial: substituição, cancelamento e recarga de matemática em linha, além de intercâmbio Markdown com LaTeX inválido preservado. As correções correspondentes foram adaptadas das alterações de matemática da pasta original, sem modificá-la.

Na integração na `main`, foram preservadas as correções mais recentes das equações e repetidos `check` (105 testes unitários), `test:db` (38 testes) e build. A suíte na porta 5188 aprovou 42 cenários; os dois testes de equação foram aprovados no reteste desktop/mobile após ajustar o seletor para identificar a fórmula pela fonte LaTeX, em vez da posição no documento.

Imagens no canvas, colaboração simultânea e validação em aparelhos físicos continuam fora deste recorte. Os testes não substituem publicação ou verificação de infraestrutura externa.

## Verificações da versão inicial

| Verificação | Resultado |
| --- | --- |
| `pnpm check` | Biome, TypeScript de todos os pacotes, fronteiras de dependência e 80 testes unitários aprovados, incluindo equações |
| `pnpm test:db` | 29 testes aprovados, em 5 arquivos, com SQLite temporário real, incluindo persistência e busca de LaTeX |
| `pnpm build` | SPA de produção compilada, editor carregado sob demanda |
| Chrome E2E | 24 cenários aprovados entre a suíte completa e a reexecução dos casos de equações: 12 desktop e 12 emulação Pixel7 |
| Regressão após ajuste de título | 8 testes de `app.spec.ts` aprovados novamente nos dois perfis, incluindo ausência de corte/rolagem no título |
| `docker build -t tinyfold:local .` | Instalação com lockfile e compilação em Linux aprovadas |
| Smoke de Docker | Login, escrita, reinício, recriação do container e preservação de sessão/dados aprovados |
| Backup/restauração | Snapshot com servidor ativo, restauração independente e integrity_check aprovados; substituição de destino recusada |

O build informa chunks acima de 500 kB. O editor foi separado em importação dinâmica; esse aviso continua, especialmente pelo conjunto de dependências de edição, e não impede o build.

## Fluxos da versão inicial no Chrome

Os E2E usam a interface e API reais, com banco isolado. Os mesmos doze cenários foram executados nos dois perfis:

1. Criar documento sem projeto, escrever, recarregar, buscar pelo conteúdo e conferir o Markdown exportado.
2. Importar Markdown com título, negrito, link, checklist e código; recarregar e preservar o documento anterior.
3. Criar projeto e tarefa, mover pelo menu e concluir.
4. Editar sem conexão, recarregar após reconectar e recuperar o texto.
5. Editar em duas sessões, detectar conflito e guardar a segunda versão como cópia.
6. Converter seleção em tarefa, excluir o documento para a lixeira e restaurar sua origem.
7. Interromper a resposta após o servidor gravar a tarefa e repetir sem duplicação.
8. Duplicar a identidade de uma aba, escrever rascunhos diferentes e preservar cada um após recarga.
9. Alterar o trecho de origem e atualizar o estado da tarefa sem sair do documento.
10. Inserir equação em bloco, editar após recarga, preservar LaTeX inválido e exportar a fonte; verificar ausência de bloqueios CSP.
11. Inserir equação em linha, substituir a fonte pelo teclado, cancelar sem alterar, conter fórmula longa, usar `$...$` e reabrir/exportar fonte inválida.
12. Importar e reexportar Markdown com equações em linha, matriz, fórmula incompleta e código literal, sem converter o código ou omitir fontes.

Também foi feita interação manual com a janela do **Google Chrome**: login, tela inicial, criação de documento, digitação, atalho Markdown de título, seleção, criação de tarefa vinculada e movimentação no Kanban. Desktop e mobile foram inspecionados visualmente pelas capturas; mobile é emulação, não um aparelho físico.

## Design e usabilidade

A revisão confirmou a paleta grafite/cinza frio/azul, ação principal de escrever, projeto opcional e navegação curta. O editor concentra a área útil no texto. O Kanban mantém as três colunas e oferece menu como alternativa ao arrastar; no celular a rolagem ocorre dentro do quadro, sem alargar a página.

A captura mobile identificou título longo cortado no editor. A correção permite quebra visual e altura automática no campo de título, mantendo o valor textual em uma linha. O teste de captura verifica que o campo inteiro cabe sem rolagem interna.

| Tela | Desktop | Celular |
| --- | --- | --- |
| Documento | [Captura](screens/editor-desktop.png) | [Captura](screens/editor-mobile.png) |
| Editar equação | [Captura](screens/equacoes-desktop.png) | [Captura](screens/equacoes-mobile.png) |

As capturas do Início e do Kanban da primeira versão saíram com a etapa 08, que tirou o Início e o quadro geral. As telas atuais, Visão geral e Quadro do projeto inclusive, estão na [validação da etapa 08](#validação-no-chrome-real-contra-o-protótipo).

## Rodadas adversariais

Os detalhes, reproduções e limites estão em [revisão de backend](revisao-backend.md) e [revisão de workspace](revisao-workspace.md).

A primeira rodada confrontou a validação do servidor com o parser real do editor e examinou persistência, sessão e recuperação de rascunhos. Foram corrigidos documentos inválidos que não reabriam, pedidos recuperados com outro documento como destino, seleção entre blocos e origens de tarefas desatualizadas.

A segunda rodada exercitou falhas no navegador. A perda de rascunho em aba duplicada foi reproduzida contra o bundle anterior; o mesmo teste passou após separar a identidade de cada escritor. Conflitos preservaram ambas as versões, e resposta perdida não gerou tarefa duplicada. A revisão também passou a preservar conteúdo acima do limite do servidor para exportação e recuperação, com limites próprios e validação estrutural.

## Equações

A extensão de matemática foi revisada por dois subagentes, com validação do formato persistido, intercâmbio Markdown e interação real no Google Chrome. Os testes de Markdown usam o parser e o esquema reais da versão instalada do BlockNote. A revisão encontrou e corrigiu:

- Perda do primeiro caractere ao substituir a fonte de uma equação em linha: a edição passou a usar textarea nativo em diálogo com prévia.
- Exportação que omitia LaTeX inválido ou truncava fontes com sinais de dólar: o intercâmbio preserva a fonte e escolhe delimitadores seguros.
- Ausência de importação matemática no parser padrão: equações são identificadas pela árvore sintática Markdown, preservando código, links e HTML.
- Fontes KaTeX embutidas bloqueadas pela CSP: o build emite arquivos locais, sem flexibilizar a política.
- Fórmula longa alargando a página: a rolagem fica dentro da equação, com verificação em desktop e celular.
- Atalho inline não registrado pelo esquema da versão 0.56: a extensão de `$...$` é registrada explicitamente.

Fórmulas inválidas permanecem editáveis e exportáveis. Os testes de domínio rejeitam estruturas incompatíveis sem impedir que o usuário salve uma fonte LaTeX ainda incompleta. A busca inclui a fonte; salvar e reabrir foi verificado em SQLite temporário.

A suíte completa passou nos 18 cenários anteriores e nos quatro cenários de bloco/Markdown. O teste de fórmula longa reproduziu o overflow nos dois perfis; depois da correção, os seis cenários de equações foram verificados novamente, com aprovação final dos casos inline em desktop e celular. As capturas foram inspecionadas visualmente. O atalho de ir ao fim do documento no teste respeita a combinação de teclas do macOS.

## Operação e limites

O smoke criou recursos exclusivos e temporários. Após reiniciar e recriar o container nos mesmos volumes, sessão, documentos e tarefas permaneceram. Original, snapshot e restauração retornaram `integrity_check=ok`; escritas posteriores no original não alteraram a restauração. Os recursos do teste foram removidos.

A imagem foi reconstruída após os ajustes de equações: `tinyfold:local`, digest `sha256:4862efef2c3bee107a18c203cc3b40dad519350ce75642831b4d06eaf34e8454`. Um novo container temporário dessa imagem respondeu em `/ready`, serviu a SPA compilada e manteve a CSP de fontes na mesma origem; ele também foi removido ao fim.

- Hospedagem, domínio, TLS/proxy real e backups externos agendados ainda não foram configurados.
- Acesso de dois aparelhos físicos na origem pública permanece pendente.
- Não foi realizada auditoria formal de acessibilidade nem teste de carga.
- A recuperação local depende do armazenamento do navegador; não é sincronização offline completa.
- A exportação Markdown pode perder atributos internos e não inclui projetos, tarefas ou sessões.
- CI foi configurado, mas não executado em um remoto GitHub.

Os arquivos de teste, bancos, senhas locais e traces ficam fora do Git. As capturas versionadas contêm somente dados fictícios dos testes.
