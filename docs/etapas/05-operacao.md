# Etapa 05 — Operação e revisão adversarial

**Estado:** ferramentas e validação local concluídas; serviço implantado no Railway, com DNS, HTTPS e login pelo subdomínio verificados. Backups automáticos externos pendentes.

## Escopo e contratos

Docker com servidor único e SQLite em volume; health/ready; configuração por ambiente; snapshot consistente e restauração em destino novo. Suíte desktop/mobile, revisão no Google Chrome e pelo menos duas rodadas adversariais: encontrar falhas e retestar correções. A configuração pública do provedor, do domínio e do armazenamento externo continua pendente; a validação local não equivale a deploy público.

Em 2026-11-02, o serviço foi implantado no Railway, conforme o [roteiro](../railway.md): Docker com ajuste das permissões do volume, IaC versionado, `/ready` e recusa de inicialização sem volume em `/data`. HTTPS, login, MCP, persistência de sessão entre deploys e download/restauração de um snapshot remoto foram validados. O DNS, o certificado e o login pelo subdomínio `folder.jalzn.com` também foram verificados. A cópia externa automática continua pendente.

## Critérios de pronto

Os comportamentos acima devem estar implementados e verificados com evidências em `docs/validacao.md`. A conclusão distingue verificações locais de operações externas ainda pendentes.
