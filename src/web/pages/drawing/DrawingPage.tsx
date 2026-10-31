import '../../lib/excalidraw-assets';
import '@excalidraw/excalidraw/index.css';
import './drawing.css';
import { CanvasEditor } from './CanvasEditor';
import type { EditableCanvas } from './canvas-session';

/** A drawing's page, once its route found it under its own project. */
export function DrawingPage({ canvas }: { canvas: EditableCanvas }) {
  return <CanvasEditor key={canvas.id} canvas={canvas} />;
}
