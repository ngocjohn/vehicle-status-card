import { ActionConfig } from '../../../ha/data/lovelace';
import { HomeAssistant } from '../../../ha/types';

export interface LovelaceRowItemConfig {
  type?: string;
  [key: string]: any;
}

/** Visual bits shared by all variants */
export interface IndicatorVisual {
  name?: string;
  icon?: string;
  color?: string;
  visibility?: string;
}
export interface IndicatorShowConfig {
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  show_entity_picture?: boolean;
  include_state_template?: boolean;
}
export interface IndicatorEntityBehavior extends IndicatorShowConfig {
  state_template?: string;
  icon_template?: string;
  state_content?: string[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

/** Base for any single item that is tied to an entity id */
// export interface IndicatorBaseItemConfig extends IndicatorVisual, IndicatorEntityBehavior {
//   entity: string;
// }

export interface IndicatorBaseItemConfig extends LovelaceRowItemConfig, IndicatorVisual, IndicatorEntityBehavior {
  type?: 'entity';
  entity: string;
}

/** Single entity */
export interface IndicatorEntityConfig extends IndicatorBaseItemConfig {
  type: 'entity';
}

/**
 * Group based on entity group platform
 * This automatically includes all entities by attribute.
 * It can also include additional members.
 */

/** A row-level group of items (not a HA entity group) */
export interface IndicatorRowGroupConfig extends IndicatorVisual, IndicatorEntityBehavior {
  type: 'group';
  entity?: string; // Entity ID of the group entity
  items?: IndicatorBaseItemConfig[];
}

/** Union for anything that can sit inside a row */
export type IndicatorRowItem = IndicatorEntityConfig | IndicatorRowGroupConfig;

/**
 * Interface for indicator rows configuration
 *
 * This allows for combining single indicators and groups of indicators
 * into a single row configuration.
 */

export interface IndicatorRowConfig {
  row_items: IndicatorRowItem[]; // Array of indicator items in the row
  alignment?: string;
  wrap?: boolean;
}

export interface LovelaceIndicatorRowItem extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: IndicatorRowItem): void;
}

export type IndicatorCommon = Pick<IndicatorVisual, 'name' | 'icon' | 'color' | 'visibility'> & {
  // Optional so you can read it without narrowing:
  entity?: string;
};

export function isEntity(i: IndicatorRowItem): i is IndicatorEntityConfig {
  return i.type === 'entity';
}

export function isGroup(i: IndicatorRowItem): i is IndicatorRowGroupConfig {
  return i.type === 'group';
}

export function toCommon(i: IndicatorRowItem): IndicatorCommon {
  return {
    name: i.name,
    icon: i.icon,
    color: i.color,
    visibility: i.visibility,
    entity: (i as any).entity, // ok as read-only helper
  };
}

export function showConfig(i: IndicatorEntityConfig): IndicatorShowConfig {
  return {
    show_name: i.show_name,
    show_state: i.show_state,
    show_icon: i.show_icon,
    show_entity_picture: i.show_entity_picture,
    include_state_template: i.include_state_template,
  };
}

export function itemActionsConfig(i: IndicatorRowItem): Pick<
  IndicatorEntityBehavior,
  'tap_action' | 'hold_action' | 'double_tap_action'
> & {
  entity?: string;
} {
  if (!isGroup(i)) {
    return {
      tap_action: i.tap_action,
      hold_action: i.hold_action,
      double_tap_action: i.double_tap_action,
      entity: i.entity,
    };
  } else {
    return {
      tap_action: undefined,
      hold_action: undefined,
      double_tap_action: undefined,
    };
  }
}

export function computeBaseEntitySchema(i: IndicatorEntityConfig) {
  return {
    name: i.name,
    icon: i.icon,
    color: i.color,
    show_name: i.show_name,
    show_state: i.show_state,
    show_icon: i.show_icon,
    show_entity_picture: i.show_entity_picture,
    include_state_template: i.include_state_template,
  };
}

export function computeRowActionsConfig(i: IndicatorRowItem) {
  if (isEntity(i)) {
    return {
      tap_action: i.tap_action,
      hold_action: i.hold_action,
      double_tap_action: i.double_tap_action,
    };
  } else {
    return {
      tap_action: undefined,
      hold_action: i.hold_action,
      double_tap_action: i.double_tap_action,
    };
  }
}
