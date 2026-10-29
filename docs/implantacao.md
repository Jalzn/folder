# Tinyfold — Operação

## Desenvolvimento

Use `mise install` para as versões fixadas, seguido de `mise exec -- pnpm install`. Copie `.env.example` para `.env` e defina `OWNER_PASSWORD` antes da primeira subida. A conta é criada uma vez; alterações posteriores dessa variável não trocam a senha gravada.

`mise exec -- pnpm dev` inicia o servidor em `127.0.0.1:3370` e a interface em `http://localhost:5170`. O caminho relativo `DATABASE_PATH` é resolvido a partir da raiz do repositório, independentemente do diretório atual.

## Produção

A imagem Docker serve a interface compilada e `/rpc` no mesmo processo. Configurar:

- `APP_ORIGIN` com a origem HTTPS exata, sem caminho ou barra final.
- `DATABASE_PATH=/data/tinyfold.sqlite` e volume persistente em `/data`.
- `OWNER_PASSWORD` somente na criação da conta; manter segredos no ambiente da hospedagem.
- `NODE_ENV=production`, que exige HTTPS na origem e cookie Secure.
- `WEB_DIR=/app/src/web/dist`, já definido na imagem.
- Uma instância e um volume local ao processo. O banco não fica exposto por uma porta própria.
- `/health` verifica o processo e `/ready` consulta o banco.

Se existir proxy, configurar `TRUST_PROXY` somente após conferir o encaminhamento do IP na infraestrutura. Hospedagem e domínio ainda não foram escolhidos/configurados para Tinyfold.

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

O comando recusa substituir um destino existente, verifica a cópia e mantém o banco atual intacto. Para adotar a base restaurada, parar o servidor, ajustar `DATABASE_PATH` e iniciar novamente. As migrações pendentes são aplicadas na subida. A restauração inclui as sessões existentes no momento do snapshot; use a redefinição de senha se precisar encerrá-las.

## Senha

O Perfil permite trocar a senha e encerrar sessões. Para recuperação pelo terminal, executar `pnpm reset-password` com `NEW_OWNER_PASSWORD` no ambiente; o comando encerra todas as sessões. Nunca adicionar `.env`, bancos ou backups ao Git.

## Validação

`pnpm check`, `pnpm test:db`, `pnpm build` e `pnpm e2e` verificam código, banco e interface. O E2E inicia seu próprio servidor e SQLite temporário, usa Google Chrome e executa nos tamanhos desktop e celular. As evidências efetivamente executadas ficam em `docs/validacao.md`.
