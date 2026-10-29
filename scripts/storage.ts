import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

/** Creates a consistent snapshot without replacing an existing destination. */
export async function snapshot(source: string, destination: string): Promise<string> {
  const from = resolve(source);
  const to = resolve(destination);
  if (from === to) throw new Error('Origem e destino devem ser arquivos diferentes.');
  await stat(from);
  await mkdir(dirname(to), { recursive: true });
  const { open } = await import('node:fs/promises');
  const reserved = await open(to, 'wx', 0o600);
  await reserved.close();
  let db: Database.Database | undefined;
  try {
    db = new Database(from, { readonly: true, fileMustExist: true });
    if (db.pragma('quick_check', { simple: true }) !== 'ok')
      throw new Error('O banco de origem falhou na verificação.');
    await db.backup(to);
    const copied = new Database(to, { readonly: true, fileMustExist: true });
    try {
      if (copied.pragma('integrity_check', { simple: true }) !== 'ok') {
        throw new Error('A cópia falhou na verificação de integridade.');
      }
    } finally {
      copied.close();
    }
    return to;
  } catch (error) {
    await unlink(to).catch(() => undefined);
    throw error;
  } finally {
    db?.close();
  }
}
