import { sql } from 'kysely';
import type { CivilDate } from '#core/domain';
/** Completion follows the column by the board triggers. A joined column can be used directly. */
export const openTask = (task: string, column?: string) =>
  sql<boolean>`${sql.ref(`${task}.deleted_at`)} is null and ${column ? sql`${sql.ref(`${column}.is_done`)} = 0` : sql`${sql.ref(`${task}.completed_at`)} is null`}`;
export const overdueOn = (today: CivilDate, task: string) =>
  sql<boolean>`(${openTask(task)}) and ${sql.ref(`${task}.due_on`)} < ${today}`;
