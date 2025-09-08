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
  icon_size?: number;
  color_template?: string;
  column_reverse?: boolean;
  row_reverse?: boolean;
  icon_template?: string;
  state_template?: string;
  ignore_global?: boolean;
}
export interface IndicatorShowConfig {
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  show_entity_picture?: boolean;
  include_state_template?: boolean;
  state_content?: string[];
}
export interface IndicatorEntityBehavior extends IndicatorShowConfig {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

/** Base for any single item that is tied to an entity id */
// export interface IndicatorBaseItemConfig extends IndicatorVisual, IndicatorEntityBehavior {
//   entity: string;
// }

export interface IndicatorBaseItemConfig extends IndicatorVisual, IndicatorEntityBehavior {
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
  // not use entities from attribute of group entity
  ignore_group_members?: boolean;
  exclude_entities?: string[]; // Entities to exclude from the group members
}

/** Union for anything that can sit inside a row */
export type IndicatorRowItem = IndicatorEntityConfig | IndicatorRowGroupConfig;

/**
 * Interface for global appearance configuration
 * This allows setting default visual options for all items in the row.
 */
export interface GlobalAppearanceConfig {
  global_icon_size?: number; // Default icon size for items in the row
  global_column_reverse?: boolean; // Reverse the order name and state
  global_row_reverse?: boolean; // Reverse the order of icon and content
}
/**
 * Interface for indicator rows configuration
 *
 * This allows for combining single indicators and groups of indicators
 * into a single row configuration.
 */

export interface IndicatorRowConfig extends GlobalAppearanceConfig {
  row_items: IndicatorRowItem[]; // Array of indicator items in the row
  alignment?: string;
  no_wrap?: boolean;
}

export interface LovelaceIndicatorRowItem extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: IndicatorRowItem): void;
}

export type IndicatorCommon = IndicatorVisual & {
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
    color_template: i.color_template,
    icon_template: i.icon_template,
    icon_size: i.icon_size,
    column_reverse: i.column_reverse,
    row_reverse: i.row_reverse,
    state_template: i.state_template,
    ignore_global: i.ignore_global,
    // Safe because entity is required for entities and optional for groups:
    entity: (i as any).entity, // ok as read-only helper
  };
}
