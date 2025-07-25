import { Infer, object, optional, string } from 'superstruct';

export const entitySharedConfigStruct = object({
  entity: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  attribute: optional(string()),
});

export type EntitySharedConfig = Infer<typeof entitySharedConfigStruct>;
/**
 * EntityConfig interface for Lovelace cards.
 */

export interface EntityConfig {
  entity: string;
  type?: string;
  name?: string;
  icon?: string;
  image?: string;
}

export const templateSharedConfigStruct = object({
  state_template: optional(string()),
  icon_template: optional(string()),
  visibility: optional(string()),
});

export type TemplateSharedConfig = Infer<typeof templateSharedConfigStruct>;
