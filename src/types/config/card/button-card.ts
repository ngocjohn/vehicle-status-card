import type { LovelaceCardConfig } from '../../../ha';
import type { ActionConfig } from '../../../ha/data/lovelace';

import { EntitySharedConfig } from '../entity-config';
import { TireTemplateConfig } from './tire-card';

export const ButtonType = ['default', 'action'] as const;
export const CardType = ['default', 'custom', 'tire'] as const;
export type BUTTON_TYPE = (typeof ButtonType)[number];
export type CARD_TYPE = (typeof CardType)[number];

export interface ButtonShowConfig {
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  show_entity_picture?: boolean;
  include_state_template?: boolean;
  state_content?: string[];
}

export interface ButtonEntityBehavior {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface ButtonNotifyBadgeConfig {
  notify?: string;
  notify_color?: string;
  notify_icon?: string;
}

export interface ButtonTemplatesConfig {
  state_template?: string;
  icon_template?: string;
  color_template?: string;
}

export interface DefaultCardItemConfig extends EntitySharedConfig {
  entity: string; // Entity ID for the card item
  state_color?: boolean;
  state_template?: string;
}

export interface CardDefaultConfig {
  collapsed?: boolean;
  title?: string;
  items: DefaultCardItemConfig[];
}

/**
 * Button Card Sub-Card Configuration
 * This interface defines the structure for sub-cards within a button card.
 * It supports different types of cards including default, custom, and tire cards.
 */
export interface ButtonCardSubCardConfig {
  default_card?: CardDefaultConfig[];
  custom_card?: LovelaceCardConfig[];
  tire_card?: TireTemplateConfig;
}

/**
 * Base Button Card Item Configuration
 */
export interface BaseButtonCardItem {
  name?: string;
  entity?: string;
  icon?: string;
  color?: string;
  button_type?: BUTTON_TYPE;
  card_type?: CARD_TYPE;
  hide_button?: boolean;
  sub_card?: ButtonCardSubCardConfig;
}

/**
 * ButtonCardConfig Interface
 * This interface defines the structure of the button card configuration
 */

export type BaseButtonCardItemConfig = BaseButtonCardItem &
  ButtonShowConfig &
  ButtonEntityBehavior &
  ButtonNotifyBadgeConfig &
  ButtonTemplatesConfig;
