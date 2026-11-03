# Desenhos

`DrawingsModule` controla cenas, títulos, versões, ciclo de vida, prévias PNG e localização persistida. Escreve somente `workspace_canvases` e `workspace_canvas_previews`. Fatos de projetos e pastas chegam por uma porta vinculada à mesma transação.

`commands` oferece `create`, `save`, `trash`, `restore`, `storePreview` e `purge`; `queries`, `list`, `get`, `previewImage` e `readForAgent`. As prévias usam a porta de descompressão `PngImageData`; a cena é validada sem importar o runtime do Excalidraw.

## Entradas e composição

`#drawings` expõe a classe; `#drawings/domain` contém regras puras; `#drawings/contracts` reúne schemas, tipos e eventos; `#drawings/composition` disponibiliza os participantes e operações para o servidor. Essas entradas exatas ficam no `package.json` da raiz. Outros módulos de negócio recebem portas locais ligadas pela composição.

`DrawingsModule` estende a classe gerada por uma definição privada `defineModule`, de `#core/application`. A definição associa comandos, consultas e assinatura de eventos ao estado de cada instância; somente a infraestrutura do próprio módulo acessa esse estado. Dependências e TypeScript são configurados na raiz.

Os participantes usam o escopo transacional recebido, não abrem outra escrita e não podem ser reutilizados depois dele. Os nomes externos `workspace.*` e o histórico de migrações permanecem. Eventos são notificações tipadas após commit, locais ao processo, sem replay durável; rollback e retentativa idempotente não notificam novamente. Detalhes em [arquitetura](../../docs/arquitetura.md).

## Cena e ciclo de vida

- Desenhos têm cena JSON própria, até 1 MiB e 5.000 elementos vetoriais. Busca deriva do título e do texto ativo. Formas, setas vinculadas, quadros, texto e traço livre são validados; imagens e conteúdo incorporado são recusados.
- Criar, salvar, excluir e restaurar desenho devolvem somente ID, versão e data. Leitura autenticada inclui cenas na lixeira para recuperação de rascunhos; salvar desenho excluído é recusado.
- A compactação preserva elementos ativos e excluídos referenciados transitivamente; somente os demais são removidos da cena persistida. O histórico de desfazer permanece no editor.

## Prévias de desenho

O navegador gera uma prévia PNG depois de salvar e a envia por `workspace.saveCanvasPreview({ id, version, sceneFingerprint, png })`, com `png` como arquivo. A gravação não usa o registro de pedidos (`writeWithoutRequestRecord`) e não muda a versão, as datas nem a revisão do quadro: repetir o envio da mesma versão é seguro.

- `readPngInfo` só aceita um PNG bem formado e só com os blocos que o codificador do navegador escreve: CRC de cada bloco, IHDR válido, `PLTE` e blocos auxiliares (`tRNS`, `sRGB`, `gAMA`, `cHRM`, `pHYs`) antes dos dados, blocos `IDAT` seguidos e IEND no fim, sem bytes depois. A paleta tem entradas inteiras, de 1 até as que a profundidade de bits indexa (no máximo 256). Os dados de imagem precisam descomprimir exatamente no tamanho que o IHDR pede (`infra/png-image-data.ts`, com limite de saída), e cada linha de cada passada começa com um dos cinco tipos de filtro. A prévia tem até 1.568 px no lado maior e 256 KiB.
- Versão futura, PNG inválido ou acima dos limites: `VALIDATION`. Desenho inexistente ou na lixeira: `NOT_FOUND`.
- O envio pode trazer `sceneFingerprint`, a impressão digital da cena que a imagem mostra. Com ela, a prévia é aceita se for a da cena atual, qualquer que seja a versão: mover, renomear ou passar pela lixeira sobem a versão sem mudar a cena, e a prévia que ainda estava sendo gerada continua valendo. Sem ela, só a versão atual é aceita. Uma prévia de outra cena, ou de versão mais antiga que a prévia guardada, devolve `{ stored: false, previewVersion }` sem erro.
- A prévia guarda a impressão digital da cena (`sceneFingerprint`). Renomear, mover ou passar pela lixeira muda a versão, mas não a cena, então a prévia continua atual. Prévias anteriores à migração 004 comparam a versão.
- O servidor serve a prévia de um desenho fora da lixeira em `GET /arquivos/desenhos/:id/previa.png` (`createWorkspace(db).files.canvasPreview`, ligado a `DrawingsModule.queries.previewImage`), para as figuras dos documentos: exige o cookie de sessão, como o `/rpc`, sem conferir a origem e sem aceitar o *bearer* do MCP; responde `image/png` com `ETag` da impressão digital da cena (ou da versão, numa prévia anterior à 004), `Cache-Control: private, no-cache` e `nosniff`, e 304 com `If-None-Match`. Desenho na lixeira, excluído, inexistente ou sem prévia dá 404, e um ID que não é UUID, 400.
- `getCanvas` devolve `previewVersion`, `null` sem prévia, e `previewCurrent`. A tabela `workspace_canvas_previews` apaga a prévia junto com o desenho.

## Eventos e verificação

O catálogo inclui `drawing.created`, `drawing.saved`, `drawing.trashed`, `drawing.restored`, `drawing.purged`, `drawing.placementChanged` e `drawing.previewStored`. Localização distingue projeto, pasta e pin. Uma prévia obsoleta ignorada não produz `previewStored`; eventos não transportam cena ou PNG.

O domínio tem testes junto das regras de cena, PNG, estrutura e fingerprint. `src/server/drawings-module.db.test.ts` cobre a classe; `src/server/workspace-tests/application/` conserva as regressões de persistência e prévias, e `src/server/modules-integration.db.test.ts` cobre fluxos com outros donos. Os resultados executados ficam em [validação](../../docs/validacao.md).
