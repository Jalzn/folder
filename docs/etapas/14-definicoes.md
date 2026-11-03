# Etapa 14 — Configuração na raiz e definições de composição

**Estado:** concluída e validada localmente em `refactor/stage14-root-definitions`. Referência: `41e159a`, após a integração e publicação da etapa 13. A branch desta etapa ainda não foi integrada nem publicada.

## Objetivo

Centralizar dependências, scripts, configuração TypeScript e entradas públicas no repositório, sem um pacote pnpm por módulo. Acrescentar abstrações pequenas para definir módulo, aplicação e projeto, usadas pela composição real do servidor.

`Project` descreve o software Tinyfold e suas aplicações. Não representa os projetos criados pelo usuário. `Application` monta as instâncias de módulos e os serviços que os adaptadores HTTP usam. `Module` mantém o contrato público de comandos, consultas e eventos.

O Orbis foi consultado em `src/core/infra/module.ts`, `src/core/application/module-context.ts` e `src/server/modules.ts`. A composição explícita permanece como referência. O Tinyfold conserva seus mecanismos SQLite, locks, limites de pedido, backups, migrações e transações; esta etapa não altera essas implementações.

## Decisões

- Um `package.json` na raiz contém dependências com as mesmas versões e um mapa `imports` de entradas exatas, como `#documents`, `#documents/domain` e `#documents/composition`. Não há aliases curinga para acessar arquivos internos.
- `pnpm-workspace.yaml` conserva as políticas de build e a correção do Excalidraw. Os módulos continuam como pastas, com suas camadas e limites verificados pelo dependency-cruiser.
- TypeScript conserva configurações separadas para Node, navegador e E2E, centralizadas na raiz. Desenvolvimento e produção resolvem os mesmos aliases nativos do pacote.
- `defineModule({ id, setup, api })` cria uma definição com uma classe `.Module` e uma capability `.stateOf(instance)`. Cada classe de negócio estende a classe gerada. Somente o próprio módulo guarda a definição e acessa seu estado; consumidores recebem `id`, `commands`, `queries` e assinatura de eventos.
- `defineApplication({ id, setup })` descreve uma composição síncrona. `.create(context)` cria uma `Application` com módulos, serviços e descarte idempotente. Definir a aplicação não abre banco, executa migração nem cria módulos.
- `defineProject({ id, applications })` registra as definições das aplicações em `project.ts`, na raiz. O servidor usa `project.applications.server.create(context)`. A web continua sendo a SPA entregue por esse servidor e mantém sua configuração Vite.
- O registro histórico de migrações passa a se chamar `MigrationModuleDefinition`/`defineMigrationModule`, distinguindo-o das definições de execução. IDs, ordem, arquivos e checksums são preservados.
- A composição do servidor conserva auth com sua API atual, os cinco módulos e seus adaptadores. O host continua responsável por aguardar HTTP e ferramentas MCP em andamento antes do descarte, e por fechar o banco depois.

## Política de módulos

As restrições da etapa 13 continuam obrigatórias: sem imports entre módulos de negócio, inclusive tipos; domínio puro; aplicação dependente de portas locais; infraestrutura privada; `composition` somente para o dono e o servidor. Eventos continuam após commit, e os fluxos conjuntos usam uma transação e o mesmo registro de idempotência.

A descoberta das entradas públicas passa a ler o mapa da raiz. A configuração precisa falhar para uma pasta de módulo sem entrada declarada. `project.ts` é um ponto de composição: usa entradas públicas e pode ser consumido pelo servidor e scripts, nunca por módulos de negócio ou pela web.

## Implementação e validação

- [x] Centralizar manifests, scripts, aliases e configurações; instalar com o lockfile atualizado.
- [x] Adaptar as cinco classes a `defineModule`, preservando assinaturas e estado privado.
- [x] Usar `defineApplication` e `defineProject` na montagem do servidor.
- [x] Revisar a política com fixtures negativas, incluindo aliases, acesso ao projeto e módulos sem entradas.
- [x] Verificar inferência, isolamento das instâncias, limpeza e encerramento com requisições em andamento.
- [x] Executar `check`, `test:db`, `build` e E2E com bancos temporários.
- [x] Comparar a interface com a referência anterior e validar manualmente no Chrome do Herdr.
- [x] Atualizar arquitetura, instruções e registros com resultados executados.

## Registro de execução

Passaram 808 testes unitários, 331 SQLite e 227 E2E, além do lint, três configurações de tipos e 1.248 módulos/5.143 dependências sem violações. As 40 capturas coincidem com a referência preservada. Instalação offline com lockfile congelado e build passaram em uma cópia limpa; `dev` iniciou e liberou suas portas após SIGTERM e Ctrl+C.

O Chrome do Herdr foi usado para criar projeto/pasta/documento/tarefa/desenho, mover documento e recarregar os dados, com inspeção desktop e em tela estreita escura. A auditoria conservou os 57 schemas RPC, 78 objetos SQLite e 11 migrações/checksums. As três revisões cruzadas não deixaram bloqueadores; seus achados sobre cleanup, mapas de serviços e sinais do runner foram corrigidos. Detalhes, limites e logs em [validação](../validacao.md#etapa-14-configuração-na-raiz-e-definições).

Não houve alteração de interface, contratos RPC/MCP, dados ou migrações SQL. Publicação no Railway continua vinculada à `main` e ao CI.
