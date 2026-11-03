import type { ApplicationDefinition, ApplicationModules, ApplicationServices } from './define-application.js';
import { assertDefinitionId } from './definition-id.js';

type ProjectApplications = Readonly<
  Record<string, ApplicationDefinition<string, never, ApplicationModules, ApplicationServices>>
>;

/** The software project and its application recipes; unrelated to user-created workspace projects. */
export class Project<Id extends string, Applications extends ProjectApplications> {
  readonly id: Id;
  readonly applications: Readonly<Applications>;

  constructor(definition: { id: Id; applications: Applications }) {
    assertDefinitionId(definition.id);
    for (const [name, application] of Object.entries(definition.applications)) {
      if (name !== application.id) throw new Error(`Application key ${name} must match its id ${application.id}.`);
    }
    this.id = definition.id;
    this.applications = Object.freeze({ ...definition.applications });
  }
}

export function defineProject<Id extends string, Applications extends ProjectApplications>(definition: {
  id: Id;
  applications: Applications;
}): Project<Id, Applications> {
  return new Project(definition);
}
