/**
 * Interface Indicators Configuration
 * This interface defines the configuration for indicators in the vehicle status card.
 */

import { ActionsSharedConfig } from '../actions-config';
import { EntitySharedConfig, TemplateSharedConfig } from '../entity-config';

/**
 * Interface for the indicators configuration
 * This includes both single indicators and grouped indicators.
 * Each indicator can have its own entity, icon, templates, and action configurations.
 */
export interface IndicatorsConfig {
  single?: IndicatorItemConfig[]; // Array of single indicators
  group?: IndicatorGroupConfig[]; // Array of indicator groups
}

/**
 * Interface for an individual indicator item configuration
 */
export type IndicatorItemConfig = EntitySharedConfig &
  TemplateSharedConfig & {
    entity: string; // Entity ID for the indicator
    state_color?: boolean; // Whether to use state color
    color?: string; // Custom color for the indicator
    action_config?: ActionsSharedConfig; // Action configuration for the indicator
  };

/**
 * Interface for an indicator group configuration
 * This groups multiple indicators together.
 */
export interface IndicatorGroupConfig {
  name: string; // Name of the indicator group
  icon?: string; // Icon for the group
  items?: IndicatorItemConfig[]; // Array of indicator items in the group
  visibility?: string; // Visibility condition for the group
  color?: string; // Custom color for the group
}

export type SingleIndicator = IndicatorItemConfig & {
  type: 'single'; // Type of the indicator
};
export type GroupIndicator = IndicatorGroupConfig & {
  type: 'group'; // Type of the indicator group
};

// Combined type for indicator rows
// This allows for both single indicators and groups of indicators to be used interchangeably.
export type IndicatorRowItems = SingleIndicator | GroupIndicator;

// List of possible indicator row types
export const INDICATOR_ROW_LIST: IndicatorRowItems['type'][] = ['single', 'group'];

export const ALIGNMENT = ['default', 'start', 'center', 'end', 'justify'] as const;
export type Alignment = (typeof ALIGNMENT)[number];

export interface IndicatorRow {
  row_items: IndicatorRowItems[]; // Array of indicator items in the row
  alignment?: string;
}
