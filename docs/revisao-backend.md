# Tinyfold — Revisões adversariais de persistência e integração

**Data:** 29 de outubro de 2026. **Estado:** duas rodadas concluídas no ambiente local; os achados confirmados abaixo foram corrigidos e verificados novamente.

**Como ler no código atual:** este é um registro histórico, com os comandos executados naquela data. A [etapa 14](etapas/14-definicoes.md) centraliza dependências e TypeScript na raiz: para uma nova verificação, use `mise exec -- pnpm typecheck`, sem filtros de pacote, e entradas como `#core/testing`. `defineModule`/`defineApplication`/`defineProject` tratam da composição; o registro SQLite usa `defineMigrationModule`. As verificações da etapa 14 serão registradas separadamente quando executadas.

## Método

- Revisão independente dos módulos `workspace`, autenticação, transporte e controlador de salvamento.
- Testes de banco em arquivos SQLite temporários, incluindo duas conexões, rollback, reenvio e restauração de snapshot.
- Comparação da validação de documentos com o runtime instalado do BlockNote.
- Reprodução de recuperação de rascunhos com chamadas controladas ao `AutosaveController`.
- Testes de navegador com Google Chrome, pelo canal `chrome` do Playwright, nos perfis desktop e celular. Os testes usam banco e senha de teste separados do ambiente de desenvolvimento.

## Rodada 1

| Achado confirmado | Efeito | Correção e verificação |
| --- | --- | --- |
| Links aninhados e links dentro de blocos de código passavam pela validação de conteúdo | O BlockNote recusava o documento salvo ao tentar abri-lo | O domínio passou a rejeitar essas estruturas. O teste independente com `BlockNoteEditor.create` confirmou a recusa pela API e a aceitação de exemplos válidos pelo editor |
| A validação de rascunho local verificava somente se `content` era um array | Um rascunho como `content: [123]` podia chegar à inicialização do editor | A recuperação agora usa o validador compartilhado de conteúdo. O exemplo inválido passou a retornar `null` em `parseDraft` |
| Um pedido pendente recuperado podia ter um ID de documento diferente do editor aberto | A reprodução chamava o envio primeiro para `other-document` e depois para `current-document` | A identidade do pedido é conferida antes do reenvio. Após a correção, a mesma reprodução enviou apenas para `current-document` |
| Uma seleção com vários blocos usava sempre o primeiro bloco como âncora | O servidor recusava o trecho completo como se ele tivesse sido alterado | Seleções com vários blocos usam a origem no documento; uma seleção em um bloco mantém sua âncora |
| Salvar um documento não atualizava a consulta das tarefas vinculadas | A indicação de trecho removido podia continuar desatualizada no painel aberto | O salvamento invalida também as consultas de tarefas. A rodada 2 confirmou o comportamento no navegador |

Na infraestrutura, a execução de migrações foi ajustada para usar scripts SQLite completos dentro da transação. O teste inclui um literal com ponto e vírgula, que não pode ser tratado como separador de instruções. A leitura e a renovação da sessão também passaram a ocorrer em uma única transação.

Verificações de backend: **15 testes aprovados**, além do typecheck dos pacotes `core`, `auth` e `server`. Eles cobrem repetição simultânea de pedidos, rollback, checksum de migração, contenção e recuperação de escrita, snapshot, hashes, expiração e revogação de sessões, limite de login, proteção de todos os procedimentos RPC, origem, limite de corpo e fallback da SPA.

## Rodada 2 — Rascunho em aba duplicada

A reprodução usou duas páginas do mesmo contexto do Google Chrome, compartilhando cookies e `localStorage`. O `sessionStorage` da primeira foi copiado para a segunda antes de iniciar o aplicativo, reproduzindo a condição relevante de duplicação de aba.

1. Criar e salvar um documento na primeira aba.
2. Abrir a segunda aba com a mesma identidade de sessão do navegador.
3. Interromper apenas os pedidos de salvamento da segunda aba e escrever um rascunho nela.
4. Alterar e salvar o documento na primeira aba.
5. Recarregar a segunda aba.

**Antes da correção:** o teste falhou. Esperava encontrar `Rascunho exclusivo da aba duplicada.`, mas o editor mostrava `Versao confirmada na aba original.`. As abas escreviam no mesmo registro de recuperação, e o salvamento da primeira removia o rascunho da segunda.

**Correção:** cada página passa a escrever em um registro local com identificador aleatório próprio. Um ponteiro no `sessionStorage` indica de onde recuperar a edição após recarga. Ao herdar esse ponteiro em uma aba duplicada, o novo editor lê o rascunho anterior, mas escreve e remove somente seu próprio registro. O controlador é reutilizado ao sair e voltar ao mesmo documento dentro da página.

**Depois da correção:** o aplicativo foi reconstruído e o mesmo teste passou no Google Chrome desktop e no perfil de celular. O rascunho da segunda aba permaneceu disponível após a recarga, enquanto a primeira manteve seu conteúdo confirmado.

## Rodada 2 — Atualização da origem de tarefa

O segundo teste cria uma tarefa a partir de texto, altera esse texto e abre o detalhe da tarefa sem sair do documento. Ele confirma que o trecho capturado permanece e que a interface informa: `O trecho original foi removido. Você ainda pode abrir o documento.`

Os dois cenários da rodada 2 passaram nos dois perfis: **4 testes de navegador aprovados**. O teste permanente está em [e2e/draft-isolation.spec.ts](../e2e/draft-isolation.spec.ts).

## Comandos executados

```sh
mise exec -- pnpm --filter @tinyfold/core --filter @tinyfold/auth --filter @tinyfold/server typecheck
mise exec -- pnpm exec vitest run src/core/infra/core.db.test.ts src/auth/application/auth.db.test.ts src/server/server.db.test.ts
mise exec -- pnpm build
mise exec -- pnpm exec playwright test e2e/draft-isolation.spec.ts --output=test-results-round2
```

O teste de aba duplicada também foi executado antes da reconstrução, contra o bundle anterior, para registrar a falha original. As capturas da execução corrigida ficam em `test-results-round2/`. A execução final da suíte completa é registrada separadamente na documentação geral do projeto.

## Limites da verificação

Essas rodadas validam os cenários descritos; a infraestrutura de produção não foi implantada por esta revisão. O aplicativo usa uma instância de servidor e SQLite central. A recuperação local protege rascunhos, enquanto conflitos entre versões continuam exigindo a escolha explícita de carregar a versão salva ou guardar uma cópia.

## Smoke operacional da imagem Docker

**Resultado:** aprovado. Imagem testada: `tinyfold:local`, ID `sha256:11d7bcc2f2cd0ae893c2a2cb248f4d07fcd2b8d73ce15c32ef956ef4e6f05320`.

O teste criou um container e dois volumes temporários, todos identificados pela mesma etiqueta exclusiva `tinyfold.smoke`. A porta foi publicada somente em `127.0.0.1:5182`. Usou `NODE_ENV=test`, origem HTTP local e senha aleatória exclusiva; o banco e os containers de desenvolvimento permaneceram fora desse teste.

| Verificação | Resultado observado |
| --- | --- |
| Inicialização em volumes vazios | Migrações e conta criadas; `/ready` respondeu; SPA servida como HTML |
| Login e sessão por RPC | Conta do teste autenticada e sessão válida |
| Escrita de projeto, documento e tarefa vinculada | Documento atualizado para versão 2 e tarefa criada com referência à origem |
| `docker restart` | Mesma sessão, documento na versão 2 e tarefa preservados |
| `pnpm backup:create /backups/smoke.sqlite` | Snapshot criado e verificado com o servidor em execução |
| `pnpm backup:restore /backups/smoke.sqlite /backups/restored.sqlite` | Restauração em arquivo separado, sem substituir o banco em uso |
| Integridade do original, snapshot e restaurado | `PRAGMA integrity_check` retornou `ok` nas três bases; cada cópia tinha um documento na versão 2 e uma tarefa |
| Tentativa de restaurar sobre destino existente | Comando recusado, com saída diferente de zero |
| Independência da restauração | Após criar mais um documento no banco ativo, ele tinha dois documentos e a cópia restaurada continuava com um |
| Remoção e recriação do container com os mesmos volumes | Sessão, dois documentos e uma tarefa permaneceram; outro valor de senha inicial não substituiu a conta existente |
| Limpeza | Container e os dois volumes do teste removidos; consultas pela etiqueta exclusiva retornaram vazias |

Comandos equivalentes usados pelo roteiro, com nomes e senha temporários gerados para essa execução:

```sh
docker volume create --label tinyfold.smoke="$run_id" "$data_volume"
docker volume create --label tinyfold.smoke="$run_id" "$backup_volume"
docker run --detach --name "$container" --label tinyfold.smoke="$run_id" \
  --publish 127.0.0.1:5182:3370 \
  --mount "type=volume,src=$data_volume,dst=/data" \
  --mount "type=volume,src=$backup_volume,dst=/backups" \
  --env NODE_ENV=test --env APP_ORIGIN=http://127.0.0.1:5182 \
  --env "OWNER_PASSWORD=$temporary_password" --env COOKIE_SECURE=false tinyfold:local
docker restart --time 10 "$container"
docker exec "$container" pnpm backup:create /backups/smoke.sqlite
docker exec "$container" pnpm backup:restore /backups/smoke.sqlite /backups/restored.sqlite
```

As consultas RPC foram feitas por HTTP com o cookie recebido no login. A integridade e as contagens foram conferidas dentro do container com `better-sqlite3`, abrindo os arquivos somente para leitura. A recriação repetiu o `docker run` com os mesmos volumes, e a limpeza removeu apenas os nomes gerados pelo roteiro, sem comandos de limpeza global do Docker.

Essa imagem antecede as últimas alterações de carregamento da interface e hidratação de rascunhos. O smoke valida sua operação e persistência; a imagem final deve ser reconstruída a partir do código entregue. TLS e o proxy de uma hospedagem real não fazem parte desse teste local.
