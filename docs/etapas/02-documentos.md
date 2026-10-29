# Etapa 02 — Documentos

**Estado:** implementada e validada localmente; evidências em [validação](../validacao.md).

## Escopo e contratos

Editor BlockNote em português; criação sem projeto; JSON versionado; salvamento com debounce e uma chamada em voo; rascunho local por documento; requestId por snapshot; proteção de expectedVersion; conflito com opção de carregar remoto ou salvar cópia. Importar/exportar Markdown no menu e limite de 1 MiB de conteúdo. Testar resposta perdida, reload, sessão vencida, edição concorrente e conversão Markdown.

## Critérios de pronto

Os comportamentos acima devem estar implementados e verificados com evidências em `docs/validacao.md`. A conclusão distingue verificações locais de operações externas ainda pendentes.
