# Tinyfold — Processo

O planejamento segue o formato do Orbis: produto, arquitetura, stack, identidade visual, decisões e um plano por etapa. A documentação e a interface usam português brasileiro; código, commits e PRs usam inglês.

## Entregas

1. Detalhar escopo, casos de uso, banco e critérios da etapa antes de implementá-la.
2. Implementar em entregas pequenas que funcionem e possam ser revisadas.
3. Validar regras, persistência e fluxos de interface pertinentes.
4. Atualizar documentação e registrar mudanças de decisão.
5. Marcar conclusão somente com os critérios atendidos.

Quando houver remoto, propor uma branch e PR por entrega, Conventional Commits e integração com CI verde, como no Orbis. Conta do GitHub, remoto, proteção de branch e implantação ainda não foram configurados.

## Verificação

- `check`: formatação/lint, tipos, limites de dependência e testes unitários relevantes.
- `test:db`: testes contra SQLite real em arquivos temporários isolados.
- `build` seguido de `e2e`: fluxos em desktop e celular, com capturas para revisão visual.
- Conferir teclado, foco, toque, estados vazios, carregamento e erros nas telas alteradas.
- Para persistência: reinício, resposta perdida e reenvio, sessão vencida e conflito entre duas sessões.
- Para implantação: volume persistente e restauração de backup em destino separado.

Os comandos existem e foram executados localmente; veja `docs/validacao.md`. A implementação usou três subagentes responsáveis por backend, workspace e web, com revisão cruzada e duas rodadas adversariais. Cada falha confirmada recebeu correção e nova verificação.
