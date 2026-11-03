import { z } from 'zod';
import { domainMessage } from '#core/application';
import { EMBED_ID, EMBED_LIMITS } from '#rich-text/domain';

/** The IDs embed blocks take (EMBED_ID), so every block the validator accepts can be resolved. */
const embedIds = z
  .array(z.string().regex(EMBED_ID, domainMessage('Identificador de item inválido.')))
  .max(
    EMBED_LIMITS.perDocument,
    domainMessage(`Um documento aceita até ${EMBED_LIMITS.perDocument} itens incorporados.`),
  );

/** The items one document embeds, at most EMBED_LIMITS.perDocument of each kind. */
export const ResolveEmbedsInput = z.strictObject({ taskIds: embedIds, canvasIds: embedIds });

export type ResolveEmbedsInput = z.infer<typeof ResolveEmbedsInput>;
