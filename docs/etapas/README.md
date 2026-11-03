# Tinyfold — Etapas

| # | Etapa | Resultado | Estado |
| --- | --- | --- | --- |
| 01 | [Fundação e editor](01-fundacao.md) | Workspace, SQLite, login, shell e editor | Concluída localmente |
| 02 | [Documentos](02-documentos.md) | Captura livre, autosave, recuperação, conflitos e Markdown | Concluída localmente |
| 03 | [Organização](03-organizacao.md) | Projetos, busca, recentes e lixeira | Concluída localmente |
| 04 | [Kanban e contexto](04-kanban.md) | Tarefas, movimentos, ordem e vínculo documental | Concluída localmente |
| 05 | [Operação e revisão](05-operacao.md) | Docker, backup/restauração, Chrome e rodadas adversariais | Serviço e domínio HTTPS disponíveis; backups automáticos pendentes |
| 06 | [Canvas de desenho](06-canvas.md) | Desenhos com Excalidraw, salvamento e integração com projetos | Recorte vetorial concluído e validado localmente |
| 07 | [MCP somente leitura](07-mcp.md) | Claude Code consulta projetos, documentos, desenhos e tarefas com token pessoal criado no Perfil | Concluída localmente |
| 08 | [Fundação e lateral](08-fundacao.md) | Sistema visual Sumário, lateral do projeto e todo item dentro de um projeto | Concluída localmente |
| 09 | [Pastas](09-pastas.md) | Pastas de um nível para documentos e desenhos, árvore na lateral e Desfazer com ⌘Z | Concluída localmente |
| 10 | [Quadro e tarefa](10-quadro-tarefa.md) | Colunas configuráveis, gaveta da tarefa, descrição, prazo e etiquetas | Concluída localmente |
| 11 | [Documento e desenho](11-documento-desenho.md) | Tarefas e desenhos incorporados, marcador de origem e novas páginas de documento e desenho | Concluída localmente |
| 12 | [Refatoração](12-refatoracao.md) | Contratos, composição e SQL compartilhados; shell e funcionalidades separados; CSS/primitivas; fixtures, timing e retratos visuais; correções aprovadas | Concluída localmente |
| 13 | [Módulos e contratos públicos](13-modulos.md) | Separação de projetos, documentos, desenhos e quadro; classes de módulo, composição transacional e eventos internos | Planejada |

As evidências executadas estão em [validação](../validacao.md), [revisão de persistência](../revisao-workspace.md) e [revisão de backend](../revisao-backend.md).

As etapas 07 a 11 seguiram essa ordem. Cada uma deixa `check`, `test:db`, `build` e `e2e` verdes antes de entrar na `main`. As cinco estão concluídas localmente.

## Etapa 12: fechamento

As seis ondas obrigatórias foram concluídas em 2026-11-03, pelo [processo abreviado aprovado](12-refatoracao.md#desvios-do-plano). O portão final passou com 745 testes unitários, 287 de banco, 227 E2E e 40 retratos visuais. A passagem assistida foi feita no Chrome dentro do Herdr, com a matriz de incorporados, foco, rascunhos e conflito entre abas; veja [validação](../validacao.md#fechamento-da-etapa-12).

Na sequência, o usuário pediu também W2.12 e B3.34–B3.36. Os quatro foram implementados: dois shards de CI com relatório unificado, predicados keyset compartilhados, marcas para datas civis/instantes e pastas de domínio para Markdown/canvas. O [complemento](12-refatoracao.md#complemento-quatro-opcionais) e a [validação](../validacao.md#complemento-da-etapa-12) registram os commits, 747 unitários, 288 testes de banco, 227 E2E e 40 capturas, além da correção de contraste encontrada no Herdr. Não há refatoração pendente da etapa 12. O remoto público [jalzn/folder](https://github.com/jalzn/folder) foi criado após esse portão local; o workflow executa em push e pull request, com resultados no [GitHub Actions](https://github.com/jalzn/folder/actions).

## Etapa 13: próxima refatoração

O [plano completo](13-modulos.md) define os módulos de destino, as classes e entradas públicas, o inventário das 57 operações atuais, a composição das transações, os eventos após commit e a preservação do histórico de migrações. A execução está dividida nas ondas M0–M8, com tarefas, pontes temporárias, critérios de pronto e validação automática/manual no Chrome do Herdr. A implementação desta etapa ainda não começou; os resultados da etapa 12 continuam sendo a referência histórica.

## Pendências de operação

- Serviço, volume, segredos e DNS de `folder.jalzn.com` estão configurados, com HTTPS, login, `/ready` e persistência de sessão entre deploys verificados. Os registros estão no [roteiro](../railway.md).
- Validar o navegador e o encaminhamento do IP no subdomínio final.
- Configurar agendamento de backups e cópia externa automática. Um snapshot remoto já foi baixado e restaurado em destino temporário; o plano atual recusou o agendamento nativo.
- Validar acesso de dois dispositivos físicos na origem pública.

Essas configurações externas não foram substituídas pela emulação de celular nem pelo teste local de Docker.
