import type { JsonValue } from '#core/domain';

export interface DocumentBlock {
  id?: string;
  type: string;
  props?: { [key: string]: JsonValue };
  content?: JsonValue;
  children?: DocumentBlock[];
}

export type DocumentContent = DocumentBlock[];
