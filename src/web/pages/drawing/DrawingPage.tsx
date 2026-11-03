import '../../lib/files/excalidraw-assets';
import '@excalidraw/excalidraw/index.css';
import './drawing.css';
import { DrawingEditor } from './DrawingEditor';
import type { EditableCanvas } from './drawing-session';

/** A drawing's page, once its route found it under its own project. */
export function DrawingPage({ canvas }: { canvas: EditableCanvas }) {
  return <DrawingEditor key={canvas.id} canvas={canvas} />;
}
