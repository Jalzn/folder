import { describe, expect, it } from 'vitest';
import { request, useAgentTools } from '../../testing/agent-tools.js';
import { drawingFixture } from '../../testing/canvas-scenes.js';
import { pngImage } from '../../testing/png.js';

describe('read_drawing', () => {
  const agent = useAgentTools();

  it('describes the current scene of a drawing', async () => {
    const canvas = await agent.service.createCanvas({
      ...request(),
      projectId: agent.project.id,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    const { text } = await agent.call('read_drawing', { id: canvas.id });
    expect(text).toContain(
      `Desenho "Fluxo" · Projeto "Projeto de teste" · versão 1 · atualizado em ${canvas.updatedAt} · ID ${canvas.id}`,
    );
    expect(text).toContain('Imagem: indisponível');
    expect(text).toContain('Quadro q1 "Ideia" (0, 0, 800×600)');
    expect(text).toContain('  s1 seta: e1 → (200, 0)');
    const imageOnly = await agent.call('read_drawing', { id: canvas.id, structure: false });
    expect(imageOnly.text).not.toContain('Elementos ativos');
    const project = await agent.service.createProject({ ...request(), name: 'Alfa · versão 9 "beta"' });
    const inProject = await agent.service.createCanvas({ ...request(), title: 'Mapa', projectId: project.id });
    expect((await agent.call('read_drawing', { id: inProject.id })).text).toContain(
      'Desenho "Mapa" · Projeto "Alfa · versão 9 \\"beta\\"" · versão 1 ·',
    );
    const empty = await agent.service.createCanvas({ ...request(), projectId: agent.project.id, title: 'Vazio' });
    expect((await agent.call('read_drawing', { id: empty.id })).text).toContain('Imagem: o desenho está vazio');
  });

  it('sends the stored preview as an image and flags one from an older version', async () => {
    const canvas = await agent.service.createCanvas({
      ...request(),
      projectId: agent.project.id,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    const png = pngImage(1200, 800);
    await agent.service.saveCanvasPreview({ id: canvas.id, version: 1, png });
    const read = (input: Record<string, unknown>) => agent.run('read_drawing', input);
    const current = await read({ id: canvas.id });
    expect(current?.content[0]).toMatchObject({
      text: expect.stringContaining('Imagem: versão 1 (atual), 1200×800 px'),
    });
    expect(current?.content[1]).toEqual({
      type: 'image',
      data: Buffer.from(png).toString('base64'),
      mimeType: 'image/png',
    });
    const renamed = await agent.service.saveCanvas({
      ...request(),
      id: canvas.id,
      expectedVersion: 1,
      title: 'Fluxo renomeado',
      scene: drawingFixture(),
    });
    expect((await read({ id: canvas.id }))?.content[0]).toMatchObject({
      text: expect.stringContaining('Imagem: versão 2 (atual), 1200×800 px'),
    });
    const changed = drawingFixture();
    changed.elements.pop();
    await agent.service.saveCanvas({
      ...request(),
      id: canvas.id,
      expectedVersion: renamed.version,
      title: 'Fluxo renomeado',
      scene: changed,
    });
    const stale = await read({ id: canvas.id });
    expect(stale?.content[0]).toMatchObject({
      text: expect.stringContaining(
        'Imagem: versão 1, 1200×800 px; a cena atual é a 3. A estrutura abaixo está atualizada',
      ),
    });
    expect(stale?.content).toHaveLength(2);
    const structureOnly = await read({ id: canvas.id, image: false });
    expect(structureOnly?.content).toHaveLength(1);
    expect(structureOnly?.content[0]).not.toMatchObject({ text: expect.stringContaining('Imagem:') });
  });
});
