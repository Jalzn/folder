# Tinyfold — Operação

## Desenvolvimento

Use `mise install` para as versões fixadas, seguido de `mise exec -- pnpm install`. Copie `.env.example` para `.env` e defina `OWNER_PASSWORD` antes da primeira subida. A conta é criada uma vez; alterações posteriores dessa variável não trocam a senha gravada.

`mise exec -- pnpm dev` inicia o servidor em `127.0.0.1:3370` e a interface em `http://localhost:5170`. O Vite encaminha `/rpc`, `/mcp`, `/.well-known` e `/arquivos` (as prévias das figuras dos documentos) ao servidor, então o comando do Claude Code mostrado no Perfil funciona em `localhost:5170`. O caminho relativo `DATABASE_PATH` é resolvido a partir da raiz do repositório, independentemente do diretório atual. Na subida, o servidor registra o caminho do banco aberto (`Banco: …`).

`mise exec -- pnpm seed:sample` preenche um banco com os dados de exemplo, para validação visual e capturas, nunca para uso real. Ele só grava na pasta temporária do sistema, num arquivo novo ou num banco vazio, por exemplo `DATABASE_PATH="$(mktemp -d)/tinyfold.sqlite"`, e confere o destino antes de migrar qualquer coisa. Recusa outro lugar, um link simbólico, qualquer `data/tinyfold.sqlite`, o banco de produção (`/data/tinyfold.sqlite`), `NODE_ENV=production` e um arquivo que já tenha tabelas. Rode-o com o `dev` parado e suba o `dev` com o mesmo `DATABASE_PATH`.

O exemplo traz o quadro do brief: as colunas A fazer, Em andamento, Revisão e Concluído, sete etiquetas, prazos contados do dia em que o seed roda e descrições com checklist. `mise exec -- pnpm seed:sample --grande` grava a variante grande, com o Tinyfold em 55 itens e quatro pastas, como o comando "Simular projeto grande" do protótipo, e 60 tarefas concluídas de 15 a 120 dias antes. Serve só para validar a escala da lateral, o rodapé da coluna de conclusão e as páginas de Concluídas, com as mesmas recusas. Nas duas variantes, a "Visão do produto" incorpora uma tarefa, um desenho e uma tarefa que está na lixeira, e abrir um documento ou desenho do exemplo não salva nada; a figura só grava, na primeira abertura, a prévia do desenho incorporado, sem mudar a versão dele.

## Produção

A imagem Docker serve a interface compilada, `/rpc`, `/mcp` e as prévias das figuras (`/arquivos/desenhos/:id/previa.png`) no mesmo processo. Configurar:

- `APP_ORIGIN` com a origem HTTPS exata, sem caminho ou barra final.
- `DATABASE_PATH=/data/tinyfold.sqlite` e volume persistente em `/data`.
- `OWNER_PASSWORD` somente na criação da conta; manter segredos no ambiente da hospedagem.
- `NODE_ENV=production`, que exige HTTPS na origem e cookie Secure.
- `WEB_DIR=/app/src/web/dist`, já definido na imagem.
- Uma instância e um volume local ao processo. O banco não fica exposto por uma porta própria.
- `/health` verifica o processo e `/ready` consulta o banco.

Se existir proxy, configurar `TRUST_PROXY` somente após conferir o encaminhamento do IP na infraestrutura. Sem ele, todos os clientes atrás do proxy compartilham o limite de falhas de autenticação por IP do login e do `/mcp`. O proxy também precisa:

- encaminhar `/mcp` e `/.well-known/*` ao processo, com o cabeçalho `Authorization` sem alteração;
- encaminhar `/arquivos/*` ao processo com os cookies e o `If-None-Match`, sem cache próprio: a prévia responde `Cache-Control: private, no-cache` e só sai com a sessão;
- passar `text/event-stream` em `/mcp` sem buffer. Clientes que negociam uma revisão 2025 do protocolo MCP recebem a resposta como um único evento SSE.

O Railway usa a configuração em `.railway/railway.ts`, com volume em `/data` e origem `https://folder.jalzn.com`. A inicialização recusa o Railway sem a variável do volume nesse caminho. O projeto, o serviço, as variáveis, o DNS e o certificado estão configurados; `/ready`, a SPA e o login foram verificados pelo subdomínio. Seguir o [roteiro de Railway e Cloudflare](railway.md), inclusive para os backups no único volume do serviço e sua cópia externa.

Com um arquivo de ambiente de produção já configurado, a imagem pode ser preparada e iniciada assim:

```sh
docker build -t tinyfold:local .
docker run --detach --name tinyfold --restart unless-stopped \
  --publish 127.0.0.1:3370:3370 --env-file .env.production \
  --mount type=volume,src=tinyfold-data,dst=/data \
  --mount type=volume,src=tinyfold-backups,dst=/backups tinyfold:local
```

A inicialização da imagem ajusta as permissões de `/data` e `/backups` antes de executar o aplicativo como `node`, inclusive quando o volume é montado como `root` pelo Railway. O processo recebe os sinais de encerramento diretamente.

O proxy HTTPS deve encaminhar para essa porta local. O volume de backups desse exemplo está no mesmo host; uma cópia externa continua necessária para proteger contra perda do servidor. `.env.production` não deve entrar no Git.

## Atualizar para a etapa 11

A versão da etapa 11 não tem migração. Os itens incorporados são blocos do JSON do documento, resolvidos a cada leitura, e `format_version` continua 1, porque todo documento antigo continua válido.

1. **Fazer o backup.** Criar um backup com `mise exec -- pnpm backup:create` e conferir que ele terminou com a verificação de integridade. Uma base ainda na etapa 07 recebe também as migrações das etapas 08 a 10, como descrito em [Atualizar para a etapa 10](#atualizar-para-a-etapa-10). A instalação remota de 2026-11-02 começou vazia, já com as migrações atuais; o banco local não foi importado.
2. **Subir a versão nova.** Documentos, desenhos e tarefas abrem como estavam, e abrir um documento não o salva. O ensaio com um banco da etapa 10 está na [validação](validacao.md#etapa-11-documento-e-desenho). Um documento só ganha incorporados quando alguém os insere pelo menu `/`, pelo ⌘K ou ao criar uma tarefa de um trecho.
3. **Recarregar as abas abertas.** Uma aba carregada antes da atualização tem o editor da etapa anterior, que não conhece os blocos novos. Nela, um documento com incorporados não abre até recarregar, e a página de erro em português oferece recarregar.
4. **Conferir o proxy.** Se existir proxy, ele deve encaminhar `/arquivos/*` como descrito em [Produção](#produção). Sem isso, as figuras dos documentos ficam sem a imagem.

## Atualizar para a etapa 10

A versão da etapa 10 aplica na subida as migrações `007_board.sql` (workspace) e `003_owner_time_zone.sql` (auth). A 007 é a primeira que reconstrói uma tabela referenciada: `workspace_tasks` volta com a coluna (`column_id`) no lugar do estado, prazo, conclusão e descrição, e ganha as tabelas de colunas, etiquetas e ligações. O executor desliga as chaves estrangeiras antes da transação das migrações, porque o SQLite não muda essa opção dentro de uma, confere `foreign_key_check` antes do `COMMIT` e religa as chaves também em falha. Antes de subir:

1. Criar um backup com `mise exec -- pnpm backup:create` e conferir que ele terminou com a verificação de integridade.
2. Subir a versão nova. O banco real está na etapa 07, então a mesma subida aplica a 005, a 006 e a 007 em sequência, além da 003 do auth; o revisor de dados ensaiou exatamente esse caminho, com bancos criados pelo código da etapa 07 ([validação](validacao.md#etapa-10-quadro-e-tarefa)). As tarefas vão para A fazer, Em andamento e Concluído conforme o estado que tinham, com as mesmas posições, versões e datas; as concluídas recebem como data de conclusão a última edição. A revisão do quadro sobe 1, e um cursor `t~…` do MCP anterior é recusado.
3. Abrir o aplicativo. A primeira carga grava o fuso do aparelho como o fuso do dono, que vale para hoje, o atraso e a janela de 14 dias da coluna de conclusão; até lá, vale UTC. O Perfil troca o fuso com "Usar o fuso deste aparelho". As tarefas concluídas há mais de 14 dias saem do quadro e ficam em Concluídas.

As migrações pendentes rodam numa só transação: se uma falhar, o banco fica como estava, também sem a 005 e a 006. Casos conhecidos:

- Uma violação de chave estrangeira anterior, deixada por SQL manual, não impede a atualização: o log a registra como aviso ("Foreign key violations from before the migrations, left as they were"), com a tabela e o `rowid`, para o reparo com `pragma foreign_key_check`. Uma violação nova recusa a migração inteira.
- Uma aba aberta durante a atualização que mande o estado da tarefa, ou o título por `updateTask`, recebe um erro de validação; recarregar a aba resolve.
- O `INSERT OR REPLACE` em `workspace_folders` deixa de contornar os gatilhos das pastas: um `id` em uso é recusado.

## Atualizar para a etapa 09

A versão da etapa 09 aplica na subida a migração `006_folders.sql`, que só acrescenta: a tabela `workspace_folders`, a coluna `folder_id`, nula, em documentos e desenhos, os índices e os gatilhos das pastas. Nenhum conteúdo muda de lugar. Mesmo assim, antes de subir:

1. Criar um backup com `mise exec -- pnpm backup:create` e conferir que ele terminou com a verificação de integridade.
2. Subir a versão nova. Todo documento e desenho continua na raiz do seu projeto, com o fixado que tinha: o limite de 8 passa a valer por escopo (a raiz e cada pasta), e os fixados de antes cabem na raiz.
3. Abrir o aplicativo. A lateral mostra a árvore Itens no lugar de Documentos e Desenhos; a ordenação guardada no dispositivo volta a Recentes uma vez, porque o formato das preferências mudou.

A migração é atômica: se falhar, o banco fica como estava. Caso conhecido: um `INSERT OR REPLACE` em `workspace_folders`, que só SQL manual faz, contorna os gatilhos das pastas até a migração 007 da [etapa 10](etapas/10-quadro-tarefa.md#migração-srcworkspaceinframigrations007_boardsql), que o fecha. Não edite pastas com SQL manual.

## Atualizar para a etapa 08

A versão da etapa 08 aplica na subida a migração `005_projects_required.sql`, a primeira que move conteúdo do usuário. Antes de subir:

1. Criar um backup com `mise exec -- pnpm backup:create` e conferir que ele terminou com a verificação de integridade.
2. Subir a versão nova. A migração leva documentos, desenhos e tarefas sem projeto, inclusive os da lixeira, ao projeto **Geral**, criado só quando há itens soltos, sem mudar versões nem datas. Projetos ganham cor e ordem no seletor, e documentos e desenhos podem ser fixados.
3. Abrir o aplicativo: ele reabre num projeto. Os endereços antigos redirecionam.

A migração é atômica: se falhar, o banco fica como estava. Casos conhecidos:

- Um projeto que já se chamava "Geral" continua, e o projeto Geral da migração aparece como um segundo "Geral". Renomeie um deles.
- Um banco em que as chaves estrangeiras foram desligadas e deixaram itens órfãos pode fazer a migração parar, ou um item ficar invisível. Restaure o backup e corrija os órfãos antes de tentar de novo.
- Uma aba aberta durante a atualização que repita um pedido antigo com projeto nulo recebe um erro de validação; o rascunho fica, e a aba recarregada mostra o conflito com a versão salva.
- Respostas de escrita gravadas no registro de pedidos antes desta versão guardam o texto de documentos criados e o título e o trecho de tarefas por até 30 dias. Excluir de vez um desses itens nesse período deixa o texto no banco até os registros expirarem, assim como nos backups anteriores à exclusão.

## Backup e restauração

`mise exec -- pnpm backup:create` cria um snapshot com a API de backup do SQLite e verifica sua integridade. O diretório padrão é `backups/`; `BACKUP_DIR` configura outro destino. Também é possível passar o arquivo de destino como argumento.

Em produção, o destino deve ser um volume independente com cópia externa ou um processo deve enviar o snapshot para armazenamento fora do servidor. A criação manual do arquivo não configura esse armazenamento nem um agendamento por si só.

Para ensaiar uma restauração:

```sh
mise exec -- pnpm backup:restore backups/<copia>.sqlite /caminho/novo/tinyfold.sqlite
```

O comando recusa substituir um destino existente, verifica a cópia e mantém o banco atual intacto. Para adotar a base restaurada, parar o servidor, ajustar `DATABASE_PATH` e iniciar novamente. As migrações pendentes são aplicadas na subida.

A restauração traz as sessões e os tokens de acesso existentes no momento do snapshot, **inclusive tokens revogados depois dele**. Depois de restaurar, revogue no Perfil os tokens que não devem valer, ou use a redefinição de senha, que encerra as sessões e revoga todos os tokens.

Excluir de vez apaga o item do banco, mas não dos snapshots: um backup feito antes da exclusão guarda o título e o conteúdo do item, e uma restauração dele traz o item de volta. Para que um texto excluído de vez desapareça também dos backups, é preciso apagar ou deixar expirar os snapshots anteriores à exclusão.

O snapshot inclui as prévias PNG dos desenhos, de 50 a 200 KiB cada, com teto de 256 KiB: cem desenhos somam no máximo 25 MiB. São dados derivados; uma base sem elas, ou com elas defasadas, gera de novo a prévia de cada desenho quando ele é aberto.

## Senha

O Perfil permite trocar a senha e encerrar sessões; trocar a senha não revoga os tokens do Claude Code. Para recuperação pelo terminal, executar `pnpm reset-password` com `NEW_OWNER_PASSWORD` no ambiente. O comando troca a senha, encerra todas as sessões e revoga todos os tokens de acesso na mesma transação. Nunca adicionar `.env`, bancos ou backups ao Git.

## Claude Code

No Perfil, "Acesso pelo Claude Code" gera um token pessoal somente leitura e mostra, uma única vez, o comando de registro com escopo de usuário:

```sh
claude mcp add --transport http --scope user tinyfold https://SEU-DOMINIO/mcp --header "Authorization: Bearer tf_mcp_…"
```

- Conferir com `claude mcp list`; dentro do Claude Code, `/mcp` mostra as seis ferramentas.
- Remover com `claude mcp remove tinyfold --scope user`.
- O Claude Code guarda o cabeçalho na configuração local. Começar o comando com um espaço evita o histórico do terminal quando o shell ignora linhas assim.

Para não deixar o token em texto puro na configuração, há duas alternativas:

- **`headersHelper`:** um comando que imprime os cabeçalhos em JSON, por exemplo lendo o Keychain do macOS:
  `printf '{"Authorization":"Bearer %s"}' "$(security find-generic-password -s tinyfold-mcp -w)"`.
- **Variável de ambiente:** `"Authorization": "Bearer ${TINYFOLD_MCP_TOKEN}"` nos cabeçalhos de um `.mcp.json`.

Essas duas formas não foram exercitadas na validação; a configuração delas está na [documentação do Claude Code](https://code.claude.com/docs/en/mcp).

São até 10 tokens ativos, sem validade. O Perfil mostra o último uso de cada um, gravado no máximo uma vez por minuto. Revogar corta o acesso na chamada seguinte. Um token perdido ou exposto deve ser revogado no Perfil; se o acesso à conta estiver comprometido, `pnpm reset-password` revoga todos.

## Validação

`pnpm check`, `pnpm test:db`, `pnpm build` e `pnpm e2e` verificam código, banco e interface. O E2E inicia um servidor e um SQLite temporário por worker, em portas disponíveis, usa Google Chrome e executa nos tamanhos desktop e celular. O recorte `pnpm e2e:smoke` também exige build prévio. As evidências efetivamente executadas ficam em `docs/validacao.md`.
