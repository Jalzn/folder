export const UNTITLED = 'Sem título';
export const titleOrUntitled = (title: string | undefined): string => title || UNTITLED;
export const collapseWhitespace = (text: string): string => text.replace(/\s+/gu, ' ').trim();
