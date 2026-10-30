# Etapa 06 Canvas de desenho

**Estado:** recorte vetorial integrado na `main` e validado localmente. Imagens de referência permanecem para outra entrega.

O Tinyfold agora inclui Desenhos, um espaço para rascunhar interfaces, desenhar fluxos e conectar ideias com Excalidraw. Cada desenho tem título, URL própria, projeto opcional e salvamento com recuperação de rascunhos.

## Fluxo implementado

1. Criar um desenho no Início, na biblioteca Desenhos ou na aba de um projeto.
2. Desenhar com formas, setas, texto e traço livre; selecionar, agrupar, mover, ampliar e desfazer ações.
3. Editar título e projeto enquanto o conteúdo é salvo automaticamente.
4. Retomar pela biblioteca, pelos recentes mistos ou pelo projeto; buscar por título e texto.
5. Exportar PNG ou `.excalidraw`. Importar cria outro desenho e preserva o conteúdo aberto.
6. Excluir para a lixeira e restaurar com o conteúdo e o projeto preservados.

A listagem fica em `/desenhos` e o editor em `/desenhos/$canvasId`. Projetos têm as abas Documentos, Desenhos e Kanban com navegação por teclado. Links comuns permitem referenciar desenhos em documentos.

O recorte inicial é vetorial e inclui quadros de agrupamento. Imagens e conteúdo incorporado são bloqueados em ferramentas, colagem, arraste e importação. Anexos, blocos de prévia no BlockNote, vínculos com tarefas, IA e colaboração simultânea ficam para próximas entregas.

## Editor e fontes

O pacote `@excalidraw/excalidraw` está fixado em 0.18.1 e carrega sob demanda. O adaptador usa `initialData` para abrir a cena e `onChange` para capturar conteúdo. Seleção, cursor, menus e zoom não geram versões no servidor; posição e zoom ficam como preferências locais.

O editor usa português brasileiro e o tema grafite. O Vite copia fontes para a própria origem no desenvolvimento e no build. Um patch versionado do pacote remove o fallback de CDN quando há caminho explícito, preservando a política de fontes do Tinyfold. A exportação PNG usa o conteúdo atual e limita o maior lado a 4.096 pixels.

## Modelo e contratos

Desenhos pertencem ao módulo `workspace`, com tipos e validação de cena próprios, sem reutilizar blocos BlockNote nem importar o runtime Excalidraw no domínio. A migração adicional `002_canvases.sql` cria `workspace_canvases` sem alterar migrações aplicadas.

| Campos | Finalidade |
| --- | --- |
| `id`, `project_id` opcional | Identidade e agrupamento com chave estrangeira |
| `title`, `scene` JSON | Nome e conteúdo editável |
| `plain_text`, `search_text` | Busca por título e texto ativo |
| `format_version` | Versão do contrato de cena |
| `version`, `created_at`, `updated_at`, `deleted_at` | Concorrência, recentes e lixeira |

A API autenticada oferece `listCanvases`, `getCanvas`, `createCanvas`, `saveCanvas`, `deleteCanvas` e `restoreCanvas`. Listagens omitem a cena e mutações retornam ID, versão e data. O contexto existente garante transação SQLite, versão esperada e reenvio idempotente, com confirmações compactas no histórico de pedidos.

A leitura também retorna desenhos na lixeira, permitindo abrir rascunhos locais após exclusão remota. Gravar sobre um desenho excluído continua recusado. Projetos arquivados preservam desenhos existentes; novas cópias e importações usam destino sem projeto e informam essa mudança.

## Limites e recuperação

Cada cena persistida admite 1 MiB e 5.000 elementos. A recuperação local admite até 5 MiB e 20.000 elementos válidos, sem elevar o teto do servidor. Arquivos importados têm limite de 2 MiB; a cena compactada precisa respeitar o limite persistido. IDs, geometria, fontes, pontos, pressão, vínculos e tipos suportados são validados antes da escrita.

A compactação preserva elementos ativos e elementos excluídos referenciados transitivamente. Os demais são removidos somente do snapshot persistido/exportado; o editor mantém seu histórico nativo de desfazer. Isso permite reduzir ou limpar uma cena que ultrapassou os limites.

O controlador de autosave compartilhado preserva os formatos e chaves dos rascunhos de documentos. Desenhos usam namespace separado por instalação, ID e escritor da aba. Alterações de cena são capturadas imediatamente, com gravação local agrupada em janelas de até 100 ms e persistência adicional ao soltar o ponteiro ou sair. O servidor recebe uma chamada por vez, após uma pausa na edição.

Resposta perdida repete o mesmo pedido antes de enviar alterações novas. Sessão expirada mantém o rascunho durante o login. Conflitos oferecem carregar a versão salva ou guardar a edição como cópia. Exclusão remota, projeto arquivado e novas edições durante a criação de cópia preservam o acesso ao trabalho local. Rascunhos inválidos podem ser baixados sem abrir seu conteúdo no editor.

## Verificação

Os testes cobrem validação e compactação de cenas, rascunhos, pedidos imutáveis, concorrência em SQLite, migração de uma base anterior, reinício e backup/restauração independente. Os fluxos Chrome exercitam desenho real, exportação/importação, busca, projetos, lixeira, sessão expirada, abas duplicadas e recuperação após exclusão remota.

As evidências e comandos executados ficam em [validação](../validacao.md). Mobile usa emulação do Pixel 7; hospedagem pública continua pendente.

## Próximas entregas

Imagens de referência precisam de armazenamento de assets no SQLite, limites por arquivo e desenho, recuperação local de mídia, envio idempotente e backup completo antes de habilitar a ferramenta. Colaboração simultânea e recursos de IA exigem contratos próprios.

## Referências da integração

- [Componente Excalidraw](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration).
- [Propriedades do editor](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/).
- [Instalação e fontes locais](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation).
