import { readCivilDate, readIsoInstant } from '@tinyfold/core/domain';
import { sql } from 'kysely';
import { expect, it } from 'vitest';
import { isOverdue } from '../../domain/task-dates.js';
import { useWorkspaceDb } from '../../testing/database.js';
import { openTask, overdueOn } from './task-predicates.js';

const workspace = useWorkspaceDb();
it('agrees with the domain across missing, past, current and future civil dates, completion and trash', async () => {
  const today = readCivilDate('2026-11-03');
  for (const dueOn of [null, readCivilDate('2026-11-02'), today, readCivilDate('2026-11-04')]) {
    for (const done of [false, true]) {
      for (const trashed of [false, true]) {
        const completedAt = done ? readIsoInstant('2026-11-01T12:00:00.000Z') : null;
        const deletedAt = trashed ? readIsoInstant('2026-11-02T12:00:00.000Z') : null;
        const result = await sql<{ overdue: number | null; open: number }>`
          select ${overdueOn(today, 'task')} as overdue, ${openTask('task')} as open
          from (select ${dueOn} as due_on, ${completedAt} as completed_at, ${deletedAt} as deleted_at) as task
        `.execute(workspace.db);
        expect(Boolean(result.rows[0]?.overdue)).toBe(!trashed && isOverdue(dueOn, today, done));
        expect(Boolean(result.rows[0]?.open)).toBe(!trashed && !done);
      }
    }
  }
});
