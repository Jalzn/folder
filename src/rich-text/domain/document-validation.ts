import type { DocumentBlock } from './document-models.js';
import { EMBED_ID, EMBED_LIMITS, EMBED_PROPS, type EmbedBlockType, isEmbedType } from './embeds.js';

export const MAX_DOCUMENT_BYTES = 1024 * 1024;
export const MAX_DOCUMENT_BLOCKS = 5000;
/** Local recovery can reopen a refused draft so its text can be exported or reduced. */
export const RECOVERY_DOCUMENT_LIMITS = { maxBytes: 5 * MAX_DOCUMENT_BYTES, maxBlocks: 20_000 } as const;
export interface DocumentContentLimits {
  maxBytes?: number;
  maxBlocks?: number;
}
export interface DocumentContentOptions {
  /** Documents take task and drawing embeds; a task's description does not. */
  embeds?: boolean;
}
const blockTypes = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'quote',
  'codeBlock',
  'mathBlock',
]);
const booleanStyles = new Set(['bold', 'italic', 'underline', 'strike', 'code']);
const colors = new Set(['textColor', 'backgroundColor']);
const alignment = new Set(['left', 'center', 'right', 'justify']);

function invalid(message: string): never {
  throw new Error(message);
}

function assertInline(value: unknown, allowRichContent = true): void {
  if (typeof value === 'string') return;
  if (!Array.isArray(value)) invalid('O conteúdo de um bloco precisa ser texto.');
  for (const item of value) {
    if (!object(item)) invalid('O documento contém um trecho inválido.');
    if (item.type === 'text') {
      if (typeof item.text !== 'string') invalid('O trecho precisa conter texto.');
      if (item.styles !== undefined && !object(item.styles)) invalid('A formatação do texto é inválida.');
      if (object(item.styles)) {
        for (const [key, value] of Object.entries(item.styles)) {
          if (booleanStyles.has(key) && typeof value === 'boolean') continue;
          if (colors.has(key) && validColor(value)) continue;
          invalid('A formatação do texto é inválida.');
        }
      }
    } else if (item.type === 'math' && allowRichContent) {
      // @blocknote/math-block 0.56 stores inline LaTeX as a plain string, with no props.
      // The source can be incomplete while editing; only its structure is validated here.
      if (item.props !== undefined && (!object(item.props) || Object.keys(item.props).length !== 0)) {
        invalid('As propriedades da equação são inválidas.');
      }
      if (typeof item.content !== 'string') invalid('A equação precisa conter uma fonte LaTeX em texto.');
    } else if (item.type === 'link' && allowRichContent) {
      if (typeof item.href !== 'string') invalid('O link precisa ter um endereço.');
      const href = item.href.trim();
      // BlockNote renders links in the browser. Keep only explicit safe schemes or relative references.
      if (
        Array.from(href).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
        (/^[a-z][a-z\d+.-]*:/iu.test(href) && !/^(https?:|mailto:|tel:)/iu.test(href))
      ) {
        invalid('Use um endereço http, https, mailto ou tel no link.');
      }
      assertInline(item.content, false);
    } else {
      invalid('Este tipo de conteúdo ainda não é suportado.');
    }
  }
}

function assertProps(type: string, props: unknown): void {
  if (!object(props)) invalid('As propriedades do bloco são inválidas.');
  if (type === 'mathBlock') {
    if (Object.keys(props).length !== 0) invalid('As propriedades da equação são inválidas.');
    return;
  }
  for (const [key, value] of Object.entries(props)) {
    if (type !== 'codeBlock' && colors.has(key) && validColor(value)) continue;
    if (type !== 'codeBlock' && key === 'textAlignment' && typeof value === 'string' && alignment.has(value)) continue;
    if (
      type === 'heading' &&
      key === 'level' &&
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 6
    )
      continue;
    if (type === 'heading' && key === 'isToggleable' && typeof value === 'boolean') continue;
    if (type === 'checkListItem' && key === 'checked' && typeof value === 'boolean') continue;
    if (type === 'numberedListItem' && key === 'start' && typeof value === 'number' && Number.isSafeInteger(value))
      continue;
    if (
      type === 'codeBlock' &&
      key === 'language' &&
      typeof value === 'string' &&
      value.length <= 100 &&
      /^[\w#+.-]*$/u.test(value)
    )
      continue;
    invalid('As propriedades do bloco são inválidas.');
  }
}

/** An embed has only its item's ID: no other prop, no text and no blocks inside. */
function assertEmbed(type: EmbedBlockType, block: Record<string, unknown>): void {
  const key = EMBED_PROPS[type];
  const props = block.props;
  if (
    !object(props) ||
    Object.keys(props).length !== 1 ||
    typeof props[key] !== 'string' ||
    !EMBED_ID.test(props[key] as string)
  )
    invalid('As propriedades do item incorporado são inválidas.');
  if (block.content !== undefined) invalid('Um item incorporado não tem texto.');
  if (block.children !== undefined && (!Array.isArray(block.children) || block.children.length))
    invalid('Um item incorporado não tem blocos internos.');
}

/**
 * RPC uses the default limits. Only local draft recovery opts into the larger bounded limits. A
 * document passes `embeds: true` and takes up to EMBED_LIMITS.perDocument task and drawing embeds;
 * without it, as for a task's description, an embed is refused.
 */
export function readDocumentContent(
  value: unknown,
  limits: DocumentContentLimits = {},
  options: DocumentContentOptions = {},
): DocumentBlock[] {
  const maxBytes = boundedLimit(limits.maxBytes, MAX_DOCUMENT_BYTES, RECOVERY_DOCUMENT_LIMITS.maxBytes);
  const maxBlocks = boundedLimit(limits.maxBlocks, MAX_DOCUMENT_BLOCKS, RECOVERY_DOCUMENT_LIMITS.maxBlocks);
  assertContentJson(value, {
    maxDepth: 40,
    plainObjects: false,
    depthMessage: 'O documento contém estruturas muito profundas.',
    propertyMessage: 'O documento contém uma propriedade inválida.',
    valueMessage: 'O documento contém um valor inválido.',
  });
  if (!Array.isArray(value)) invalid('O documento precisa ser uma lista de blocos.');
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > maxBytes) {
    invalid(
      `O documento ultrapassa o limite de ${maxBytes / (1024 * 1024)} MiB. Divida o conteúdo em mais documentos.`,
    );
  }
  const ids = new Set<string>();
  let count = 0;
  let embeds = 0;
  const walk = (blocks: unknown[], depth: number): void => {
    if (depth > 20) invalid('O documento contém muitos níveis de blocos.');
    for (const block of blocks) {
      count += 1;
      if (count > maxBlocks) invalid(`O documento ultrapassa o limite de ${maxBlocks.toLocaleString('pt-BR')} blocos.`);
      if (!object(block) || typeof block.type !== 'string') invalid('Este tipo de bloco ainda não é suportado.');
      const embed = isEmbedType(block.type);
      if (embed && !options.embeds) invalid('A descrição não aceita itens incorporados.');
      if (!embed && !blockTypes.has(block.type)) invalid('Este tipo de bloco ainda não é suportado.');
      if (block.id !== undefined) {
        if (typeof block.id !== 'string' || !block.id.length || block.id.length > 128)
          invalid('O identificador do bloco é inválido.');
        if (ids.has(block.id)) invalid('O documento contém identificadores de blocos repetidos.');
        ids.add(block.id);
      }
      if (isEmbedType(block.type)) {
        assertEmbed(block.type, block);
        embeds += 1;
        if (embeds > EMBED_LIMITS.perDocument)
          invalid(`Um documento aceita até ${EMBED_LIMITS.perDocument} itens incorporados.`);
        continue;
      }
      if (block.props !== undefined) assertProps(block.type, block.props);
      if (block.content !== undefined) {
        assertInline(block.content, block.type !== 'codeBlock' && block.type !== 'mathBlock');
      }
      if (block.children !== undefined) {
        if (!Array.isArray(block.children)) invalid('Os blocos internos são inválidos.');
        walk(block.children, depth + 1);
      }
    }
  };
  walk(value, 0);
  return value as unknown as DocumentBlock[];
}

import { assertContentJson, boundedLimit, object, validColor } from '@tinyfold/core/domain';
