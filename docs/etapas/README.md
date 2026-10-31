# Tinyfold — Etapas

| # | Etapa | Resultado | Estado |
| --- | --- | --- | --- |
| 01 | [Fundação e editor](01-fundacao.md) | Workspace, SQLite, login, shell e editor | Concluída localmente |
| 02 | [Documentos](02-documentos.md) | Captura livre, autosave, recuperação, conflitos e Markdown | Concluída localmente |
| 03 | [Organização](03-organizacao.md) | Projetos, busca, recentes e lixeira | Concluída localmente |
| 04 | [Kanban e contexto](04-kanban.md) | Tarefas, movimentos, ordem e vínculo documental | Concluída localmente |
| 05 | [Operação e revisão](05-operacao.md) | Docker, backup/restauração, Chrome e rodadas adversariais | Validação local concluída; produção externa pendente |
| 06 | [Canvas de desenho](06-canvas.md) | Desenhos com Excalidraw, salvamento e integração com projetos | Recorte vetorial concluído e validado localmente |
| 07 | [MCP somente leitura](07-mcp.md) | Claude Code consulta projetos, documentos, desenhos e tarefas com token pessoal criado no Perfil | Concluída localmente |
| 08 | [Fundação e lateral](08-fundacao.md) | Sistema visual Sumário, lateral do projeto e todo item dentro de um projeto | Planejada |
| 09 | [Pastas](09-pastas.md) | Pastas de um nível para documentos e desenhos | Planejada |
| 10 | [Quadro e tarefa](10-quadro-tarefa.md) | Colunas configuráveis, gaveta da tarefa, descrição, prazo e etiquetas | Planejada |
| 11 | [Documento e desenho](11-documento-desenho.md) | Tarefas e desenhos incorporados e novas páginas de documento e desenho | Planejada |

As evidências executadas estão em [validação](../validacao.md), [revisão de persistência](../revisao-workspace.md) e [revisão de backend](../revisao-backend.md).

As etapas 07 a 11 seguem essa ordem. Cada uma deixa `check`, `test:db`, `build` e `e2e` verdes antes de entrar na `main`. As etapas 07 e 08 estão detalhadas. As etapas 09 a 11 têm o escopo inicial e são detalhadas antes de começar.

## Para colocar na nuvem

- Escolher hospedagem, origem HTTPS e volume persistente para uma instância.
- Configurar segredos e testar o proxy real.
- Configurar destino externo e agendamento de backups.
- Validar acesso de dois dispositivos físicos na origem pública.

Essas configurações externas não foram substituídas pela emulação de celular nem pelo teste local de Docker.
