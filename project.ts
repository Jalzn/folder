import { defineProject } from '#core/application';
import { serverApplication } from '#server/application';

export const project = defineProject({
  id: 'tinyfold',
  applications: { server: serverApplication },
});
