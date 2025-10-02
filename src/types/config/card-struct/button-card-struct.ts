import { object, string, optional, boolean, number, array, unknown, union, literal, assign } from 'superstruct';

/**
 * TireEntityConfig
 */
export const tireEntityConfigStruct = object({
  entity: optional(string()),
  attribute: optional(string()),
  name: optional(string()),
  color: optional(string()),
});

/**
 * TireCardLayout
 */
export const tireCardLayoutStruct = object({
  title: optional(string()),
  background: optional(string()),
  background_entity: optional(string()),
  horizontal: optional(boolean()),
  image_size: optional(number()),
  value_size: optional(number()),
  top: optional(number()),
  left: optional(number()),
  hide_rotation_button: optional(boolean()),
});

/**
 * TireTemplateEntities
 */
export const tireTemplateEntitiesStruct = object({
  front_left: optional(tireEntityConfigStruct),
  front_right: optional(tireEntityConfigStruct),
  rear_left: optional(tireEntityConfigStruct),
  rear_right: optional(tireEntityConfigStruct),
});

/**
 * TireTemplateConfig
 * (extends TireCardLayout + TireTemplateEntities)
 */
export const tireTemplateConfigStruct = object({
  ...tireCardLayoutStruct.schema,
  ...tireTemplateEntitiesStruct.schema,
});

// Show options
export const buttonShowConfigStruct = object({
  show_primary: optional(boolean()),
  show_secondary: optional(boolean()),
  show_icon: optional(boolean()),
  show_entity_picture: optional(boolean()),
  include_state_template: optional(boolean()),
  state_content: optional(array(string())),
});

// Action configs (keep loose for now with unknown)
export const buttonEntityBehaviorStruct = object({
  tap_action: optional(unknown()),
  hold_action: optional(unknown()),
  double_tap_action: optional(unknown()),
});

export const buttonIconBehaviorStruct = object({
  icon_tap_action: optional(unknown()),
  icon_hold_action: optional(unknown()),
  icon_double_tap_action: optional(unknown()),
});

const combinedButtonBehaviorStruct = assign(buttonEntityBehaviorStruct, buttonIconBehaviorStruct);

// Notify badge
export const buttonNotifyBadgeConfigStruct = object({
  notify: optional(string()),
  notify_color: optional(string()),
  notify_icon: optional(string()),
  notify_text: optional(string()),
});

// Templates
export const buttonTemplatesConfigStruct = object({
  state_template: optional(string()),
  icon_template: optional(string()),
  color_template: optional(string()),
  primary_template: optional(string()),
});

// Default card item
export const defaultCardItemConfigStruct = object({
  entity: optional(string()),
  state_color: optional(boolean()),
  state_template: optional(string()),
});

export const cardDefaultConfigStruct = object({
  collapsed: optional(boolean()),
  title: optional(string()),
  items: optional(array(defaultCardItemConfigStruct)),
});

// Sub-card config
export const buttonCardSubCardConfigStruct = object({
  default_card: optional(array(cardDefaultConfigStruct)),
  custom_card: optional(array(unknown())), // LovelaceCardConfig
  tire_card: optional(tireTemplateConfigStruct),
});

// ---- Base Button Card Item ----
export const baseButtonCardItemStruct = object({
  name: optional(string()),
  entity: optional(string()),
  icon: optional(string()),
  color: optional(string()),
  button_type: optional(union([literal('default'), literal('action')])),
  card_type: optional(union([literal('default'), literal('custom'), literal('tire')])),
  hide_button: optional(boolean()),
  sub_card: optional(buttonCardSubCardConfigStruct),
});

// ---- Final merged struct ----

export const baseButtonCardItemConfigStruct = assign(
  baseButtonCardItemStruct,
  buttonShowConfigStruct,
  combinedButtonBehaviorStruct,
  buttonNotifyBadgeConfigStruct,
  buttonTemplatesConfigStruct
);

export const buttonCardConfigStruct = optional(array(baseButtonCardItemConfigStruct));
