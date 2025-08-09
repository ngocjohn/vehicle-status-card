import { ActionConfig } from '../../../ha/data/lovelace';

/**
 * Interface for indicator rows configuration
 *
 * This allows for combining single indicators and groups of indicators
 * into a single row configuration.
 */

export interface IndicatorRowConfig {
  row_items: IndicatorRowItem[]; // Array of indicator items in the row
  alignment?: Alignment;
}

/**
 * Type for the items in an indicator row.
 * This can be either a single indicator item or a group of indicators.
 */
export type IndicatorRowItem = IndicatorEntityConfig | IndicatorGroup | IndicatorGroupEntity;

/**
 * Interface for an individual indicator item configuration
 */

export interface IndicatorBaseItemConfig {
  entity: string; // Entity ID for the item
  name?: string; // Name of the item
  icon?: string; // Icon for the item
  color?: string; // Color for the item
  show_name?: boolean; // Whether to show the name
  show_state?: boolean; // Whether to show the state
  show_icon?: boolean; // Whether to show the icon
  show_entity_picture?: boolean; // Whether to show the entity picture
  include_state_template?: boolean; // Whether to include template result in state content
  state_template?: string; // Template for the state content
  icon_template?: string; // Template for the icon
  state_content?: string | string[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  visibility?: string;
}

export interface IndicatorEntityConfig extends IndicatorBaseItemConfig {
  type: 'entity';
}

/**
 * Interface for an indicator group configuration
 * This groups multiple indicators together.
 */

export type IndicatorGroupItem = IndicatorBaseItemConfig | IndicatorEntityConfig;
export interface IndicatorGroup {
  type: 'group';
  name?: string;
  icon?: string;
  color?: string;
  visibility?: string;
  items?: IndicatorGroupItem[];
}

/**
 * Group based on entity group platform
 * This automatically includes all entities by attribute.
 * It can also include additional members.
 */

export interface IndicatorGroupEntity extends Partial<Omit<IndicatorBaseItemConfig, 'tap_action'>> {
  type: 'entity-group';
  entity: string; // Entity ID of the group
  extra_members?: string[]; // Additional entities in the group
}

// List of possible indicator row types
export const INDICATOR_ROW_LIST: IndicatorRowItem['type'][] = ['entity', 'group', 'entity-group'];

export const ALIGNMENT = ['default', 'start', 'center', 'end', 'justify'] as const;
export type Alignment = (typeof ALIGNMENT)[number];
