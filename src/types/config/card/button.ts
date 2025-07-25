/**
 * Interface for Button Card Config
 * This interface defines the structure of the button card configuration
 * used in the Vehicle Status Card.
 */

import type { TireEntity, TireTemplateConfig } from './tire-card';

import { LovelaceCardConfig } from '../../../ha';
import { ActionsSharedConfig } from '../actions-config';
import { EntitySharedConfig } from '../entity-config';

type BUTTON_TYPE = 'action' | 'default';
type CARD_TYPE = 'default' | 'custom' | 'tire';

/**
 * ButtonConfig Interface
 * This interface defines the structure of the button configuration
 */
export interface BaseButtonConfig {
  button: ButtonConfig;
  button_action?: ActionsSharedConfig;
  button_type?: BUTTON_TYPE;
  card_type?: CARD_TYPE;
  hide_button?: boolean;
}

export type SecondaryInfoConfig = {
  attribute?: string;
  entity?: string;
  state_template?: string;
};

export type NotifyConfig = Partial<{
  notify?: string;
  notify_color?: string;
  notify_icon?: string;
}>;

export interface ButtonConfig extends NotifyConfig {
  primary: string;
  secondary: SecondaryInfoConfig;
  icon?: string;
  color?: string;
  state_color?: boolean;
  picture_template?: string;
}

/**
 * Default Card Config Interface
 */

export type CardItemConfig = EntitySharedConfig & {
  entity: string; // Entity ID for the card item
  state_template?: string;
};

export interface DefaultCardConfig {
  collapsed_items?: boolean;
  title?: string;
  state_color?: boolean;
  items: CardItemConfig[];
}

/**
 * ButtonCardConfig Interface
 * This interface defines the structure of the button card configuration
 * used in the Vehicle Status Card.
 */

export interface ButtonCardConfig extends BaseButtonConfig {
  custom_card: LovelaceCardConfig[];
  default_card: DefaultCardConfig[];
  tire_card?: TireTemplateConfig;
}

export interface ButtonCardEntityItem {
  button: {
    button_action?: ActionsSharedConfig;
    icon: string;
    notify: string;
    primary: string;
    secondary: SecondaryInfoConfig;
    color: string;
    picture_template: string;
    notify_color?: string;
    notify_icon?: string;
    state_color?: boolean;
  };
  button_type: BUTTON_TYPE;
  card_type: CARD_TYPE;
  custom_card: LovelaceCardConfig[];
  default_card: DefaultCardConfig[];
  hide_button: boolean;
  tire_card?: TireEntity;
}
export type ButtonCardEntity = ButtonCardEntityItem[];
