# Etapa 05 — Operação e revisão adversarial

**Estado:** ferramentas e validação local concluídas; implantação pública e backup externo pendentes.

## Escopo e contratos

Docker com servidor único e SQLite em volume; health/ready; configuração por ambiente; snapshot consistente e restauração em destino novo. Suíte desktop/mobile, revisão no Google Chrome e pelo menos duas rodadas adversariais: encontrar falhas e retestar correções. Provedor, domínio e armazenamento externo ainda não definidos; a validação local não equivale a deploy público.

## Critérios de pronto

Os comportamentos acima devem estar implementados e verificados com evidências em `docs/validacao.md`. A conclusão distingue verificações locais de operações externas ainda pendentes.
