# Etapa 04 — Kanban e contexto

**Estado:** implementada e validada localmente; evidências em [validação](../validacao.md).

## Escopo e contratos

Quadro geral e por projeto com todo/doing/done; título obrigatório; origem e projeto opcionais. Criação, edição, conclusão, exclusão, movimentação e ordenação. Revisão do quadro impede movimento baseado em posição obsoleta. Origem documental guarda bloco e trecho. Criar tarefa e origem na mesma transação. Testar idempotência, corrida entre clientes, ausência de origem e retorno após documento excluído.

## Critérios de pronto

Os comportamentos acima devem estar implementados e verificados com evidências em `docs/validacao.md`. A conclusão distingue verificações locais de operações externas ainda pendentes.
