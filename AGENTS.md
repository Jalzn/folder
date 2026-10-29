# Tinyfold

Personal documents, projects and Kanban application. Implemented and validated locally; public hosting is pending.

Read `docs/produto.md`, `docs/arquitetura.md` and the current stage in `docs/etapas/` before implementation. The local reference is `../orbis`; inspect its implementation before adapting a pattern.

## Conventions

- Code, identifiers, code comments, commits and PRs: English.
- UI and documentation: Brazilian Portuguese. Use Portuguese URLs and English module names.
- Follow the pnpm workspace: `core`, `auth`, `workspace`, `server`, `web`.
- Business modules use `domain/`, `application/` and `infra/`, with explicit public exports.
- Domain rules are pure. Application code depends on ports, not SQL, HTTP or React. The server composes modules.
- Keep all persisted data on server-side SQLite. Use the Orbis account/password/session pattern.
- Document edits must preserve drafts, detect stale versions and allow safe retries.
- Applied migrations are immutable; append a new migration to change the database.
- Adapt Orbis SQL, migrations, locking, backups and request-size limits for Tinyfold. Inspect these explicitly when reusing code.
- Use the approved graphite, cool gray and subtle blue visual direction.
- Requested design explorations go through `claude-infinity-0` and Claude's native artifact system, with its returned artifact URL. The current reference is in `docs/identidade-visual.md`.
- Keep documentation consistent with implemented behavior and distinguish planned checks from executed checks.
- Database tests use isolated temporary SQLite files. Restore checks never overwrite the main database.

Use the pinned tools with `mise exec -- pnpm <command>`. `check` runs lint, types, dependency boundaries and unit tests. Run `test:db` for temporary SQLite databases; run `build` before `e2e` for Google Chrome desktop/mobile tests. `dev` starts the UI on localhost:5170. See `docs/implantacao.md` for setup and backup commands, and `docs/validacao.md` for executed checks.
