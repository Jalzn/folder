import type { ReadingContext } from '../../application/reading/ports.js';
import { type DrawingImage, readDrawing } from '../../application/reading/read-drawing.js';
import { ReadDrawingInput } from '../../application/reading/schemas.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { formatCanvasOutline } from './format-outline.js';
import { type AgentToolContent, defineTool, readOnlyAnnotations } from './types.js';

function imageLine(image: DrawingImage, version: number, withStructure: boolean): string {
  if (image.state === 'empty') return 'Imagem: o desenho está vazio';
  if (image.state === 'missing') return 'Imagem: indisponível. Abra o desenho no Tinyfold para gerá-la';
  const size = `${image.width}×${image.height} px`;
  // A rename or a trip to the trash bumps the version without changing what the image shows.
  if (image.current) return `Imagem: versão ${version} (atual), ${size}`;
  const note = withStructure ? '. A estrutura abaixo está atualizada' : '';
  return `Imagem: versão ${image.sceneVersion}, ${size}; a cena atual é a ${version}${note}`;
}

export const readDrawingTool = (reading: ReadingContext) =>
  defineTool({
    name: 'read_drawing',
    title: 'Ler desenho',
    description:
      'Lê um desenho do Tinyfold como imagem PNG e como estrutura textual: formas, textos, quadros, setas ' +
      'e o que cada seta liga, com coordenadas. A estrutura sempre reflete a versão atual; a imagem pode ser ' +
      'de uma versão anterior, o que a resposta informa. Use image: false quando a estrutura bastar.',
    inputSchema: ReadDrawingInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const { drawing, image, outline } = await readDrawing(reading, input);
      // Names are quoted: a "·" inside one could otherwise pass for another field.
      const project =
        drawing.projectName === null
          ? 'sem projeto'
          : `Projeto ${JSON.stringify(drawing.projectName)}${drawing.projectArchived ? ' (arquivado)' : ''}`;
      const header = [
        `Desenho ${JSON.stringify(drawing.title)} · ${project} · versão ${drawing.version} · atualizado em ${drawing.updatedAt} · ID ${drawing.id}`,
      ];
      if (image) header.push(imageLine(image, drawing.version, outline !== null));
      const head = header.join('\n');
      // The outline gets what the header leaves of the result, up to its own limit.
      const room = Math.min(READING_LIMITS.outline.maxChars, READING_LIMITS.toolTextChars - head.length - 2);
      const text = [head, ...(outline ? [formatCanvasOutline(outline, room)] : [])].join('\n\n');
      const content: AgentToolContent[] = [{ type: 'text', text }];
      if (image?.state === 'stored')
        content.push({ type: 'image', data: Buffer.from(image.png).toString('base64'), mimeType: 'image/png' });
      return { content };
    },
  });
