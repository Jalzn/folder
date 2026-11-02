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
| 12 | [Refatoração](12-refatoracao.md) | Código mais fácil de ler e de mudar, sem mudar o comportamento: partes paralelas juntas, guardas automáticas e E2E isolado e paralelo, em seis ondas | Proposta |

As evidências executadas estão em [validação](../validacao.md), [revisão de persistência](../revisao-workspace.md) e [revisão de backend](../revisao-backend.md).

As etapas 07 a 11 seguiram essa ordem. Cada uma deixa `check`, `test:db`, `build` e `e2e` verdes antes de entrar na `main`. As cinco estão concluídas localmente.

## Pendências de operação

- Serviço, volume, segredos e DNS de `folder.jalzn.com` estão configurados, com HTTPS, login, `/ready` e persistência de sessão entre deploys verificados. Os registros estão no [roteiro](../railway.md).
- Validar o navegador e o encaminhamento do IP no subdomínio final.
- Configurar agendamento de backups e cópia externa automática. Um snapshot remoto já foi baixado e restaurado em destino temporário; o plano atual recusou o agendamento nativo.
- Validar acesso de dois dispositivos físicos na origem pública.

Essas configurações externas não foram substituídas pela emulação de celular nem pelo teste local de Docker.
