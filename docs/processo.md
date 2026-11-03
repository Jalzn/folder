# Tinyfold — Processo

O planejamento segue o formato do Orbis: produto, arquitetura, stack, identidade visual, decisões e um plano por etapa. A documentação e a interface usam português brasileiro; código, commits e PRs usam inglês.

## Entregas

1. Detalhar escopo, casos de uso, banco e critérios da etapa antes de implementá-la.
2. Implementar em entregas pequenas que funcionem e possam ser revisadas.
3. Validar regras, persistência e fluxos de interface pertinentes.
4. Atualizar documentação e registrar mudanças de decisão.
5. Marcar conclusão somente com os critérios atendidos.

Quando houver remoto, propor uma branch e PR por entrega, Conventional Commits e integração com CI verde, como no Orbis. Conta do GitHub, remoto, proteção de branch e implantação ainda não foram configurados.

## Verificação

- `check`: formatação/lint, tipos, limites de dependência e testes unitários relevantes.
- `test:db`: testes contra SQLite real em arquivos temporários isolados.
- `build` seguido de `e2e`: fluxos em desktop e celular, com capturas para revisão visual.
- Conferir teclado, foco, toque, estados vazios, carregamento e erros nas telas alteradas.
- Para persistência: reinício, resposta perdida e reenvio, sessão vencida e conflito entre duas sessões.
- Para implantação: volume persistente e restauração de backup em destino separado.

### E2E da etapa 12

Os specs importam `test` de `e2e/fixtures.ts`. Cada worker tem processo Node, conta, porta disponível e arquivo SQLite próprios. O processo recebe SIGTERM e encerra antes de apagar seu diretório temporário; uma falha na inicialização não permite usar outro serviço que esteja na porta. Não há servidor de desenvolvimento reutilizado, e `E2E_PORT` deixou de ser necessário.

`signIn` autentica sem criar projetos; `login` abre um projeto novo para cada cenário, preservando as entradas pela interface. As fixtures `api` e `project` oferecem o cliente RPC tipado e um projeto criado pela API. O login independente continua criando outra sessão da mesma conta para os cenários de conflito. Cookies só são reutilizados na mesma origem. O exemplo usa a opção `sample` da fixture e o mesmo ciclo de encerramento.

Os helpers comuns ficam em `e2e/support/`:

- `document.ts`: `createSavedDocument` cria pela interface; `writeAndSave` preenche o editor e `typeAndSave` digita parágrafos com Enter real. A espera de resposta começa antes da edição, confere o texto no payload e depois espera “Salvo”. Cada cenário continua responsável por foco e seleção.
- `builders.ts`: cria projetos, pastas, documentos, desenhos e tarefas pela API pública, com entradas tipadas e um `requestId` novo por criação. A pasta devolve o ID diretamente; os demais devolvem a resposta RPC.
- `network.ts`: aborta, segura ou atrasa uma chamada, fornece uma resposta deliberada ou perde a primeira resposta depois de confirmar a gravação real. `restore` remove só o handler instalado; uma chamada segurada pode ser liberada explicitamente e também é liberada ao fechar a página. Os testes conferem o payload e a chave de reenvio.
- `keyboard.ts`: `appShortcut` segue a plataforma que o aplicativo vê; `hostShortcut`, `hostKey` e `editorUndo` seguem o sistema real do browser. Essa diferença importa quando o Chrome no macOS emula Windows ou Android.

São quatro workers para arquivos distintos; os testes de cada arquivo continuam sequenciais. Colunas e fuso pertencem à instalação: os testes que os alteram continuam restaurando o estado. Casos de teclado, digitação e ausência de salvamento marcados com `@timing` rodam no projeto `chrome-desktop-timing`, em um worker, depois dos projetos comuns. Para rodar só esse grupo: `mise exec -- pnpm e2e --project=chrome-desktop-timing --no-deps`.

Arquivos exclusivos do desktop usam `.desktop.spec.ts`, e os exclusivos do celular podem usar `.mobile.spec.ts`. Num arquivo misto, o caso recebe `@desktop` ou `@mobile`. A configuração seleciona o dispositivo antes da execução, sem registrar como pulados os casos que não se aplicam. `e2e:smoke` seleciona os oito cenários de captura, Markdown, tarefas e recuperação offline, nos dois dispositivos. A lista completa continua verificável com `mise exec -- pnpm e2e --list`.

A validação manual usa o Chrome do Content Viewer dentro do Herdr.app, com uma instalação temporária separada. O guia pessoal e os comandos estão em `/Users/standard/.agent-switch/docs/herdr-workspace.md`; não confundir esse browser com as sessões automáticas do Playwright.

Os comandos existem e foram executados localmente; veja `docs/validacao.md`. A implementação usou três subagentes responsáveis por backend, workspace e web, com revisão cruzada e duas rodadas adversariais. Cada falha confirmada recebeu correção e nova verificação.
