# Tinyfold — Processo

O planejamento segue o formato do Orbis: produto, arquitetura, stack, identidade visual, decisões e um plano por etapa. A documentação e a interface usam português brasileiro; código, commits e PRs usam inglês.

## Entregas

1. Detalhar escopo, casos de uso, banco e critérios da etapa antes de implementá-la.
2. Implementar em entregas pequenas que funcionem e possam ser revisadas.
3. Validar regras, persistência e fluxos de interface pertinentes.
4. Atualizar documentação e registrar mudanças de decisão.
5. Marcar conclusão somente com os critérios atendidos.

Quando houver remoto, propor uma branch e PR por entrega, Conventional Commits e integração com CI verde, como no Orbis. O repositório ainda não tem remoto nem CI remoto configurado; a implantação Railway está documentada separadamente.

## Verificação

- `check`: formatação/lint, tipos, limites de dependência e testes unitários relevantes.
- `test:db`: testes contra SQLite real em arquivos temporários isolados.
- `build` seguido de `e2e`: fluxos em desktop e celular, com capturas para revisão visual.
- Conferir teclado, foco, toque, estados vazios, carregamento e erros nas telas alteradas.
- Para persistência: reinício, resposta perdida e reenvio, sessão vencida e conflito entre duas sessões.
- Para implantação: volume persistente e restauração de backup em destino separado.

### E2E da etapa 12

Os specs importam `test` de `e2e/fixtures.ts`. Cada worker tem processo Node, conta, porta disponível e arquivo SQLite próprios. O processo recebe SIGTERM e encerra antes de apagar seu diretório temporário; uma falha na inicialização não permite usar outro serviço que esteja na porta. Não há servidor de desenvolvimento reutilizado, e `E2E_PORT` deixou de ser necessário.

`test` ativa automaticamente a fixture `project`, que usa a API pública tipada e abre um projeto novo antes de cada cenário. `isolatedTest` serve aos casos que controlam sua preparação, como o exemplo (`sample: true`). `signIn` só autentica; a sessão independente continua disponível para os conflitos. Cookies só são reutilizados na mesma origem. O exemplo usa o mesmo ciclo de encerramento do servidor.

Os helpers comuns ficam em `e2e/support/`:

- `document.ts`: `createSavedDocument` cria pela interface; `writeAndSave` preenche o editor e `typeAndSave` digita parágrafos com Enter real. A espera de resposta começa antes da edição, confere o texto no payload e depois espera “Salvo”. Cada cenário continua responsável por foco e seleção.
- `builders.ts`: cria projetos, pastas, documentos, desenhos e tarefas pela API pública, com entradas tipadas e um `requestId` novo por criação. A pasta devolve o ID diretamente; os demais devolvem a resposta RPC.
- `network.ts`: aborta, segura ou atrasa uma chamada, fornece uma resposta deliberada ou perde a primeira resposta depois de confirmar a gravação real. `restore` remove só o handler instalado; uma chamada segurada pode ser liberada explicitamente e também é liberada ao fechar a página. Os testes conferem o payload e a chave de reenvio.
- `keyboard.ts`: `appShortcut` segue a plataforma que o aplicativo vê; `hostShortcut`, `hostKey` e `editorUndo` seguem o sistema real do browser. Essa diferença importa quando o Chrome no macOS emula Windows ou Android.

São quatro workers para arquivos distintos; os testes de cada arquivo continuam sequenciais. Colunas e fuso pertencem à instalação: os testes que os alteram continuam restaurando o estado. Casos de teclado, digitação e ausência de salvamento marcados com `@timing` rodam no projeto `chrome-desktop-timing`, em um worker, depois dos projetos comuns. Para rodar só esse grupo: `mise exec -- pnpm e2e --project=chrome-desktop-timing --no-deps`.

O workflow `.github/workflows/ci.yml` prepara dois runners com a matriz `shard: [1, 2]`. Cada um instala as versões fixadas, constrói o próprio bundle e executa:

```sh
pnpm e2e --project=chrome-desktop --project=chrome-mobile --shard=1/2 --reporter=list,blob
# No segundo runner: --shard=2/2.
```

O sharding distribui arquivos, mantendo cada arquivo sequencial. Depois dos dois shards, um job separado executa `chrome-desktop-timing --no-deps` uma única vez, em um worker. Os três blobs são publicados por 14 dias e reunidos por `playwright merge-reports --reporter=html`; o relatório também é gerado quando os testes falham. A divisão segue o [sharding do Playwright](https://playwright.dev/docs/test-sharding), e `--no-deps` evita repetir os projetos comuns. Sem remoto configurado, a execução hospedada ainda não ocorreu; a divisão e a união dos relatórios são verificáveis localmente.

Arquivos exclusivos do desktop usam `.desktop.spec.ts`, e os exclusivos do celular podem usar `.mobile.spec.ts`. Num arquivo misto, o caso recebe `@desktop` ou `@mobile`. A configuração seleciona o dispositivo antes da execução, sem registrar como pulados os casos que não se aplicam. `e2e:smoke` seleciona os oito cenários de captura, Markdown, tarefas e recuperação offline, nos dois dispositivos. A lista completa continua verificável com `mise exec -- pnpm e2e --list`.

A validação manual usa o Chrome do Content Viewer dentro do Herdr.app, com uma instalação temporária separada. O guia pessoal e os comandos estão em `/Users/standard/.agent-switch/docs/herdr-workspace.md`; não confundir esse browser com as sessões automáticas do Playwright.

`support/pace.ts` nomeia os intervalos reais que exercitam o ritmo de digitação e a deriva do Chrome. Testes de ausência de salvamento podem usar `controlledClock`; editores e interações sensíveis ao tempo continuam no relógio real. Os specs estão agrupados por área.

`e2e:visual` é separado da suíte funcional: captura dez cenas em desktop e Pixel 7, nos temas claro e escuro. As referências pertencem à máquina e ficam fora do Git. Use `VISUAL_BASELINE_DIR=/caminho/absoluto mise exec -- pnpm e2e:visual`; para criar a referência do commit-base, acrescente `--update-snapshots`. Nunca atualize referências para esconder uma diferença: confira as imagens e registre a mudança aprovada. A suíte visual fixa o mesmo instante no navegador, seed e servidor, mantendo os timers reais, e espera fontes, animações e o posicionamento do popover. A comparação recusa qualquer pixel acima do limiar de cor 0,05; pequenas variações de antialiasing abaixo dele não significam identidade binária.

O runner recusa um bundle anterior às fontes da web e dos domínios compartilhados; execute `build` antes de E2E. Testes de banco usam fixtures temporárias compartilhadas, com fechamento de conexões e restauração sempre em outro arquivo.

Os comandos existem e foram executados localmente; veja `docs/validacao.md`. A implementação inicial usou subagentes e revisão cruzada. O fechamento da etapa 12 seguiu o processo abreviado aprovado: commits por assunto, `check` por commit de código, `test:db` nas mudanças de backend e revisão integrada, com build e E2E completos por lote. Não houve delegação nesta retomada.
