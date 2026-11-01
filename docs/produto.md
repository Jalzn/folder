# Tinyfold — Produto

**Estado:** implementado localmente até a [etapa 10](etapas/10-quadro-tarefa.md), que trouxe as colunas configuráveis, a gaveta da tarefa, a descrição, o prazo e as etiquetas, depois da [etapa 09](etapas/09-pastas.md), com as pastas, e da [etapa 08](etapas/08-fundacao.md), que pôs tudo dentro de um projeto, com a lateral e o visual Sumário. Ver [validação](validacao.md) para evidências e limites. A definição foi revisada em 2026-10-30 e 2026-10-31; itens marcados como **Planejado** ainda não foram implementados.

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
  - Em seguida, Buscar, Visão geral, Quadro, com as tarefas atrasadas, e a árvore Itens, com os fixados primeiro, até oito itens por nível e "Ver todos".
  - No pé, o menu Você, com Perfil, token e tema, e a Lixeira.
  - A lateral recolhe numa faixa estreita e, em telas menores, abre sobre a página.
- Visão geral do projeto: as tarefas atrasadas e em andamento, as concluídas nos últimos 14 dias e os itens editados recentemente.
- A gaveta inferior não modal da tarefa empurra o conteúdo e continua aberta durante a navegação. O seletor de projetos mostra as atrasadas de cada um.
- Índice do projeto com todos os documentos e desenhos, filtrável por tipo e por pasta, ordenável e agrupado por pasta.
- ⌘K busca em todos os projetos e reúne as ações do item aberto e os comandos. Atalhos de teclado cobrem a navegação.
- Esc fecha apenas a camada aberta mais recente e nunca navega.
- ⌘Z desfaz a ação do toast na tela (excluir ou mover), fora de campos, editores e camadas abertas.

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

- Pastas agrupam documentos e desenhos do mesmo assunto dentro de um projeto. Têm um único nível: não contêm outras pastas. Tarefas não entram em pastas.
- Itens podem ficar fora de qualquer pasta, na raiz do projeto. Itens fixados sobem para o topo da raiz ou da própria pasta, até 8 em cada um; mover um fixado para uma pasta cheia tira o fixado, e o toast avisa.
- A lateral mostra a árvore Itens: fixados da raiz, pastas e itens soltos, até 8 por nível e "Ver todos" no Índice filtrado. As pastas abertas e a ordenação ficam no dispositivo.
- Criar, renomear e reordenar pastas. Mover itens arrastando ou por "Mover para pasta…" (M), na lateral, na página do item e no ⌘K.
- Excluir uma pasta leva os itens para a raiz, e excluir a pasta com os itens manda os itens para a Lixeira, após confirmação; os dois têm Desfazer no toast e por ⌘Z.
- A pasta aparece no cabeçalho do item, no ⌘K, no Índice, na Visão geral e na Lixeira, que mostra a origem. Restaurar um item cuja pasta foi excluída devolve o item à raiz, com aviso.

## Projetos e tarefas

- Projeto: nome, cor e ordem no seletor, e agrupamento de documentos, desenhos e tarefas; arquivar preserva o conteúdo. Todo item pertence a um projeto; o que era avulso foi para o projeto Geral.
- Fixados: até oito documentos e desenhos na raiz do projeto e até oito em cada pasta, no topo de cada um.
- Mover um documento ou desenho de projeto, com desfazer; mover não conta como edição.
- Lixeira por projeto, com restaurar, excluir de vez e esvaziar o que está na tela.
- Tarefa: título obrigatório, projeto, coluna e ordem no quadro. Origem documental opcional.
- Colunas: um único conjunto para todos os projetos, até 20. Criar, renomear, reordenar e excluir colunas, com Desfazer; excluir uma coluna com tarefas exige escolher o destino delas. As colunas iniciais são A fazer, Em andamento e Concluído.
- Uma coluna é marcada como de conclusão; tarefas nela contam como concluídas, com a data em que entraram. A coluna de conclusão mostra os últimos 14 dias; as tarefas anteriores ficam na página Concluídas do projeto, por mês.
- Descrição com o mesmo editor dos documentos, salvamento automático, rascunho recuperável e conflitos por versão. Incorporar itens e criar tarefa a partir de um trecho continuam exclusivos dos documentos.
- Checklist: os blocos de checklist da descrição. O card mostra o progresso, como 2/5; não há lista separada.
- Prazo: data opcional, sem hora, contada no fuso do dono (o do aparelho na primeira carga, trocado no Perfil). O card mostra o prazo e destaca a tarefa atrasada fora da coluna de conclusão. Sem data de início, lembretes ou notificações.
- Etiquetas: compartilhadas por todo o espaço, com nome e cor de uma paleta de sete, até 20 por tarefa, geridas no diálogo "Etiquetas". Excluir uma etiqueta em uso sai na hora, com Desfazer. O quadro pode ser filtrado por etiqueta.
- Card compacto: título, prazo, etiquetas e progresso do checklist. A tarefa abre na gaveta, que edita coluna, prazo, etiquetas, projeto, título e descrição.
- Contexto da criação preenche o projeto e a coluna quando existirem.
- Mover entre colunas e reordenar arrastando, pelo teclado (⇧ e setas) ou pelo menu. Concluir e reabrir (⌘↵) têm Desfazer.
- A mesma tarefa aparece no documento e no quadro, com estado consistente.
- A origem guarda documento, identificador de bloco quando disponível e trecho de referência. Mudar o título da tarefa não altera a prosa original.
- Apagar o trecho ou excluir o documento preserva a tarefa. A interface informa quando a origem está indisponível.
- Mover uma tarefa ou documento de projeto não move o outro silenciosamente. O vínculo de origem continua válido.

Colunas diferentes por projeto ficam fora do escopo, para manter o modelo simples.

## Acesso pelo Claude Code

Servidor MCP somente leitura para o Claude Code consultar o espaço, por exemplo um documento que descreve uma ideia, um desenho de arquitetura ou as tarefas de um projeto. Implementado na [etapa 07](etapas/07-mcp.md):

- Listar projetos e buscar documentos, desenhos e tarefas por palavras.
- Ler um documento em Markdown, com as tarefas que nasceram dele.
- Ler um desenho como imagem PNG e como textos e estrutura da cena, com as ligações das setas.
- Ler tarefas com coluna, posição, prazo, atraso, etiquetas, checklist e trecho de origem, filtrar por coluna e etiqueta, e ler a descrição em Markdown. A busca também acha tarefas pela descrição.
- Ver as pastas de cada projeto, com a contagem, e a pasta de cada documento e desenho na busca e na leitura.
- Itens na lixeira ficam de fora. O acesso usa um token pessoal somente leitura, criado e revogado no Perfil, que mostra o último uso de cada token.

**Planejado:**

- Itens incorporados como referências entram nas saídas do MCP com a etapa 11.
- Criar ou alterar conteúdo pelo MCP fica para depois.

## Em aberto

- Versão de celular da nova interface: ainda não desenhada.

## Limites atuais

Prioridades, anexos e calendários ficam fora da versão atual. A recuperação de um rascunho local protege a escrita. Sincronização offline completa e mesclagem automática de edições são decisões futuras.
