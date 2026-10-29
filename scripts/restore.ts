import { resolve } from 'node:path';
import { snapshot } from './storage.js';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  console.error('Uso: pnpm backup:restore <backup.sqlite> <novo-destino.sqlite>');
  process.exitCode = 1;
} else {
  try {
    console.log(`Cópia restaurada e verificada: ${await snapshot(resolve(source), resolve(destination))}`);
    console.log('Para usar esta base, pare o servidor e configure DATABASE_PATH com o novo caminho.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Falha ao restaurar o backup.');
    process.exitCode = 1;
  }
}
