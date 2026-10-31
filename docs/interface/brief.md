# Brief — exploração de interface do Tinyfold

Três equipes independentes recebem este mesmo brief e trabalham em paralelo, sem ver o trabalho umas das outras. O usuário vai comparar as três alternativas lado a lado. Cada equipe escolhe livremente a própria direção.

## Produto

Leia `/Users/standard/projects/tinyfold/docs/produto.md` inteiro antes de começar. Resumo:

- **Tinyfold** é um espaço pessoal e minimalista para conduzir projetos, de software ou não. Reúne escrita (documentos em blocos), desenho (Excalidraw) e tarefas (Kanban), que antes ficavam espalhados entre Notion, Excalidraw e Trello, num só lugar e sem o excesso dessas ferramentas.
- Uma única pessoa usa o app, em vários dispositivos, pelo navegador. Não há outras contas, compartilhamento nem colaboração.
- Peso do projeto: cerca de 60% laboratório de arquitetura e 40% ferramenta de uso diário.

Princípios:

1. **O projeto é o centro.** A página do projeto é a tela principal: abrir um projeto mostra seus documentos, desenhos e quadro. Um item pode nascer sem projeto, como captura rápida, e ser associado depois.
2. **Cada ferramenta faz menos que a original.** Minimalismo é a razão de existir.
3. **Ligações vivem nos documentos.** Um documento pode incorporar tarefas (como card) e desenhos (renderizados). As outras ferramentas não criam ligações.
4. **Nada se perde.** Salvamento automático com estados visíveis (salvando, salvo, falha), rascunho recuperável e conflitos explícitos.
5. **Uso pessoal.**

Fora do escopo: bancos de dados, propriedades configuráveis, modelos de página, hierarquias profundas de páginas, campos personalizados, automações, colaboração, outras contas, compartilhamento e ferramentas além das três.

## Liberdade

- A interface atual **não é vinculante**. Você pode mudar navegação, estrutura, densidade e identidade visual (paleta, tipografia, iconografia, tom).
- Para referência do estado atual: `/Users/standard/projects/tinyfold/docs/identidade-visual.md` e as capturas `docs/screens/*-desktop.png`.
- Evite cair no layout genérico "barra lateral + conteúdo" das ferramentas parecidas com o Notion só por hábito. Se escolher algo assim, que seja uma decisão defendida.

## Escopo desta rodada

Desktop, com referência de 1440×900. O celular fica fora desta rodada, mas o layout não deve depender de uma tela enorme.

Telas obrigatórias:

1. **Início e troca:** entrada do app, como alternar entre projetos, onde ficam os itens sem projeto, busca.
2. **Página do projeto (tela principal):** documentos, desenhos e quadro do projeto.
3. **Documento:** editor em blocos com uma **tarefa incorporada** (card com título, coluna, prazo, etiquetas e progresso do checklist; clicar abre a tarefa) e um **desenho incorporado** (versão atual, somente leitura; clicar abre o editor do desenho). Mostrar também um item incorporado **indisponível** (tarefa excluída), o estado de salvamento e a ação explícita de criar tarefa a partir de um trecho selecionado.
4. **Kanban:**
   - Colunas configuráveis, que formam um único conjunto para todo o espaço e servem tanto ao quadro geral quanto ao quadro do projeto. Dá para criar, renomear, reordenar e excluir colunas; excluir uma coluna com tarefas exige escolher o destino delas.
   - Uma das colunas é marcada como a de conclusão.
   - Os cards mostram prazo (com destaque quando a tarefa está atrasada), etiquetas e progresso do checklist.
   - Há filtros por etiqueta e por projeto.
   - Mover uma tarefa tem uma alternativa ao arrastar, por menu ou teclado.
5. **Detalhe da tarefa:**
   - Campos: título, coluna, prazo (só data), etiquetas e projeto.
   - A descrição usa o mesmo editor dos documentos. O checklist é feito com blocos de checklist dentro da descrição.
   - Mostra a origem documental, quando existir.
6. **Editor de desenho:** como o editor Excalidraw se encaixa na moldura do app (título, projeto, estado de salvamento, exportar). Represente a área do editor de forma esquemática, com algumas formas e setas, sem copiar a interface do Excalidraw.
7. **Perfil com token do MCP:**
   - O token é pessoal e somente leitura; o Claude Code o usa para consultar documentos, desenhos e tarefas.
   - Gerar um token mostra o valor uma única vez, com botão de copiar.
   - Lista os tokens com nome, data de criação e último uso, e permite revogar.
   - Mostra um exemplo ilustrativo do comando: `claude mcp add --transport http tinyfold https://[SEU-DOMÍNIO]/mcp --header "Authorization: Bearer <token>"`.
   - Inclui também as sessões ativas e a troca de senha.

## Dados de exemplo (use exatamente estes)

Hoje é sexta-feira, 30 de outubro de 2026. Usuário: "Você".

Colunas (conjunto único): **A fazer**, **Em andamento**, **Revisão** (criada pelo usuário) e **Concluído** (coluna de conclusão).

Etiquetas: `mcp`, `backend`, `editor`, `kanban`, `operação`, `fornecedores`, `compras`.

**Projeto Tinyfold** (software)

- Documentos:
  - "Visão do produto": tem a tarefa incorporada "Gerar token pessoal no Perfil", o desenho incorporado "Navegação com projeto no centro" e uma tarefa incorporada que foi excluída. Texto baseado no `produto.md`.
  - "MCP somente leitura".
  - "Notas de arquitetura".
- Desenhos: "Fluxo do autosave" e "Navegação com projeto no centro".
- Tarefas:

| Tarefa | Coluna | Prazo | Etiquetas | Outros |
| --- | --- | --- | --- | --- |
| Gerar token pessoal no Perfil | Em andamento | 04/11 | mcp, backend | checklist 2/5; origem: documento "MCP somente leitura" |
| Expor documentos em Markdown pelo MCP | A fazer | 12/11 | mcp | |
| Renderizar desenho incorporado no documento | A fazer | | editor | |
| Colunas configuráveis no quadro | Revisão | | kanban | checklist 3/3 |
| Configurar backup externo | A fazer | 28/10 | operação | **atrasada** |
| Corrigir foco ao fechar diálogo | Concluído | | editor | |

**Projeto Reforma do escritório** (não é software)

- Documentos: "Orçamento e fornecedores" e "Lista de compras".
- Desenho: "Planta do escritório".
- Tarefas:

| Tarefa | Coluna | Prazo | Etiquetas | Outros |
| --- | --- | --- | --- | --- |
| Pedir orçamento do marceneiro | A fazer | 03/11 | fornecedores | |
| Escolher luminária | Em andamento | | compras | checklist 1/3 |
| Pintar parede | A fazer | | | |
| Medir janela | Concluído | | | |

**Sem projeto:** documento "Ideias soltas", desenho "Rabisco de logo" e tarefa "Renovar domínio" (A fazer, prazo 15/11).

**Arquivado:** projeto "Site pessoal 2024".

**Token:** "Claude Code — notebook", criado em 30/10, último uso há 2 horas. **Sessões:** este navegador (desktop) e um celular.

## Restrições técnicas (viabilidade)

O app é uma SPA React. A implementação real terá estas peças:

- Editor de documentos: BlockNote, com parágrafo, títulos, listas, checklist, citação, código e equações LaTeX. Blocos personalizados são viáveis para os itens incorporados.
- Editor de desenho: Excalidraw 0.18, embutido e carregado sob demanda.
- Diálogos e menus: React Aria.
- Uma pessoa, sem colaboração em tempo real.

Proponha algo que esse stack consiga construir.

## Qualidade

- Texto da interface em português brasileiro: natural e curto. Nada de lorem ipsum nem métricas inventadas.
- Acessibilidade:
  - Contraste de 4,5:1 para texto.
  - Botões e links reais, com foco visível.
  - Toda ação de arrastar tem alternativa por teclado ou menu.
  - Cores que precisam ser distinguidas também diferem em luminosidade.
- Ícones em SVG de traço, nunca emoji. Evite clichês visuais de IA (degradês chamativos, cards com borda lateral colorida).
