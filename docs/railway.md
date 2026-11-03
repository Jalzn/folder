# Tinyfold — Railway e Cloudflare

**Estado:** serviço implantado no Railway e conectado à `main` do GitHub, disponível em [folder.jalzn.com](https://folder.jalzn.com). A instalação começou vazia, sem importar dados locais. DNS, certificado HTTPS, rotas da SPA e login pelo subdomínio foram verificados. O segundo deploy preservou a sessão do primeiro. As verificações executadas estão em [validação](validacao.md#preparação-para-railway-e-cloudflare).

A etapa 13 foi integrada na `main` em 2026-11-03, mantendo o mesmo serviço, volume e pipeline de publicação. O estado de cada versão é registrado no GitHub Actions e no histórico de deployments do serviço.

## Esta instalação

- [Projeto tinyfold no Railway](https://railway.com/project/f42f84f1-c14a-423e-83d7-f05f9ddd6d54), ambiente `production`.
- Serviço `tinyfold`: `4446962c-9c05-452d-be86-168c5c722891`.
- Volume `tinyfold-volume`: `ebd94a97-7448-4837-87c6-b97a24685141`, montado em `/data`, na região `sfo`.
- A conta foi criada com uma senha exclusiva, cadastrada por stdin. Depois, a senha escolhida pelo usuário em `OWNER_PASSWORD` no Railway foi aplicada à conta pelo comando de redefinição. O arquivo local `.env.railway` guarda apenas a configuração: a senha inicial foi removida, e a senha atual não foi copiada para ele.
- Fonte conectada: [Jalzn/folder](https://github.com/Jalzn/folder), branch `main`, com deploy automático e **Wait for CI** ativos. O workflow `Check Tinyfold` roda em push na `main` e em pull requests.
- Primeiro deploy pelo GitHub validado: `4224eca0-e276-4c7f-90a9-f8496a994666`, após o CI aprovado de `67ac429`. O endereço gerado `https://tinyfold-production.up.railway.app` responde em `/ready`; o uso normal e as escritas continuam vinculados a `https://folder.jalzn.com` por `APP_ORIGIN`.

Para vincular outro checkout a esse ambiente:

```sh
railway link --project f42f84f1-c14a-423e-83d7-f05f9ddd6d54 --service 4446962c-9c05-452d-be86-168c5c722891 --environment production
```

## Deploy automático pelo GitHub

Pushes em `main` acionam o CI e o deploy deste mesmo serviço, usando o Dockerfile da raiz, `/ready` e o volume existente em `/data`. A API pode identificar o builder como `RAILPACK`: a detecção do Dockerfile foi confirmada nos logs do build. A integração da fonte e o gatilho de GitHub são configurações do serviço; não alteram as variáveis nem o volume descritos pelo IaC.

O gatilho `a6cbdd1e-e8d0-402e-ac12-32d6b424a776` usa `checkSuites=true` (**Wait for CI**). A execução aguarda os workflows do commit; um CI que falha impede sua publicação. Conferir os resultados no [GitHub Actions](https://github.com/Jalzn/folder/actions) e no histórico de deployments do serviço. A documentação do provedor descreve o [deploy automático e a espera pelo CI](https://docs.railway.com/deployments/github-autodeploys).

Para reconstruir a conexão, selecionar o serviço e o ambiente exatos:

```sh
railway service source connect --project f42f84f1-c14a-423e-83d7-f05f9ddd6d54 --environment production --service 4446962c-9c05-452d-be86-168c5c722891 --repo Jalzn/folder --branch main
```

Depois de reconectar, conferir **Wait for CI** nas configurações: a conexão pode criar um novo gatilho sem essa opção. Antes do primeiro deploy pelo GitHub, o snapshot `tinyfold-2026-11-03T16-20-56-716Z.sqlite` foi criado no serviço, baixado para `backups/` (fora do Git) e restaurado com verificação em um arquivo temporário separado.

## O que está no repositório

- `.railway/railway.ts` seleciona o Dockerfile, anexa o volume em `/data`, fixa uma instância, cadastra `folder.jalzn.com`, usa `/ready` para liberar a implantação e permite 30 segundos para encerrar o processo. O serviço permanece ativo, sem suspensão por inatividade.
- O Dockerfile fixa Node e pnpm nas mesmas versões de `mise.toml`. A inicialização recusa a execução no Railway sem `RAILWAY_VOLUME_MOUNT_PATH=/data`, ajusta o dono dos arquivos de `/data` e `/backups`, montados como `root` pelo provedor, e passa a execução para `node`. O processo do aplicativo recebe `SIGTERM` diretamente e fecha o banco. A variável do volume é fornecida pelo Railway; não deve ser simulada manualmente no painel.
- `.railwayignore` e `.dockerignore` excluem ambientes, bancos, backups e dependências locais do envio e da imagem. As fontes do Excalidraw são copiadas das dependências durante o build.
- Migrações e criação da conta acontecem na inicialização, depois da montagem do volume. Não configure `preDeployCommand`: o volume não está disponível nessa fase.

A configuração IaC descreve serviço, domínio e volume. `railway config apply` aplica essa estrutura, mas não envia o código. As variáveis continuam sob gestão do painel/CLI (`variables.managed=false`) e não têm seus valores copiados para o código. Agendamentos de backup são separados. Referências: [Infrastructure as Code](https://docs.railway.com/infrastructure-as-code) e [volumes](https://docs.railway.com/volumes).

O `railway.json` da preparação inicial foi substituído pelo IaC recomendado pela CLI 5.71.0. O SDK `railway@3.16.0` está fixado nas dependências de desenvolvimento, e `pnpm typecheck` verifica também `.railway/`.

## Criar o serviço

1. Para esta instalação, vincular o checkout ao projeto existente. Para outra instalação, criar um projeto chamado `tinyfold` e revisar o domínio em `.railway/railway.ts`. Usar a raiz deste repositório como diretório do serviço e manter os comandos personalizados de build, início e pré-implantação vazios.
2. Executar `railway config plan`, conferir as mudanças e executar `railway config apply`. A configuração cria/anexa o volume em `/data` e mantém uma única região e uma instância. A troca de implantação terá uma breve interrupção, pois o volume não é compartilhado por duas implantações ativas.
3. Cadastrar as variáveis abaixo em **Variables**. Definir a senha no painel; não colocá-la no Git nem em comandos salvos no histórico.
4. Conectar o repositório GitHub à branch de produção e habilitar **Wait for CI**. Nesta instalação, `Jalzn/folder/main` já está conectado e o deploy aguarda o workflow do GitHub Actions. O upload pela CLI continua disponível para operação manual.

| Variável | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3370` |
| `WEB_DIR` | `/app/src/web/dist` |
| `DATABASE_PATH` | `/data/tinyfold.sqlite` |
| `BACKUP_DIR` | `/data/backups` |
| `APP_ORIGIN` | `https://folder.jalzn.com`, sem barra final |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `false`, até validar o encaminhamento real do IP |
| `OWNER_NAME` | Nome exibido no Perfil |
| `OWNER_PASSWORD` | Senha exclusiva, de 12 a 256 caracteres, para criar a conta |

`BACKUP_DIR` fica dentro de `/data` porque o Railway permite um volume por serviço. Os snapshots nesse diretório compartilham o risco do banco; a cópia externa está descrita adiante. A senha cria a conta apenas uma vez; mudar a variável depois não troca a senha existente. O aplicativo não tem cadastro público.

Para aplicar um novo valor de `OWNER_PASSWORD` à conta existente, depois de a variável estar disponível no serviço, executar no servidor:

```sh
railway ssh --service tinyfold -- gosu node node --import tsx --input-type=module -e 'process.env.NEW_OWNER_PASSWORD=process.env.OWNER_PASSWORD; await import("./src/server/cli/reset-password.ts");'
```

O comando usa o valor que já está no ambiente do Railway, sem copiar nem imprimir a senha. A redefinição encerra todas as sessões e revoga todos os tokens de acesso. Depois, entrar com o valor atual de `OWNER_PASSWORD`. Para trocar a senha enquanto estiver conectado, usar o Perfil.

Pela CLI já autenticada, o fluxo equivalente é:

```sh
# Somente para um projeto novo; para o existente, usar o link acima.
railway init --name tinyfold
railway config plan
railway config apply
# Cadastrar as variáveis e a senha no painel antes do primeiro upload.
railway up --service tinyfold
```

Para um projeto existente, usar `railway link --project <ID> --service tinyfold --environment production` em vez de criar outro. `railway run` executa um comando **na máquina local**, apenas injetando variáveis: não o use para migrar, restaurar ou fazer backup do SQLite remoto. Para operar arquivos do servidor, use `railway ssh`.

## Subdomínio na Cloudflare

O endereço é `folder.jalzn.com`. A SPA, `/rpc`, `/mcp` e `/arquivos` usam a mesma origem. O domínio está cadastrado no Railway com porta `3370`, verificação de propriedade concluída e certificado válido. Estes registros na zona `jalzn.com` da Cloudflare foram confirmados em 2026-11-02:

| Tipo | Nome | Valor | Proxy |
| --- | --- | --- | --- |
| CNAME | `folder` | `87viig26.up.railway.app` | Somente DNS |
| TXT | `_railway-verify.folder` | `railway-verify=e4be25ac8d21f5f3a053571c69bd1c5be6871a627afc33c2a694ec8b4b4eca82` | Não se aplica |

Os valores acima vieram do cadastro deste serviço em 2026-11-02. Ao recriar o domínio, consultar `railway domain status folder.jalzn.com --service tinyfold --json` para obter os valores vigentes.

Na primeira tentativa após cadastrar o DNS, o Railway ainda mostrava `verified=false` e `VALIDATING_OWNERSHIP`: o domínio retornava erro mesmo com CNAME e TXT corretos. A rota de porta `3370` foi reaplicada sem recriar o domínio. Na conferência seguinte, o Railway passou a `verified=true` e certificado `VALID`; `/ready`, a SPA e o login responderam pelo subdomínio. Não houve novo deploy para essa ativação.

1. No serviço do Railway, abrir **Settings → Networking → Public Networking → Custom Domain**, informar o subdomínio e selecionar a porta `3370`.
2. Na zona do domínio na Cloudflare, criar o **CNAME** e o **TXT de verificação** com os nomes e valores exatos que o Railway mostrar. O destino do CNAME é um hostname, sem `https://` nem caminho. Não inventar o destino a partir do nome do projeto.
3. Deixar o CNAME como **DNS only / Somente DNS** (nuvem cinza) na primeira configuração. Remover registros conflitantes apenas desse subdomínio. A Cloudflare gerencia o DNS, e o Railway atende HTTPS e emite o certificado.
4. Esperar a verificação do domínio e a emissão do certificado no Railway. Confirmar `APP_ORIGIN=https://folder.jalzn.com`; se a variável mudar, implantar novamente.
5. Abrir o subdomínio HTTPS e entrar com a senha configurada. Conferir também `https://folder.jalzn.com/ready`.

Adicionar somente o CNAME pode deixar o domínio sem verificação. Copiar também o TXT exigido pelo painel, conforme a [documentação de domínios do Railway](https://docs.railway.com/networking/domains/working-with-domains).

O domínio temporário `*.up.railway.app` pode servir para verificar `/ready`, mas o login e as escritas precisam acontecer na origem exata de `APP_ORIGIN`. Se começar com o domínio temporário, mudar essa variável para o subdomínio antes de passar a usá-lo. Cookies e rascunhos locais pertencem a cada origem: salvar o que estiver pendente no endereço antigo antes de mudar, e entrar novamente no novo endereço.

### Se ativar o proxy da Cloudflare

Depois de validar o modo Somente DNS, é possível ligar a nuvem laranja:

- Usar **SSL/TLS → Full (strict)**, com o certificado do Railway já válido para o subdomínio. Se outros serviços da zona exigirem configuração diferente, aplicar uma regra restrita ao hostname do Tinyfold. Referência: [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
- Criar uma **Cache Rule** para `Hostname equals folder.jalzn.com`, com **Bypass cache**, depois de regras que conflitem. Isso inclui as prévias privadas em `/arquivos`, a SPA, `/rpc`, `/mcp` e `/.well-known`. O navegador ainda respeita os cabeçalhos de cache do servidor. Referências: [criar regra](https://developers.cloudflare.com/cache/how-to/cache-rules/create-dashboard/) e [ordem das regras](https://developers.cloudflare.com/cache/how-to/cache-rules/order/).
- Preservar `Origin`, `Authorization`, cookies, `If-None-Match` e o fluxo `text/event-stream` do MCP. Desativar Rocket Loader para esse hostname e evitar desafios interativos no `/mcp`, que é usado por clientes sem navegador.
- Repetir a validação de login, salvamento, figuras e MCP pelo subdomínio. Manter `TRUST_PROXY=false` até verificar a cadeia de proxies; o código só confia no último endereço de `X-Forwarded-For` quando essa opção está ligada. Com ela desligada, as tentativas de login e falhas de autenticação MCP podem compartilhar o limite por IP do proxy.

## Backups e atualização

Nesta conta, a tentativa de configurar backups diários nativos em 2026-11-02 foi recusada pela API: o recurso exige workspace Pro. Nenhum plano foi alterado. O agendamento nativo e a cópia externa automática continuam pendentes; os snapshots SQLite pelo aplicativo e o download pela CLI funcionam separadamente desse recurso.

Em um plano compatível, abrir **Backups** no painel do serviço e ativar cópias automáticas diárias do volume. Uma cópia antes de atualizar complementa o agendamento. Referência: [backups de volume](https://docs.railway.com/volumes/backups).

Para produzir um snapshot SQLite consistente e verificado no serviço:

```sh
railway ssh --service tinyfold -- gosu node pnpm backup:create
```

O comando imprime o arquivo criado em `/data/backups`. Para guardar fora do Railway, usar `railway volume --service tinyfold browse` e baixar esse snapshot para uma pasta local de backup. Baixar o **snapshot verificado**, não o banco aberto nem seus arquivos WAL separadamente. A listagem da CLI também permite escolher o volume e o caminho antes de baixar:

```sh
railway volume --service tinyfold list --json
railway volume --service tinyfold files --volume <ID-DO-VOLUME> list /
railway volume --service tinyfold files --volume <ID-DO-VOLUME> download <CAMINHO-DO-SNAPSHOT> backups/<NOME>.sqlite
mise exec -- pnpm backup:restore backups/<NOME>.sqlite /caminho/novo/ensaio.sqlite
```

Os caminhos da ferramenta de volume são os exibidos na listagem; não presumir que incluem o prefixo `/data`. O destino local da restauração precisa ser novo. O ensaio não troca o banco ativo. Os backups nativos continuam no Railway; a cópia externa protege também contra perda do projeto ou da conta. O upload externo automático ainda precisa ser configurado.

Nesta implantação, a listagem de arquivos por SFTP da CLI terminou por timeout. O snapshot foi baixado por SSH, transferindo base64 e validando a decodificação antes de gravar o arquivo. A cópia local `backups/tinyfold-2026-11-02T20-49-13-106Z.sqlite` passou em uma restauração temporária, com integridade e chaves estrangeiras verificadas; ela fica fora do Git.

Antes de atualizar: aguardar o salvamento nas abas, criar e baixar o snapshot, enviar a versão, esperar `/ready`, recarregar as abas e conferir o conteúdo. Um rollback de código não desfaz migrações; para voltar o banco, parar o serviço e restaurar uma cópia em um arquivo novo antes de ajustar `DATABASE_PATH`. Nunca substituir um SQLite enquanto o processo o mantém aberto. Consultar também [atualização da etapa 11](implantacao.md#atualizar-para-a-etapa-11).

## Levar os dados locais, se necessário

Para começar vazio, basta a primeira subida no volume novo. Para levar os dados existentes, primeiro aguardar o salvamento de todas as abas locais e criar um snapshot com `mise exec -- pnpm backup:create`. Conferir o snapshot por uma restauração em arquivo temporário, sem substituir `data/tinyfold.sqlite`.

Enviar esse snapshot para o volume com o serviço remoto parado e adotá-lo em um caminho novo, por exemplo `/data/importado.sqlite`, ajustando `DATABASE_PATH` antes de iniciar. A subida aplica as migrações pendentes. O snapshot traz a conta e a senha locais, sessões, tokens e a identidade da instalação; `OWNER_PASSWORD` não os substitui. Rascunhos ainda pendentes no navegador não fazem parte do snapshot. Se já houver conteúdo remoto, preservar um snapshot dele antes da troca. Não juntar dois bancos por cópia de arquivos.

## Conferir antes do uso diário

DNS, certificado, `/ready`, rotas da SPA, arquivos JavaScript e login/sessão/logout já foram verificados por HTTP na origem pública. Para conferir o uso diário no navegador:

1. `/ready` responde 200; a SPA e os arquivos de fontes carregam; entrar e sair funciona com cookie Secure e HttpOnly.
2. Criar projeto, documento, tarefa e desenho; aguardar Salvo; reabrir após reiniciar o serviço e após nova implantação no mesmo volume.
3. Abrir a mesma conta em outro dispositivo físico e conferir os dados. Editar o mesmo documento nos dois para verificar a detecção de conflito, preservando os dois textos.
4. Abrir uma figura incorporada; sem sessão, a prévia continua inacessível. Se usar o Claude Code, gerar o token no Perfil e testar o comando com a origem pública.
5. Confirmar o agendamento do volume, baixar um snapshot e ensaiar a restauração em arquivo novo fora do servidor.

Esses passos são verificações planejadas, não evidência de uma implantação já feita.
