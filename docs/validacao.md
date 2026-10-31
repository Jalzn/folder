# Tinyfold — Validação local

Validação local a partir de 29 de outubro de 2026. A primeira versão foi implementada com três subagentes — backend, workspace e interface — e duas rodadas de revisão cruzada; cada etapa seguinte tem sua seção, a mais recente primeiro. Nenhuma publicação na nuvem foi realizada.

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
| Início | [Captura](screens/inicio-desktop.png) | [Captura](screens/inicio-mobile.png) |
| Documento | [Captura](screens/editor-desktop.png) | [Captura](screens/editor-mobile.png) |
| Kanban | [Captura](screens/kanban-desktop.png) | [Captura](screens/kanban-mobile.png) |
| Editar equação | [Captura](screens/equacoes-desktop.png) | [Captura](screens/equacoes-mobile.png) |

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
