# Tinyfold — Revisões adversariais de conteúdo e integração

**Data:** 29 de outubro de 2026. **Escopo:** módulo workspace, revisão independente da base de autenticação/persistência e fluxos adversariais no Google Chrome.

## Rodada 1 — Persistência e formato do editor

Implementação do workspace revisada por outro subagente. A revisão também confrontou entradas aceitas pelo servidor com o parser real do BlockNote instalado.

| Achado | Correção | Verificação |
| --- | --- | --- |
| Propriedades e estilos malformados podiam chegar ao editor após salvar, incluindo estilos que o BlockNote não conhece. | Validar tipos e propriedades dos blocos, estilos conhecidos, cores, alinhamento e nível dos títulos. | Casos de regressão em `src/workspace/domain/document.test.ts` e reprodução com BlockNote real. |
| Link dentro de outro link era aceito pelo servidor, mas impedia o BlockNote de reabrir o conteúdo. | Conteúdo de link aceita texto simples ou trechos de texto, sem links internos. | Regressão automatizada e repetição da reprodução no parser real. |
| Link dentro de bloco de código também podia impedir a reabertura. | Bloco de código aceita conteúdo textual, sem link. | Regressão automatizada e repetição no parser real. |
| O limite por quantidade de caracteres permitiria ultrapassar o tamanho previsto com Unicode. | Limite medido em bytes UTF-8, junto com limites de quantidade e profundidade dos blocos. | Casos com texto ASCII, emojis e estruturas profundas. |

Resultado do comando `mise exec -- pnpm exec vitest run src/workspace`: **30 testes aprovados**, distribuídos entre formato de documento e persistência SQLite. Typecheck do pacote e Biome também passaram.

Os testes com banco real verificam:

- Documento sem projeto, edição e reabertura após encerrar e recriar a conexão.
- Reenvio do mesmo salvamento sem revisão extra; reutilização de identificador com outro conteúdo recusada.
- Confirmação de salvamento compacta, sem duplicar todo o texto no registro de idempotência.
- Versão antiga recusada usando uma segunda conexão ao mesmo arquivo SQLite.
- Duas edições concorrentes da mesma versão: uma confirmação e um conflito.
- Busca com acentos e caixa, tratando `%` e `_` como caracteres literais.
- Arquivamento de projeto preservando documentos e impedindo novas associações indevidas.
- Tarefa e vínculo criados uma vez; tarefa preservada após remoção do trecho e lixeira do documento.
- Origem inexistente, trecho fabricado e versão de origem antiga recusados sem criar tarefa parcial.
- Reordenação com revisão do quadro; movimento antigo recusado sem alterar a ordem.
- Renomear/concluir tarefa sem modificar a prosa do documento.
- Distinção entre todos os projetos e itens sem projeto; exclusão de tarefa idempotente.

## Revisão independente de autenticação e núcleo

Foram executadas provocações isoladas, com arquivo SQLite temporário e scrypt real:

| Cenário | Resultado observado |
| --- | --- |
| Duas inicializações simultâneas da conta | Ambas retornaram a mesma instalação, preservando uma única conta. |
| Login iniciado com senha antiga, pausado durante a verificação, seguido de redefinição da senha | O login foi recusado com `UNAUTHENTICATED`. |
| Migração com criação de tabela seguida de instrução inválida | A tabela parcial não permaneceu no banco. |
| Escrita idempotente interrompida depois de uma alteração interna | A alteração foi revertida pela transação. |

Esses quatro cenários foram executados em um script de auditoria temporário. A suíte permanente de autenticação e núcleo é mantida nos próprios módulos.

## Rodada 2 — Google Chrome

`e2e/adversarial.spec.ts` usa o canal **chrome** do Playwright, com os perfis desktop e celular da configuração do projeto. Os testes executam a interface e a API reais sobre uma base SQLite isolada.

1. **Conflito entre duas sessões independentes.** Um salvamento do segundo navegador é retido enquanto o primeiro confirma sua edição. Ao liberar o pedido antigo, a interface mostra conflito e preserva o rascunho. Salvar como cópia e recarregar os dois documentos mantém ambos os textos.
2. **Trecho convertido em tarefa e origem recuperável.** Selecionar texto no editor, criar tarefa, mover o documento para a lixeira e consultar o Kanban preserva tarefa e trecho capturado. Restaurar o documento torna o link de origem utilizável novamente.
3. **Resposta perdida depois do commit.** O pedido de criar tarefa chega ao servidor e recebe sucesso; a resposta ao navegador é interrompida. Reenviar pela interface usa o mesmo corpo de requisição e deixa apenas uma tarefa, inclusive após recarga.

A execução integrada de `pnpm e2e` passou com **12 testes**: esses três cenários e os três fluxos principais de captura, projeto/quadro e recuperação offline, repetidos em desktop e celular. As capturas e os traces seguem os destinos configurados pelo Playwright.

## Ajustes adicionais da revisão de código

- Recuperação local usa limites próprios de até 5 MiB e 20.000 blocos para reabrir e exportar um rascunho que ultrapassou o limite de salvamento. A API continua limitada a 1 MiB e 5.000 blocos. Dois testes de regressão verificam essa separação e mantêm a mesma validação estrutural.
- Seleção que atravessa vários blocos agora usa referência ao documento, evitando validar todo o trecho somente no primeiro bloco selecionado.
- Depois de criar uma cópia do rascunho, falha ao reler o documento original não impede abrir a cópia já confirmada. Isso cobre o caso de o original ter ido para a lixeira em outro dispositivo.
- A imagem Docker recebeu `BACKUP_DIR=/backups`, alinhado ao diretório criado para o usuário do processo.

Esses ajustes foram conferidos no código. Os três testes adversariais descritos acima cobrem a seleção de um bloco e a cópia de um documento original ainda disponível; os casos específicos de seleção de vários blocos e remoção do original durante a cópia não estão individualizados nessa suíte.

## Limites atuais

- O editor suporta o conjunto inicial de blocos documentado, até 1 MiB e 5.000 blocos. Markdown não representa todos os atributos internos.
- A revisão global do quadro pode exigir atualizar uma movimentação quando outra tarefa mudou em outro dispositivo, mesmo em outro projeto.
- O rascunho local protege contra falhas de rede; sincronização offline completa e mesclagem automática não foram implementadas.
- A validação descrita ocorreu localmente. Publicação, domínio, HTTPS no provedor e destino independente de backup exigem a configuração do ambiente de produção; esta revisão não atesta uma implantação pública.
