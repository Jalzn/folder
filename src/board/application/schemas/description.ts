import { z } from 'zod';
import { domainIssue } from '#core/application';
import { readDocumentContent } from '#rich-text/domain';
export const descriptionContent = z.unknown().transform((value, ctx) => {
  try {
    return readDocumentContent(value, {}, {});
  } catch (error) {
    ctx.addIssue(domainIssue(error instanceof Error ? error.message : 'Documento inválido.'));
    return z.NEVER;
  }
});
