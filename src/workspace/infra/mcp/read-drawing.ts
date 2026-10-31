import type { ReadingContext } from '../../application/reading/ports.js';
import { readDrawing } from '../../application/reading/read-drawing.js';
import { ReadDrawingInput } from '../../application/reading/schemas.js';
import { projectName, textResult } from './format.js';
import { formatCanvasOutline } from './format-outline.js';
import { defineTool, readOnlyAnnotations } from './types.js';

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
      const { drawing, empty, outline } = await readDrawing(reading, input);
      const project = projectName(drawing);
      const header = [
        `Desenho ${JSON.stringify(drawing.title)} · ${project ? `Projeto ${project}` : 'sem projeto'} · versão ${drawing.version} · atualizado em ${drawing.updatedAt} · ID ${drawing.id}`,
      ];
      if (input.image)
        header.push(
          `Imagem: ${empty ? 'o desenho está vazio' : 'indisponível. Abra o desenho no Tinyfold para gerá-la'}`,
        );
      return textResult([header.join('\n'), ...(outline ? [formatCanvasOutline(outline)] : [])].join('\n\n'));
    },
  });
