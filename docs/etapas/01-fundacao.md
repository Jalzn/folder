# Etapa 01 — Fundação e prova do editor

**Estado:** implementada e validada localmente. Evidências em [validação](../validacao.md).

## Objetivo

Validar a base do Orbis adaptada a SQLite e a experiência essencial do editor. Ao fim, entrar com senha, abrir o shell escuro, escrever um documento de teste, salvar e recuperá-lo em outra sessão.

## Escopo

- Workspace pnpm e módulos core, auth, workspace, server e web.
- TypeScript, Biome, verificação de dependências, Vitest e Playwright.
- SQLite com migrações por módulo, transações, caminho de dados configurável e testes isolados.
- Autenticação com conta pessoal e sessões, seguindo o Orbis.
- Hono e oRPC, sessão, verificação de origem, `/health` e `/ready`.
- Shell responsivo com identidade escura escolhida e componentes acessíveis.
- Prova BlockNote: blocos iniciais, atalhos Markdown, tema, seleção, persistência JSON e exportação/importação.
- Caminho mínimo de documento no módulo workspace para exercitar salvamento, versão e reenvio.

## Contrato inicial

- `auth.login`, `auth.session`, `auth.logout`, troca de senha, listagem/revogação de sessões e recuperação pelo terminal.
- Documento de prova com ID, título, conteúdo, versão do formato e versão de edição.
- Escrita de documento exige sessão, `requestId` e `expectedVersion`.
- Reenvio idêntico devolve a confirmação anterior. Mesmo ID com outro conteúdo é recusado. Versão obsoleta produz conflito sem alterar o banco.
- Rotas iniciais: `/login`, `/`, `/documentos/:id` e `/perfil`.
- Configuração prevista: `DATABASE_PATH`, `OWNER_PASSWORD`, `OWNER_NAME`, `APP_ORIGIN`, `PORT`, `HOST`, `COOKIE_SECURE` e `WEB_DIR`. Resolver caminhos de forma determinística e documentar onde o banco foi aberto.
- A API diferencia falha de validação, sessão expirada, conflito e falha interna, sem expor detalhes internos ao usuário.

## Banco

Migrações iniciais de core e auth adaptadas para SQLite, mais a tabela mínima de documentos. JSON, timestamps, booleanos e IDs precisam de serialização explícita. Aplicar migrações antes de atender requisições; não alterar arquivo de migração já aplicada.

## Critérios de pronto

- [x] Instalação reproduzível, versões fixadas e comandos documentados.
- [x] Banco criado automaticamente no caminho de desenvolvimento; arquivos de teste independentes.
- [x] Migração reaplicada é inofensiva e alteração de checksum é recusada.
- [x] Confirmar versão do SQLite incluída pelo driver e compatibilidade com o Node escolhido.
- [x] Rollback, contenção de escrita e foreign keys verificados em SQLite real.
- [x] Login correto/incorreto, limite de tentativas, renovação, expiração, logout e troca/redefinição de senha verificados.
- [x] Operações de conteúdo recusam chamada sem sessão e escrita de origem inválida.
- [x] Documento salvo permanece após reinício e abre em outra sessão.
- [x] Reenvio após resposta perdida não cria nova revisão; versão antiga gera conflito.
- [x] Editor validado no desktop e celular, inclusive seleção, teclado e tema.
- [x] Limite de documento definido com exemplos e testado nas duas fronteiras.
- [x] Conversão Markdown validada; base de seleção/âncora para tarefas demonstrada.
- [x] Recomendação final de editor registrada após a prova.

## Organização da entrega

1. `chore(repo): bootstrap workspace and checks` — ferramentas, pacotes, documentação dos comandos.
2. `feat(core): add SQLite persistence` — migrações, transações e base de escritas idempotentes.
3. `feat(auth): add owner sessions` — conta, cookie, servidor e login.
4. `feat(web): add dark shell and editor proof` — shell, prova do editor e cenário persistido.

A prova confirmou BlockNote. Recuperação de rascunhos, autosave e conflitos foram implementados na etapa02. A validação de celular usa emulação do Google Chrome; dispositivos físicos e HTTPS público dependem da implantação externa.
