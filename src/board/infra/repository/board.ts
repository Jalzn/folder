import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { BoardRepository } from '../../application/ports/board.js';
import type { BoardTables } from '../sql/tables.js';

export function boardRepository(connection: Database): BoardRepository {
  const db = tables<BoardTables>(connection);
  return {
    async revision() {
      return (
        await db.selectFrom('workspace_state').select('board_revision').where('id', '=', 1).executeTakeFirstOrThrow()
      ).board_revision;
    },
    async bumpRevision() {
      const row = await db
        .updateTable('workspace_state')
        .set({ board_revision: sql`board_revision + 1` })
        .where('id', '=', 1)
        .returning('board_revision')
        .executeTakeFirstOrThrow();
      return row.board_revision;
    },
  };
}
