import type { JsonValue } from './json.js';
export const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
export const validColor = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 100 &&
  /^(?:[a-z]+|#[a-f\d]{3,8}|(?:rgb|hsl)a?\([\d\s.,%/+-]+\))$/iu.test(value);
export function boundedLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error('Limite de leitura inválido.');
  return value;
}
interface JsonPolicy {
  maxDepth: number;
  plainObjects: boolean;
  depthMessage: string;
  propertyMessage: string;
  valueMessage: string;
}
/** The scene requires plain objects and a shallower tree; documents preserve their existing policy. */
export function assertContentJson(value: unknown, policy: JsonPolicy, depth = 0): asserts value is JsonValue {
  if (depth > policy.maxDepth) throw new Error(policy.depthMessage);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    for (const item of value) assertContentJson(item, policy, depth + 1);
    return;
  }
  if (
    object(value) &&
    (!policy.plainObjects || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  ) {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) throw new Error(policy.propertyMessage);
      assertContentJson(item, policy, depth + 1);
    }
    return;
  }
  throw new Error(policy.valueMessage);
}
