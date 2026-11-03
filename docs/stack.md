# Tinyfold — Stack

**Estado:** implementada. Versões completas em `pnpm-lock.yaml`; ferramentas fixadas em `mise.toml` e `package.json`.

| Área | Implementação | Relação com Orbis |
| --- | --- | --- |
| Linguagem e pacotes | TypeScript estrito, pnpm 11.22.0 com um pacote na raiz | Módulos em camadas; configuração centralizada na etapa 14 |
| Execução | Node 26.12.1 e tsx | Mesmo padrão |
| Interface | React 19.3.1 e Vite 8.3.5 | Mesmo padrão |
| Navegação e dados | TanStack Router e Query | Mesmo padrão |
| UI | React Aria Components (diálogos, menus, `Autocomplete`, `Table`, `Tooltip`, `RadioGroup`), CSS com tokens gerados de `src/web/styles/tokens/`, Lucide | Identidade própria, sem Tailwind |
| Fontes | Inter completa de `inter-ui` 4.1.1 e JetBrains Mono de `@fontsource-variable/jetbrains-mono` 5.3.0, servidas pela própria origem | `inter-ui` substitui `@fontsource-variable/inter`, que não tem `cv05`, `ss03` nem `case` |
| Servidor | Hono e oRPC | SPA e API na mesma origem |
| Validação | Zod na fronteira e validação estrutural do documento | Contratos explícitos |
| Persistência | Kysely e better-sqlite3 13.0.3, SQLite 3.53.4 | Substitui PostgreSQL |
| Login | Conta única, scrypt, sessões por cookie | Adaptado do módulo auth |
| Editor | BlockNote 0.56.0 e integração Mantine; `@tiptap/pm` 3.32.0, a mesma cópia do ProseMirror que o BlockNote resolve, para o marcador de origem e os plugins dos incorporados | JSON versionado, Markdown e idioma pt-BR |
| Desenho | Excalidraw 0.18.1 | Cena vetorial própria, idioma pt-BR e carregamento sob demanda |
| Acesso por agentes | SDK MCP oficial `@modelcontextprotocol/server` 2.4.0, versão exata; cliente 2.4.0 só nos testes | Sem equivalente no Orbis; o SDK fica restrito a `src/server/mcp/` |
| Qualidade | Biome, tipos, dependency-cruiser, Vitest e Playwright | Testes de banco em SQLite e navegador Chrome |
| Operação | Docker, uma instância e volume persistente | Backup pela API do SQLite |

O driver inclui binários nativos para as plataformas suportadas; a instalação usa os binários distribuídos, sem executar um build node-gyp redundante. A conexão real e a imagem Linux foram exercitadas nos testes locais.

O editor carrega sob demanda ao abrir um documento. O CSS permanece antecipado para manter a ordem do tema estável. Os componentes React Aria cobrem diálogos, menus, o ⌘K, a tabela do Índice, dicas e grupos de rádio; o editor usa o tema Mantine do BlockNote com as variáveis apontadas para os tokens, e BlockNote e Excalidraw seguem o tema escolhido.

O JSON é a fonte do conteúdo. A exportação Markdown usa o serializador do domínio, o mesmo do MCP, e a importação usa a conversão do BlockNote; as duas podem perder propriedades que Markdown não representa. O escopo usa os blocos de texto suportados e, só no documento, as tarefas e os desenhos incorporados; upload de mídia e recursos XL não estão habilitados.

O BlockNote 0.56 não reexporta o `Plugin`, a `PluginKey` e as decorações do ProseMirror, e o pnpm não deixa importar um pacote não declarado. Por isso a web declara `@tiptap/pm` na versão que o BlockNote já usa: o lockfile só ganhou a entrada do importador. Um teste unitário falha se `prosemirror-view`, `-state` ou `-model` passarem a ter outra cópia, e outro confere que `domObserver.flush()`, interno do ProseMirror e usado pelas teclas dos incorporados, continua existindo. Ao atualizar o BlockNote, atualizar `@tiptap/pm` para a versão que ele resolve.

## Fontes do canvas

O Vite copia as fontes do pacote Excalidraw para `public/excalidraw/fonts`, tanto no desenvolvimento quanto antes do build. Essa pasta é gerada e fica fora do Git; o bundle recebe os arquivos na própria origem. `excalidraw-assets.ts` define `EXCALIDRAW_ASSET_PATH` antes de carregar o editor.

O pacote 0.18.1 acrescenta um CDN à lista de fontes mesmo quando o caminho local foi configurado. O patch em `patches/@excalidraw__excalidraw@0.18.1.patch`, registrado em `pnpm-workspace.yaml` e no lockfile, usa o fallback apenas quando não existe caminho explícito. A correção cobre as distribuições de desenvolvimento e produção; instalação com lockfile reaplica o patch. Ao atualizar o Excalidraw, revisar essa correção e repetir os testes de fontes e PNG sem violações de CSP.
