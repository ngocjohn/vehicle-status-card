/** Compute the object ID of a state. */
export const computeObjectId = (entityId: string): string => entityId.substring(entityId.indexOf('.') + 1);
