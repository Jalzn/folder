# Tinyfold — Validação local

Validação local a partir de 29 de outubro de 2026. A primeira versão foi implementada com três subagentes — backend, workspace e interface — e duas rodadas de revisão cruzada; cada etapa seguinte tem sua seção, a mais recente primeiro. Nenhuma publicação na nuvem foi realizada.

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
