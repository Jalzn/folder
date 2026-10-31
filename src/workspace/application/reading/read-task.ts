import { AppError } from '@tinyfold/core/application';
import type { ReadingContext } from './ports.js';
import type { ReadTaskInput } from './schemas.js';

export async function readTask(ctx: ReadingContext, input: ReadTaskInput) {
  const task = await ctx.read((reader) => reader.task(input.id));
  if (!task) throw new AppError('NOT_FOUND', 'Tarefa não encontrada ou na lixeira.');
  return task;
}
