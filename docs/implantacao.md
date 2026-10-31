# Tinyfold — Operação

## Desenvolvimento

Use `mise install` para as versões fixadas, seguido de `mise exec -- pnpm install`. Copie `.env.example` para `.env` e defina `OWNER_PASSWORD` antes da primeira subida. A conta é criada uma vez; alterações posteriores dessa variável não trocam a senha gravada.

`mise exec -- pnpm dev` inicia o servidor em `127.0.0.1:3370` e a interface em `http://localhost:5170`. O Vite encaminha `/rpc`, `/mcp` e `/.well-known` ao servidor, então o comando do Claude Code mostrado no Perfil funciona em `localhost:5170`. O caminho relativo `DATABASE_PATH` é resolvido a partir da raiz do repositório, independentemente do diretório atual. Na subida, o servidor registra o caminho do banco aberto (`Banco: …`).

`mise exec -- pnpm seed:sample` preenche um banco com os dados de exemplo, para validação visual e capturas, nunca para uso real. Ele só grava na pasta temporária do sistema, num arquivo novo ou num banco vazio, por exemplo `DATABASE_PATH="$(mktemp -d)/tinyfold.sqlite"`, e confere o destino antes de migrar qualquer coisa. Recusa outro lugar, um link simbólico, qualquer `data/tinyfold.sqlite`, o banco de produção (`/data/tinyfold.sqlite`), `NODE_ENV=production` e um arquivo que já tenha tabelas. Rode-o com o `dev` parado e suba o `dev` com o mesmo `DATABASE_PATH`.

## Produção

A imagem Docker serve a interface compilada, `/rpc` e `/mcp` no mesmo processo. Configurar:

- `APP_ORIGIN` com a origem HTTPS exata, sem caminho ou barra final.
- `DATABASE_PATH=/data/tinyfold.sqlite` e volume persistente em `/data`.
- `OWNER_PASSWORD` somente na criação da conta; manter segredos no ambiente da hospedagem.
- `NODE_ENV=production`, que exige HTTPS na origem e cookie Secure.
- `WEB_DIR=/app/src/web/dist`, já definido na imagem.
- Uma instância e um volume local ao processo. O banco não fica exposto por uma porta própria.
- `/health` verifica o processo e `/ready` consulta o banco.

Se existir proxy, configurar `TRUST_PROXY` somente após conferir o encaminhamento do IP na infraestrutura. Sem ele, todos os clientes atrás do proxy compartilham o limite de falhas de autenticação por IP do login e do `/mcp`. O proxy também precisa:

- encaminhar `/mcp` e `/.well-known/*` ao processo, com o cabeçalho `Authorization` sem alteração;
- passar `text/event-stream` em `/mcp` sem buffer. Clientes que negociam uma revisão 2025 do protocolo MCP recebem a resposta como um único evento SSE.

Hospedagem e domínio ainda não foram escolhidos/configurados para Tinyfold.

Com um arquivo de ambiente de produção já configurado, a imagem pode ser preparada e iniciada assim:

```sh
docker build -t tinyfold:local .
docker run --detach --name tinyfold --restart unless-stopped \
  --publish 127.0.0.1:3370:3370 --env-file .env.production \
  --mount type=volume,src=tinyfold-data,dst=/data \
  --mount type=volume,src=tinyfold-backups,dst=/backups tinyfold:local
```

O proxy HTTPS deve encaminhar para essa porta local. O volume de backups desse exemplo está no mesmo host; uma cópia externa continua necessária para proteger contra perda do servidor. `.env.production` não deve entrar no Git.

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

`pnpm check`, `pnpm test:db`, `pnpm build` e `pnpm e2e` verificam código, banco e interface. O E2E inicia seu próprio servidor e SQLite temporário, usa Google Chrome e executa nos tamanhos desktop e celular. As evidências efetivamente executadas ficam em `docs/validacao.md`.
