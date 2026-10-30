# Tinyfold

Um espaço pessoal para escrever ideias, organizar projetos e acompanhar tarefas em Kanban. Interface escura em grafite, cinzas frios e azul discreto, com dados em SQLite no servidor e autenticação por senha.

**Estado:** primeira versão implementada e validada localmente. Hospedagem pública, domínio e destino externo dos backups ainda não estão configurados.

## O que funciona

- Documentos independentes de projeto, editor visual em blocos, atalhos Markdown e importação/exportação `.md`.
- Equações LaTeX em linha e em bloco, com prévia e preservação da fonte no Markdown.
- Salvamento automático, recuperação de rascunhos e resolução explícita de conflitos entre dispositivos.
- Projetos, recentes, busca pelo título e conteúdo, arquivamento e lixeira de documentos.
- Kanban geral ou por projeto; criar, editar, mover, ordenar e concluir tarefas.
- Criar tarefa a partir de um trecho e voltar ao documento de origem.
- Perfil com troca de senha e gerenciamento de sessões.

## Executar

```sh
mise install
mise exec -- pnpm install
cp .env.example .env
```

Defina `OWNER_PASSWORD` em `.env` antes da primeira subida, com pelo menos 12 caracteres. A conta é criada uma vez; depois use o Perfil ou o comando de recuperação para trocar a senha.

```sh
mise exec -- pnpm dev
```

Abra [localhost:5170](http://localhost:5170). O SQLite fica em `data/tinyfold.sqlite`, fora do Git. O servidor aplica migrações automaticamente.

## Verificar

```sh
mise exec -- pnpm check
mise exec -- pnpm test:db
mise exec -- pnpm build
mise exec -- pnpm e2e
```

Os testes E2E usam Google Chrome instalado e bancos temporários isolados, em desktop e emulação de celular. Em uma máquina sem Chrome, instale-o com `pnpm exec playwright install --with-deps chrome`.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Produto](docs/produto.md) | Experiência e limites da primeira versão |
| [Arquitetura](docs/arquitetura.md) | Módulos, autenticação, SQLite e salvamento |
| [Equações](docs/equacoes.md) | Inserir, editar e importar/exportar fórmulas LaTeX |
| [Stack](docs/stack.md) | Tecnologias e adaptações do Orbis |
| [Identidade visual](docs/identidade-visual.md) | Direção escolhida e referência do Claude |
| [Operação](docs/implantacao.md) | Docker, configuração, senha e backups |
| [Validação](docs/validacao.md) | Testes executados, Chrome e revisões adversariais |
| [Etapas](docs/etapas/README.md) | Estado das entregas |
| [Decisões](docs/decisoes.md) | Histórico de produto e implementação |

Equipes, colaboração em tempo real, anexos e sincronização offline completa ficam fora desta versão. Markdown é um formato de intercâmbio: o JSON do editor preserva a estrutura interna; o backup SQLite preserva o aplicativo completo.
