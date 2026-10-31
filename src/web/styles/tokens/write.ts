import { writeFileSync } from 'node:fs';
import { tokensCss } from './css';

/** `pnpm tokens`: writes src/web/styles/tokens.css from palette.ts and scale.ts. */
const target = new URL('../tokens.css', import.meta.url);
writeFileSync(target, tokensCss());
console.log(`Tokens gravados em ${target.pathname}`);
