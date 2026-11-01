# Tinyfold — Produto

**Estado:** implementado localmente até a [etapa 08](etapas/08-fundacao.md), que pôs tudo dentro de um projeto, com a lateral e o visual Sumário. Ver [validação](validacao.md) para evidências e limites. A definição foi revisada em 2026-10-30 e 2026-10-31; itens marcados como **Planejado** ainda não foram implementados.

Espaço pessoal e minimalista para conduzir projetos, de software ou não. Reúne escrita, desenho e tarefas, que antes ficavam espalhados entre Notion, Excalidraw e Trello, em um só lugar e sem o excesso dessas ferramentas. O aplicativo funciona no navegador e guarda os dados em um servidor acessível de vários dispositivos.

## Por que existe

- Substituir três serviços por um aplicativo próprio, organizado em torno dos projetos pessoais.
- Servir de laboratório de arquitetura para os próximos aplicativos. O peso é de cerca de 60% laboratório e 40% ferramenta de uso diário: confiabilidade e clareza do código são objetivos, e um escopo pequeno protege os dois.

## Princípios

1. **O projeto é o centro.** O aplicativo sempre está dentro de um projeto e reabre onde você parou. Todo item pertence a um projeto; o que é avulso fica num projeto geral.
2. **Cada ferramenta faz menos que a original.** Um recurso novo precisa resolver um uso real nos projetos. A lista de fora do escopo faz parte do produto.
3. **Ligações vivem nos documentos.** Um documento pode incorporar tarefas e desenhos; as demais ferramentas não criam ligações por enquanto.
4. **Nada se perde.** Salvamento automático, rascunho recuperável, conflitos explícitos e backup verificado.
5. **Uso pessoal.** Uma pessoa, vários dispositivos.

## Fora do escopo

- Bancos de dados, propriedades configuráveis e modelos de página.
- Hierarquias profundas: pastas têm um único nível.
- Visões que atravessam projetos, como quadro geral e listas gerais de documentos ou desenhos. A busca atravessa todos os projetos.
- Campos personalizados, automações e extensões no quadro.
- Bibliotecas de formas e colaboração nos desenhos.
- Outras contas, compartilhamento, links públicos e edição colaborativa simultânea.
- Ferramentas além de documentos, desenhos e Kanban.

## Fluxo principal

1. Abrir ou criar um projeto.
2. Escrever documentos e desenhar dentro dele.
3. Selecionar um trecho e usar uma ação explícita para criar uma tarefa.
4. Acompanhar essa tarefa no Kanban e voltar ao contexto de origem.
5. Consultar projetos, documentos, desenhos e tarefas pelo Claude Code, via MCP somente leitura.

Uma tarefa também pode nascer diretamente no Kanban. Um checklist no documento permanece parte do texto; criar uma tarefa acompanhada é uma ação separada.

## Navegação

Implementada na etapa 08, conforme a [interface](interface/README.md):

- O aplicativo sempre está dentro de um projeto e reabre no último projeto, no item e na posição onde você parou. Não há Início, caixa de entrada, quadro geral nem listas gerais de documentos e desenhos. Sem projeto ativo, uma tela própria oferece criar um projeto ou desarquivar um.
- Lateral do projeto:
  - No topo, o seletor de projetos, com cor, ordem e os arquivados.
  - Em seguida, Buscar, Visão geral, Quadro e as seções Documentos e Desenhos, com os fixados primeiro, até oito itens na ordem escolhida e "Ver todos".
  - No pé, o menu Você, com Perfil, token e tema, e a Lixeira.
  - A lateral recolhe numa faixa estreita e, em telas menores, abre sobre a página.
- Visão geral do projeto: as tarefas em andamento e os itens editados recentemente.
- Índice do projeto com todos os documentos e desenhos, filtrável por tipo e ordenável.
- ⌘K busca em todos os projetos e reúne as ações do item aberto e os comandos. Atalhos de teclado cobrem a navegação.
- Esc fecha apenas a camada aberta mais recente e nunca navega.

**Planejado:**

- Pastas na lateral e no Índice (etapa 09).
- As tarefas atrasadas no seletor e no quadro, a gaveta inferior não modal da tarefa, que empurra o conteúdo e continua aberta durante a navegação, e as tarefas concluídas nos últimos 14 dias na Visão geral (etapa 10).

Criar e editar tarefa são estados contextuais da interface. No celular, os fluxos essenciais de escrita, consulta e movimentação de tarefas precisam funcionar com toque e tela estreita.

## Documentos

- Editor visual em blocos, atalhos Markdown e menu de inserção. Markdown é a sintaxe de digitação; o conteúdo estruturado é a fonte principal.
- Título, parágrafos, títulos internos, listas, checklist, links, citações, código e equações LaTeX em linha ou em bloco.
- Documento criado sem título recebe um nome provisório e pertence ao projeto em que foi criado.
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

- Canvas Excalidraw em página própria dentro do projeto, com título, formas, setas, texto, quadros de agrupamento e traço livre.
- Salvamento automático, rascunho recuperável e resolução de conflitos por versão, como nos documentos.
- Busca por título e pelos textos do desenho, lista no projeto e exclusão recuperável na lixeira.
- Importação de `.excalidraw` cria outro desenho; exportação editável ou PNG usa o conteúdo atual, inclusive com salvamento pendente.
- Seleção, cursor e zoom não criam versões de conteúdo. O histórico de desfazer permanece na sessão do editor.
- Cópia de recuperação e importação de um desenho em projeto arquivado criam o novo conteúdo no projeto ativo aberto por último, com aviso.
- Imagens e conteúdo incorporado ficam para entregas futuras.

## Pastas

**Planejado:**

- Pastas agrupam documentos e desenhos do mesmo assunto dentro de um projeto. Têm um único nível: não contêm outras pastas. Tarefas não entram em pastas.
- Itens podem ficar fora de qualquer pasta, na raiz do projeto. Itens fixados sobem para o topo da raiz ou da própria pasta.
- Criar, renomear e reordenar pastas. Mover itens arrastando ou pelo menu "Mover para pasta".
- Excluir uma pasta leva os itens para a raiz, com opção de desfazer. Excluir a pasta com os itens manda os itens para a Lixeira, após confirmação.
- Restaurar um item cuja pasta foi excluída devolve o item à raiz.

## Projetos e tarefas

- Projeto: nome, cor e ordem no seletor, e agrupamento de documentos, desenhos e tarefas; arquivar preserva o conteúdo. Todo item pertence a um projeto; o que era avulso foi para o projeto Geral.
- Fixados: até oito documentos e desenhos por projeto, no topo da lateral.
- Mover um documento ou desenho de projeto, com desfazer; mover não conta como edição.
- Lixeira por projeto, com restaurar, excluir de vez e esvaziar o que está na tela.
- Tarefa: título obrigatório, projeto, estado e ordem no quadro. Origem documental opcional.
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
- Colunas: um único conjunto para todos os projetos. Criar, renomear, reordenar e excluir colunas; excluir uma coluna com tarefas exige escolher o destino delas.
- Uma coluna é marcada como de conclusão; tarefas nela contam como concluídas. As colunas iniciais são A fazer, Em andamento e Concluído.
- A coluna de conclusão mostra os últimos 14 dias; as tarefas anteriores ficam na página Concluídas do projeto.
- Card compacto: título, prazo, etiquetas e progresso do checklist.

Colunas diferentes por projeto ficam fora do escopo, para manter o modelo simples.

## Acesso pelo Claude Code

Servidor MCP somente leitura para o Claude Code consultar o espaço, por exemplo um documento que descreve uma ideia, um desenho de arquitetura ou as tarefas de um projeto. Implementado na [etapa 07](etapas/07-mcp.md):

- Listar projetos e buscar documentos, desenhos e tarefas por palavras.
- Ler um documento em Markdown, com as tarefas que nasceram dele.
- Ler um desenho como imagem PNG e como textos e estrutura da cena, com as ligações das setas.
- Ler tarefas com estado, posição e trecho de origem.
- Itens na lixeira ficam de fora. O acesso usa um token pessoal somente leitura, criado e revogado no Perfil, que mostra o último uso de cada token.

**Planejado:**

- Pastas (etapa 09), colunas, prazos, etiquetas e descrição das tarefas (etapa 10) e itens incorporados como referências (etapa 11) entram nas saídas do MCP com essas etapas.
- Criar ou alterar conteúdo pelo MCP fica para depois.

## Em aberto

- Versão de celular da nova interface: ainda não desenhada.

## Limites atuais

Prioridades, anexos e calendários ficam fora da versão atual. A recuperação de um rascunho local protege a escrita. Sincronização offline completa e mesclagem automática de edições são decisões futuras.
