# Tinyfold — Validação local

Validação local em 29 de outubro de 2026. A aplicação foi implementada com três subagentes — backend, workspace e interface — e duas rodadas de revisão cruzada. Nenhuma publicação na nuvem foi realizada.

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

Imagens no canvas, colaboração simultânea e validação em aparelhos físicos continuam fora deste recorte. Os testes não substituem publicação ou verificação de infraestrutura externa.

## Verificações da versão inicial

| Verificação | Resultado |
| --- | --- |
| `pnpm check` | Biome, TypeScript de todos os pacotes, fronteiras de dependência e 29 testes unitários aprovados |
| `pnpm test:db` | 27 testes aprovados, em 5 arquivos, com SQLite temporário real |
| `pnpm build` | SPA de produção compilada, editor carregado sob demanda |
| `pnpm e2e` | 18 testes aprovados em Google Chrome: 9 desktop e 9 emulação Pixel7 |
| Regressão após ajuste de título | 8 testes de `app.spec.ts` aprovados novamente nos dois perfis, incluindo ausência de corte/rolagem no título |
| `docker build -t tinyfold:local .` | Instalação com lockfile e compilação em Linux aprovadas |
| Smoke de Docker | Login, escrita, reinício, recriação do container e preservação de sessão/dados aprovados |
| Backup/restauração | Snapshot com servidor ativo, restauração independente e integrity_check aprovados; substituição de destino recusada |

O build informa chunks acima de 500 kB. O editor foi separado em importação dinâmica; esse aviso continua, especialmente pelo conjunto de dependências de edição, e não impede o build.

## Fluxos da versão inicial no Chrome

Os E2E usam a interface e API reais, com banco isolado. Os mesmos nove cenários foram executados nos dois perfis:

1. Criar documento sem projeto, escrever, recarregar, buscar pelo conteúdo e conferir o Markdown exportado.
2. Importar Markdown com título, negrito, link, checklist e código; recarregar e preservar o documento anterior.
3. Criar projeto e tarefa, mover pelo menu e concluir.
4. Editar sem conexão, recarregar após reconectar e recuperar o texto.
5. Editar em duas sessões, detectar conflito e guardar a segunda versão como cópia.
6. Converter seleção em tarefa, excluir o documento para a lixeira e restaurar sua origem.
7. Interromper a resposta após o servidor gravar a tarefa e repetir sem duplicação.
8. Duplicar a identidade de uma aba, escrever rascunhos diferentes e preservar cada um após recarga.
9. Alterar o trecho de origem e atualizar o estado da tarefa sem sair do documento.

Também foi feita interação manual com a janela do **Google Chrome**: login, tela inicial, criação de documento, digitação, atalho Markdown de título, seleção, criação de tarefa vinculada e movimentação no Kanban. Desktop e mobile foram inspecionados visualmente pelas capturas; mobile é emulação, não um aparelho físico.

## Design e usabilidade

A revisão confirmou a paleta grafite/cinza frio/azul, ação principal de escrever, projeto opcional e navegação curta. O editor concentra a área útil no texto. O Kanban mantém as três colunas e oferece menu como alternativa ao arrastar; no celular a rolagem ocorre dentro do quadro, sem alargar a página.

A captura mobile identificou título longo cortado no editor. A correção permite quebra visual e altura automática no campo de título, mantendo o valor textual em uma linha. O teste de captura verifica que o campo inteiro cabe sem rolagem interna.

| Tela | Desktop | Celular |
| --- | --- | --- |
| Início | [Captura](screens/inicio-desktop.png) | [Captura](screens/inicio-mobile.png) |
| Documento | [Captura](screens/editor-desktop.png) | [Captura](screens/editor-mobile.png) |
| Kanban | [Captura](screens/kanban-desktop.png) | [Captura](screens/kanban-mobile.png) |

## Rodadas adversariais

Os detalhes, reproduções e limites estão em [revisão de backend](revisao-backend.md) e [revisão de workspace](revisao-workspace.md).

A primeira rodada confrontou a validação do servidor com o parser real do editor e examinou persistência, sessão e recuperação de rascunhos. Foram corrigidos documentos inválidos que não reabriam, pedidos recuperados com outro documento como destino, seleção entre blocos e origens de tarefas desatualizadas.

A segunda rodada exercitou falhas no navegador. A perda de rascunho em aba duplicada foi reproduzida contra o bundle anterior; o mesmo teste passou após separar a identidade de cada escritor. Conflitos preservaram ambas as versões, e resposta perdida não gerou tarefa duplicada. A revisão também passou a preservar conteúdo acima do limite do servidor para exportação e recuperação, com limites próprios e validação estrutural.

## Operação e limites

O smoke criou recursos exclusivos e temporários. Após reiniciar e recriar o container nos mesmos volumes, sessão, documentos e tarefas permaneceram. Original, snapshot e restauração retornaram `integrity_check=ok`; escritas posteriores no original não alteraram a restauração. Os recursos do teste foram removidos.

A imagem foi reconstruída após o último ajuste de interface: `tinyfold:local`, digest `sha256:aafca02623d87582522319163a12a2f80efe4d5827af34eac43a0dd500811633`. Um novo container temporário dessa imagem respondeu em `/ready` e serviu a SPA compilada; ele também foi removido ao fim.

- Hospedagem, domínio, TLS/proxy real e backups externos agendados ainda não foram configurados.
- Acesso de dois aparelhos físicos na origem pública permanece pendente.
- Não foi realizada auditoria formal de acessibilidade nem teste de carga.
- A recuperação local depende do armazenamento do navegador; não é sincronização offline completa.
- A exportação Markdown pode perder atributos internos e não inclui projetos, tarefas ou sessões.
- CI foi configurado, mas não executado em um remoto GitHub.

Os arquivos de teste, bancos, senhas locais e traces ficam fora do Git. As capturas versionadas contêm somente dados fictícios dos testes.
