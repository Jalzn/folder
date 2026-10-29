# Tinyfold — Etapas

| # | Etapa | Resultado | Estado |
| --- | --- | --- | --- |
| 01 | [Fundação e editor](01-fundacao.md) | Workspace, SQLite, login, shell e editor | Concluída localmente |
| 02 | [Documentos](02-documentos.md) | Captura livre, autosave, recuperação, conflitos e Markdown | Concluída localmente |
| 03 | [Organização](03-organizacao.md) | Projetos, busca, recentes e lixeira | Concluída localmente |
| 04 | [Kanban e contexto](04-kanban.md) | Tarefas, movimentos, ordem e vínculo documental | Concluída localmente |
| 05 | [Operação e revisão](05-operacao.md) | Docker, backup/restauração, Chrome e rodadas adversariais | Validação local concluída; produção externa pendente |

As evidências executadas estão em [validação](../validacao.md), [revisão de persistência](../revisao-workspace.md) e [revisão de backend](../revisao-backend.md).

## Para colocar na nuvem

- Escolher hospedagem, origem HTTPS e volume persistente para uma instância.
- Configurar segredos e testar o proxy real.
- Configurar destino externo e agendamento de backups.
- Validar acesso de dois dispositivos físicos na origem pública.

Essas configurações externas não foram substituídas pela emulação de celular nem pelo teste local de Docker.
