# Tinyfold — Produto

**Estado:** primeira versão implementada localmente. Ver [validação](validacao.md) para evidências e limites. A definição foi revisada em 2026-10-30; itens marcados como **Planejado** ainda não foram implementados.

Espaço pessoal e minimalista para conduzir projetos, de software ou não. Reúne escrita, desenho e tarefas, que antes ficavam espalhados entre Notion, Excalidraw e Trello, em um só lugar e sem o excesso dessas ferramentas. O aplicativo funciona no navegador e guarda os dados em um servidor acessível de vários dispositivos.

## Por que existe

- Substituir três serviços por um aplicativo próprio, organizado em torno dos projetos pessoais.
- Servir de laboratório de arquitetura para os próximos aplicativos. O peso é de cerca de 60% laboratório e 40% ferramenta de uso diário: confiabilidade e clareza do código são objetivos, e um escopo pequeno protege os dois.

## Princípios

1. **O projeto é o centro.** Abrir um projeto mostra seus documentos, desenhos e quadro. Um item pode nascer sem projeto, como captura rápida, e ser associado depois.
2. **Cada ferramenta faz menos que a original.** Um recurso novo precisa resolver um uso real nos projetos. A lista de fora do escopo faz parte do produto.
3. **Ligações vivem nos documentos.** Um documento pode incorporar tarefas e desenhos; as demais ferramentas não criam ligações por enquanto.
4. **Nada se perde.** Salvamento automático, rascunho recuperável, conflitos explícitos e backup verificado.
5. **Uso pessoal.** Uma pessoa, vários dispositivos.

## Fora do escopo

- Bancos de dados, propriedades configuráveis, modelos de página e hierarquias profundas de páginas.
- Campos personalizados, automações e extensões no quadro.
- Bibliotecas de formas e colaboração nos desenhos.
- Outras contas, compartilhamento, links públicos e edição colaborativa simultânea.
- Ferramentas além de documentos, desenhos e Kanban.

## Fluxo principal

1. Abrir ou criar um projeto.
2. Escrever documentos e desenhar dentro dele. Algo solto pode nascer sem projeto e ser associado depois.
3. Selecionar um trecho e usar uma ação explícita para criar uma tarefa.
4. Acompanhar essa tarefa no Kanban e voltar ao contexto de origem.
5. **Planejado:** consultar documentos, desenhos e tarefas do projeto pelo Claude Code, via MCP.

Uma tarefa também pode nascer diretamente no Kanban. Um checklist no documento permanece parte do texto; criar uma tarefa acompanhada é uma ação separada.

## Navegação

- Início: ações de escrever e desenhar, com documentos e desenhos recentes.
- Documentos: lista e busca, incluindo documentos sem projeto.
- Desenhos: lista e busca por título e texto, incluindo desenhos sem projeto.
- Projetos: cada projeto tem as abas Documentos, Desenhos e Kanban.
- Kanban: quadro geral, incluindo tarefas sem projeto, com filtro por projeto.
- Perfil: senha, sessões e sair.

**Planejado:** a página do projeto passa a ser a tela principal do aplicativo. A navegação resultante ainda será definida.

Criar e editar tarefa são estados contextuais da interface. No celular, os fluxos essenciais de escrita, consulta e movimentação de tarefas precisam funcionar com toque e tela estreita.

## Documentos

- Editor visual em blocos, atalhos Markdown e menu de inserção. Markdown é a sintaxe de digitação; o conteúdo estruturado é a fonte principal.
- Título, parágrafos, títulos internos, listas, checklist, links, citações, código e equações LaTeX em linha ou em bloco.
- Documento criado sem título recebe um nome provisório; projeto é opcional.
- Salvamento automático com estados visíveis: salvando, salvo e falha ao salvar.
- Rascunho recuperável após recarga, queda de rede ou sessão expirada.
- Importação e exportação `.md` como formato de intercâmbio, com comportamento documentado para elementos específicos do aplicativo.
- Busca por título e texto. Exclusão recuperável na lixeira.

**Planejado:**

- Incorporar uma tarefa: o documento exibe um card com título, coluna, prazo, etiquetas e progresso do checklist. O card reflete o estado atual e abre a tarefa.
- Incorporar um desenho: o documento exibe a versão atual, somente leitura. Clicar abre o editor do desenho.
- Itens excluídos aparecem como indisponíveis, sem quebrar o documento.
- Na exportação `.md`, itens incorporados viram links com o título; na importação, permanecem links comuns.

## Desenhos

- Canvas Excalidraw em página própria, com título, projeto opcional, formas, setas, texto, quadros de agrupamento e traço livre.
- Salvamento automático, rascunho recuperável e resolução de conflitos por versão, como nos documentos.
- Busca por título e pelos textos do desenho, recentes, filtro de projeto e exclusão recuperável na lixeira.
- Importação de `.excalidraw` cria outro desenho; exportação editável ou PNG usa o conteúdo atual, inclusive com salvamento pendente.
- Seleção, cursor e zoom não criam versões de conteúdo. O histórico de desfazer permanece na sessão do editor.
- Cópia de recuperação e importação de um desenho em projeto arquivado criam o novo conteúdo sem projeto, com aviso.
- Imagens e conteúdo incorporado ficam para entregas futuras.

## Projetos e tarefas

- Projeto: nome e agrupamento de documentos, desenhos e tarefas; arquivar preserva o conteúdo.
- Tarefa: título obrigatório, estado e ordem no quadro. Projeto e origem documental opcionais.
- Estados iniciais fixos: A fazer, Em andamento e Concluído.
- Contexto da criação preenche o projeto e a coluna quando existirem.
- Mover entre colunas e reordenar; oferecer alternativa ao arrastar por menu/teclado.
- A mesma tarefa aparece no documento e no quadro, com estado consistente.
- A origem guarda documento, identificador de bloco quando disponível e trecho de referência. Mudar o título da tarefa não altera a prosa original.
- Apagar o trecho ou excluir o documento preserva a tarefa. A interface informa quando a origem está indisponível.
- Mover uma tarefa ou documento de projeto não move o outro silenciosamente. O vínculo de origem continua válido.

**Planejado:**

- Descrição com o mesmo editor dos documentos, salvamento automático, rascunho recuperável e conflitos por versão. Incorporar itens e criar tarefa a partir de um trecho continuam exclusivos dos documentos.
- Checklist: os blocos de checklist da descrição. O card mostra o progresso, como 2/5; não há lista separada.
- Prazo: data opcional, sem hora. O card mostra o prazo e destaca a tarefa atrasada fora da coluna de conclusão. Sem data de início, lembretes ou notificações.
- Etiquetas: compartilhadas por todo o espaço, com nome e cor de uma paleta curta. O quadro pode ser filtrado por etiqueta.
- Colunas: um único conjunto para todo o espaço, usado no quadro geral e nos quadros dos projetos. Criar, renomear, reordenar e excluir colunas; excluir uma coluna com tarefas exige escolher o destino delas.
- Uma coluna é marcada como de conclusão; tarefas nela contam como concluídas. As colunas iniciais são A fazer, Em andamento e Concluído.
- Card compacto: título, prazo, etiquetas e progresso do checklist.

Colunas diferentes por projeto ficam fora do escopo: mantêm o quadro geral coerente e o modelo simples.

## Acesso pelo Claude Code

**Planejado:** servidor MCP somente leitura para o Claude Code consultar o espaço — por exemplo, um documento que descreve uma ideia, um desenho de arquitetura ou as tarefas de um projeto.

- Listar projetos e buscar documentos, desenhos e tarefas.
- Ler um documento em Markdown. Tarefas e desenhos incorporados aparecem como referências que podem ser consultadas.
- Ler um desenho como imagem PNG e como textos e estrutura da cena.
- Ler tarefas com coluna, prazo, etiquetas e descrição.
- Itens na lixeira ficam de fora. O acesso usa um token pessoal somente leitura, criado e revogado no Perfil.

Criar ou alterar conteúdo pelo MCP fica para depois.

## Em aberto

- Navegação com o projeto no centro: precisa de exploração de design antes da implementação.

## Limites atuais

Prioridades, anexos e calendários ficam fora da versão atual. A recuperação de um rascunho local protege a escrita. Sincronização offline completa e mesclagem automática de edições são decisões futuras.
