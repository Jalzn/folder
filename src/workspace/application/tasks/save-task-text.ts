import type { TaskTextAck } from '../../domain/tasks.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { SaveTaskTextInput } from '../schemas/tasks.js';
import { assertVersion } from '../version.js';
import { requireTask } from './task-lookups.js';
import { taskText } from './task-rules.js';

/**
 * Saves a task's text, the title and the description, at the text's version: typing never conflicts
 * with a field changed elsewhere, which has its own version. The fields, their version and the board
 * revision stay. A task in the trash is not saved, as a document is not.
 */
export function saveTaskText(ctx: WorkspaceContext, input: SaveTaskTextInput): Promise<TaskTextAck> {
  return ctx.write('workspace.saveTaskText', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.textVersion, input.expectedTextVersion);
    const textVersion = task.textVersion + 1;
    const updatedAt = ctx.now();
    await repo.saveTaskText(
      { ...task, ...taskText(input.title, input.description, ctx.newId), textVersion, updatedAt },
      task.textVersion,
    );
    return { id: task.id, textVersion, updatedAt };
  });
}
