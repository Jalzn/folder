# Tinyfold — Stack

**Estado:** implementada. Versões completas em `pnpm-lock.yaml`; ferramentas fixadas em `mise.toml` e `package.json`.

| Área | Implementação | Relação com Orbis |
| --- | --- | --- |
| Linguagem e pacotes | TypeScript estrito, workspace pnpm 11.22.0 | Mesmo padrão |
| Execução | Node 26.12.1 e tsx | Mesmo padrão |
| Interface | React 19.3.1 e Vite 8.3.5 | Mesmo padrão |
| Navegação e dados | TanStack Router e Query | Mesmo padrão |
| UI | React Aria Components, CSS com tokens, Lucide e Inter | Identidade própria, sem Tailwind |
| Servidor | Hono e oRPC | SPA e API na mesma origem |
| Validação | Zod na fronteira e validação estrutural do documento | Contratos explícitos |
| Persistência | Kysely e better-sqlite3 13.0.3, SQLite 3.53.4 | Substitui PostgreSQL |
| Login | Conta única, scrypt, sessões por cookie | Adaptado do módulo auth |
| Editor | BlockNote 0.56.0 e integração Mantine | JSON versionado, Markdown e idioma pt-BR |
| Qualidade | Biome, tipos, dependency-cruiser, Vitest e Playwright | Testes de banco em SQLite e navegador Chrome |
| Operação | Docker, uma instância e volume persistente | Backup pela API do SQLite |

O driver inclui binários nativos para as plataformas suportadas; a instalação usa os binários distribuídos, sem executar um build node-gyp redundante. A conexão real e a imagem Linux foram exercitadas nos testes locais.

O editor carrega sob demanda ao abrir um documento. O CSS permanece antecipado para manter a ordem do tema estável. Os componentes React Aria cobrem diálogos e menus; o editor usa o tema Mantine do BlockNote com ajustes para a paleta do aplicativo.

O JSON é a fonte do conteúdo. Importação/exportação Markdown usa a conversão do BlockNote e pode perder propriedades que Markdown não representa. O escopo usa apenas blocos de texto suportados; upload de mídia e recursos XL não estão habilitados.
