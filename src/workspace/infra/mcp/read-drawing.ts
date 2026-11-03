import type { ReadingContext } from '../../application/reading/ports.js';
import { readDrawing } from '../../application/reading/read-drawing.js';
import { ReadDrawingInput } from '../../application/reading/schemas.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { formatCanvasOutline } from './format-outline.js';
import { drawingHeader } from './headers.js';
import { type AgentToolContent, defineTool, readOnlyAnnotations } from './types.js';

export const readDrawingTool = (reading: ReadingContext) =>
  defineTool({
    name: 'read_drawing',
    title: 'Ler desenho',
    description:
      'Lê um desenho do Tinyfold como imagem PNG e como estrutura textual: formas, textos, quadros, setas ' +
      'e o que cada seta liga, com coordenadas. A estrutura sempre reflete a versão atual; a imagem pode ser ' +
      'de uma versão anterior, o que a resposta informa. Use image: false quando a estrutura bastar. Recebe o ' +
      'ID de um link tinyfold:drawing/<id> de read_document.',
    inputSchema: ReadDrawingInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const { drawing, image, outline } = await readDrawing(reading, input);
      const head = drawingHeader({ drawing, image, outline });
      // The outline gets what the header leaves of the result, up to its own limit.
      const room = Math.min(READING_LIMITS.outline.maxChars, READING_LIMITS.toolTextChars - head.length - 2);
      const text = [head, ...(outline ? [formatCanvasOutline(outline, room)] : [])].join('\n\n');
      const content: AgentToolContent[] = [{ type: 'text', text }];
      if (image?.state === 'stored')
        content.push({ type: 'image', data: Buffer.from(image.png).toString('base64'), mimeType: 'image/png' });
      return { content };
    },
  });
