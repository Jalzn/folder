import { describe, expect, it } from 'vitest';
import { columnOfStatus, statusOfColumn } from './task-status.js';

const columns = [
  { id: 'todo', name: 'A fazer', isDone: false },
  { id: 'doing', name: 'Em andamento', isDone: false },
  { id: 'review', name: 'Revisão', isDone: false },
  { id: 'done', name: 'Concluído', isDone: true },
];

describe('statuses of stage 09, until B6', () => {
  it('reads each column as the status the old interface knows', () => {
    expect(columns.map((column) => statusOfColumn(columns, column.id))).toEqual(['todo', 'doing', 'doing', 'done']);
    const renamed = [{ id: 'first', name: 'Ideias', isDone: false }, ...columns.slice(1)];
    expect(statusOfColumn(renamed, 'first')).toBe('todo');
  });

  it('finds the column a status stands for, by name and then by place', () => {
    expect(columnOfStatus(columns, 'todo')).toBe('todo');
    expect(columnOfStatus(columns, 'doing')).toBe('doing');
    expect(columnOfStatus(columns, 'done')).toBe('done');
    const renamed = [
      { id: 'one', name: 'Ideias', isDone: false },
      { id: 'two', name: 'Fazendo', isDone: false },
      { id: 'end', name: 'Pronto', isDone: true },
    ];
    expect([columnOfStatus(renamed, 'todo'), columnOfStatus(renamed, 'doing')]).toEqual(['one', 'two']);
    expect(columnOfStatus([renamed[0], renamed[2]] as typeof renamed, 'doing')).toBe('one');
  });
});
