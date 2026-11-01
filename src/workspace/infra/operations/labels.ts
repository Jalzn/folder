import { createLabel, deleteLabel, listLabels, restoreLabel, updateLabel } from '../../application/labels/index.js';
import type { WorkspaceContext } from '../../application/ports.js';
import {
  CreateLabelInput,
  DeleteLabelInput,
  ListLabelsInput,
  RestoreLabelInput,
  UpdateLabelInput,
} from '../../application/schemas/labels.js';
import { operation } from './operation.js';

export const labelOperations = (ctx: WorkspaceContext) => ({
  listLabels: operation(ListLabelsInput, () => listLabels(ctx)),
  createLabel: operation(CreateLabelInput, (input) => createLabel(ctx, input)),
  updateLabel: operation(UpdateLabelInput, (input) => updateLabel(ctx, input)),
  deleteLabel: operation(DeleteLabelInput, (input) => deleteLabel(ctx, input)),
  restoreLabel: operation(RestoreLabelInput, (input) => restoreLabel(ctx, input)),
});
