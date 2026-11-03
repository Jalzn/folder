import { domainIssue } from '@tinyfold/core/application';
import { readDocumentContent } from '@tinyfold/rich-text/domain';
import { z } from 'zod';
export const descriptionContent = z.unknown().transform((value, ctx) => {
  try {
    return readDocumentContent(value, {}, {});
  } catch (error) {
    ctx.addIssue(domainIssue(error instanceof Error ? error.message : 'Documento inválido.'));
    return z.NEVER;
  }
});
