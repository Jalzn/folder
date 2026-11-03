# Texto em blocos

Biblioteca pura do formato compartilhado por documentos e descrições de tarefas. A única entrada pública é `@tinyfold/rich-text/domain`. Não tem classe de módulo, banco, HTTP, React ou dependência de módulos de negócio; usa apenas regras puras públicas de `core/domain`.

Reúne blocos, validação estrutural, texto simples, IDs, checklist, trechos, incorporados e serialização/paginação Markdown. Os limites persistidos são 1 MiB e 5.000 blocos; a recuperação local usa limites próprios maiores sem ampliar o servidor. Documentos habilitam incorporados pela opção existente; descrições de tarefas continuam recusando-os. O chamador resolve os dados das entidades e fornece `EmbedResolver`: a biblioteca não consulta a persistência.

## Incorporados

- Um documento incorpora tarefas e desenhos por blocos do seu JSON (`taskEmbed { taskId }` e `drawingEmbed { canvasId }`, `domain/embeds.ts`), resolvidos a cada leitura, sem chave estrangeira nem índice reverso: lixeira, exclusão definitiva e mudança de projeto ou pasta aparecem na próxima resolução. `readDocumentContent(conteúdo, limites, { embeds: true })`, que só o documento passa (`documentContent`; a descrição usa `descriptionContent`), aceita os dois blocos com só a sua propriedade, um UUID em minúsculas (como os IDs são gravados; o SQLite compara texto, e outra grafia resolveria como inexistente), sem `content` e com `children` vazio, até 200 por documento ("Um documento aceita até 200 itens incorporados."). Sem a opção, recusa com "A descrição não aceita itens incorporados.".
- O texto do documento, o lead e `excerptPresent` ignoram os incorporados, então a busca e o trecho não mudam. `embedIds` lista os IDs uma vez cada, na ordem de leitura; `figureNumbers` numera os desenhos por bloco, contando também os indisponíveis; `excerptEnd` dá o fim de um trecho no texto de um bloco, com os espaços colapsados como em `excerptPresent`.
- `documentToMarkdown(blocos, { embeds })` escreve cada incorporado numa linha com um link, `[Tarefa: <título> (<coluna>)](<destino>)` ou `[Desenho: <título>](<destino>)`, com o rótulo sem caracteres escondidos, numa linha e escapado como texto de link. O destino vem do `EmbedResolver` (`tinyfold:task/<id>` no MCP, o endereço do item num arquivo); `embedResolver(itens, href)`, do domínio de workspace, monta-o a partir da resposta de `resolveEmbeds`, e o MCP e a exportação da web o usam, só com `href` diferente. Um item na lixeira, excluído ou inexistente, e todo incorporado sem resolvedor, vira `[Item indisponível]`.

## Markdown e intercâmbio

- `documentToMarkdown` escreve CommonMark que o parser do BlockNote lê de volta:
  - ênfase segue as regras de flanqueamento: itálico usa `_`, ou `*` dentro de palavras, e um trecho que nenhum delimitador abre e fecha vira `<strong>`, `<em>` ou `<del>`; o `*` do itálico nunca encosta no `**` do negrito, porque formariam uma só sequência de delimitadores, e o `_` do itálico não abre logo depois de um `\_`, que o BlockNote leria como texto;
  - `$` no texto sai como `\$`; `<` e `&` ficam literais, porque o BlockNote não tem escape para eles; um `!` logo antes de um link sai como `\!`, senão o link viraria imagem;
  - espaços no fim do rótulo de um link saem depois do link;
  - quebras dentro de itens de lista saem como `<br>`; depois de uma quebra, uma linha só de `=` e uma linha delimitadora de tabela GFM (como `:--|:--`) são escapadas; a indentação no início de um bloco é descartada; números de lista ficam entre 0 e 999.999.999;
  - filhos de parágrafos, títulos, citações e código vêm logo depois do bloco, porque Markdown não os aninha.
- Perdas conhecidas no parser do BlockNote, fixadas em `src/web/lib/markdown-roundtrip.test.ts`:
  - um espaço é acrescentado depois de cada quebra num parágrafo ou citação, e uma quebra na borda de um trecho com estilo entra no estilo;
  - filhos de parágrafo de um item de checklist e uma lista aninhada depois de outro filho de um item voltam como irmãos;
  - um parágrafo ou código depois de uma lista aninhada num item volta como item da lista de fora, e o código vira o texto desse item, sem a linguagem;
  - `\=` depois de uma quebra mantém a barra, assim como os escapes de endereços de link com parênteses desbalanceados, `<`, `>` ou `\`. Dentro de `<strong>`, `<em>` e `<del>`, `\$` e fórmulas voltam inteiros: a importação da web procura fórmulas e escapes no conteúdo de cada par à parte, então um `$` de dentro nunca forma fórmula com outro de fora;
  - texto com forma de tag HTML é lido como HTML, e um endereço solto no texto vira link.
- Como `&` fica literal, um leitor CommonMark lê texto como `&amp;` ou `&copy;` como a entidade (`&`, `©`). Sublinhado, cores e alinhamento não têm forma em Markdown.

`domain/markdown/` contém o serializador e a paginação; os testes ficam junto das regras. As regressões da interface para o intercâmbio com o BlockNote ficam em `src/web/lib/markdown-roundtrip.test.ts`. Resultados executados ficam em [validação](../../docs/validacao.md).
