import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { snapshot } from './storage.js';

test('backs up live WAL writes, restores independently, and refuses to replace a destination', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tinyfold-backup-'));
  const source = join(directory, 'source.sqlite');
  const backup = join(directory, 'backup.sqlite');
  const restored = join(directory, 'restored.sqlite');
  const db = new Database(source);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('wal_autocheckpoint = 0');
    db.exec('CREATE TABLE documents (title TEXT NOT NULL)');
    db.prepare('INSERT INTO documents VALUES (?)').run('Ideias que precisam sobreviver');
    await snapshot(source, backup);
    db.prepare('INSERT INTO documents VALUES (?)').run('Depois da cópia');
    await snapshot(backup, restored);
    const copy = new Database(restored);
    try {
      expect(copy.prepare('SELECT title FROM documents').all()).toEqual([{ title: 'Ideias que precisam sobreviver' }]);
    } finally {
      copy.close();
    }
    const before = await readFile(backup);
    await expect(snapshot(source, backup)).rejects.toThrow();
    expect(await readFile(backup)).toEqual(before);
    await expect(snapshot(source, source)).rejects.toThrow('diferentes');
  } finally {
    db.close();
    await rm(directory, { recursive: true, force: true });
  }
});
