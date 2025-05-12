import type { EntityConfig } from 'custom-card-helpers';
export function processEditorEntities(entities: (any | string)[]): EntityConfig[] {
  return entities.map((entityConf) => {
    if (typeof entityConf === 'string') {
      return { entity: entityConf };
    }
    return entityConf;
  });
}
