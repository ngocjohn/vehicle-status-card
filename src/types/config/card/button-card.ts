import type { LovelaceCardConfig } from '../../../ha';
import type { ActionConfig } from '../../../ha/data/lovelace';

import { TireTemplateConfig } from './tire-card';

export const ButtonType = ['default', 'action'] as const;
export const CardType = ['default', 'custom', 'tire'] as const;
export const PrimaryInfo = ['name', 'state', 'primary-template'] as const;

export type BUTTON_TYPE = (typeof ButtonType)[number];
export type CARD_TYPE = (typeof CardType)[number];
export type PRIMARY_INFO = (typeof PrimaryInfo)[number];

export interface ButtonShowConfig {
  show_primary?: boolean;
  show_secondary?: boolean;
  show_icon?: boolean;
  primary_info?: PRIMARY_INFO;
  include_state_template?: boolean;
  layout?: 'horizontal' | 'vertical';
  transparent?: boolean;
  secondary_multiline?: boolean;
  state_content?: string[];
}

export interface ButtonEntityBehavior {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface ButtonIconBehavior {
  icon_tap_action?: ActionConfig;
  icon_hold_action?: ActionConfig;
  icon_double_tap_action?: ActionConfig;
}

export interface ButtonNotifyBadgeConfig {
  notify?: string;
  notify_color?: string;
  notify_icon?: string;
  notify_text?: string;
}

export interface ButtonTemplatesConfig {
  state_template?: string;
  icon_template?: string;
  color_template?: string;
  primary_template?: string;
}

export interface DefaultCardItemConfig {
  entity?: string; // Entity ID for the card item
  state_color?: boolean;
  state_template?: string;
}

export interface CardDefaultConfig {
  collapsed?: boolean;
  title?: string;
  items?: DefaultCardItemConfig[];
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
  hide_button?: boolean;
  button_type?: BUTTON_TYPE;
  card_type?: CARD_TYPE;
  sub_card?: ButtonCardSubCardConfig;
}

/**
 * ButtonCardConfig Interface
 * This interface defines the structure of the button card configuration
 */

export type BaseButtonCardItemConfig = BaseButtonCardItem &
  ButtonShowConfig &
  ButtonEntityBehavior &
  ButtonIconBehavior &
  ButtonNotifyBadgeConfig &
  ButtonTemplatesConfig;

export const BUTTON_CARD_TEMPLATE_KEYS = [
  'primary_template',
  'state_template',
  'icon_template',
  'color_template',
  'notify',
  'notify_color',
  'notify_icon',
  'notify_text',
] as const;

export type ButtonCardTemplateKey = (typeof BUTTON_CARD_TEMPLATE_KEYS)[number];
