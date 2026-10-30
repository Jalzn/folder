# Tinyfold — Produto

**Estado:** primeira versão implementada localmente. Ver [validação](validacao.md) para evidências e limites.

Organizador pessoal para capturar ideias em documentos, reuni-las em projetos e executar tarefas em Kanban. O documento é o ponto de partida da experiência. O aplicativo funciona no navegador e guarda os dados em um servidor acessível de vários dispositivos.

## Fluxo principal

1. Criar um documento e começar a escrever imediatamente.
2. Associar o documento a um projeto quando fizer sentido.
3. Selecionar um trecho e usar uma ação explícita para criar uma tarefa.
4. Acompanhar essa tarefa no Kanban e voltar ao contexto de origem.

Uma tarefa também pode nascer diretamente no Kanban. Um checklist no documento permanece parte do texto; criar uma tarefa acompanhada é uma ação separada.

## Navegação

- Início: ação Novo documento e itens recentes.
- Documentos: lista e busca, incluindo documentos sem projeto.
- Projetos: cada projeto tem as abas Documentos e Kanban.
- Kanban: quadro geral, incluindo tarefas sem projeto, com filtro por projeto.
- Perfil: senha, sessões e sair.

Criar e editar tarefa são estados contextuais da interface. No celular, os fluxos essenciais de escrita, consulta e movimentação de tarefas precisam funcionar com toque e tela estreita.

## Documentos

- Editor visual em blocos, atalhos Markdown e menu de inserção.
- Título, parágrafos, títulos internos, listas, checklist, links, citações, código e equações LaTeX em linha ou em bloco.
- Documento criado sem título recebe um nome provisório; projeto é opcional.
- Salvamento automático com estados visíveis: salvando, salvo e falha ao salvar.
- Rascunho recuperável após recarga, queda de rede ou sessão expirada.
- Importação e exportação `.md`, com comportamento documentado para elementos específicos do aplicativo.
- Conteúdo estruturado é a fonte principal; Markdown é um formato de intercâmbio.
- Busca por título e texto. Exclusão recuperável na lixeira.

## Projetos e tarefas

- Projeto: nome e agrupamento de documentos e tarefas; arquivar preserva o conteúdo.
- Tarefa: título obrigatório, estado e ordem no quadro. Projeto e origem documental opcionais.
- Estados iniciais fixos: A fazer, Em andamento e Concluído.
- Contexto da criação preenche o projeto e a coluna quando existirem.
- Mover entre colunas e reordenar; oferecer alternativa ao arrastar por menu/teclado.
- A mesma tarefa aparece no documento e no quadro, com estado consistente.
- A origem guarda documento, identificador de bloco quando disponível e trecho de referência. Mudar o título da tarefa não altera a prosa original.
- Apagar o trecho ou excluir o documento preserva a tarefa. A interface informa quando a origem está indisponível.
- Mover uma tarefa ou documento de projeto não move o outro silenciosamente. O vínculo de origem continua válido.

## Limites da primeira versão

O escopo inicial é pessoal. Equipes, compartilhamento, edição colaborativa simultânea, IA, automações, calendários e bancos de dados configuráveis ficam para etapas futuras. Datas, prioridades, anexos e hierarquias profundas também ficam fora da primeira entrega utilizável.

A recuperação de um rascunho local protege a escrita. Sincronização offline completa e mesclagem automática de edições são decisões futuras.
