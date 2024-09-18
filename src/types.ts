// Cutom card helpers:
import { LovelaceCardConfig, Themes, HomeAssistant, Theme } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

export interface ModeSpecificTheme {
  light: Partial<Theme>;
  dark: Partial<Theme>;
}

export interface ExtendedTheme extends Theme {
  modes?: ModeSpecificTheme;
}

export interface ExtendedThemes extends Themes {
  darkMode: boolean;
  themes: {
    [key: string]: ExtendedTheme;
  };
}

/**
 * HomeAssistantExtended extends the existing HomeAssistant interface with additional properties.
 */

export type HomeAssistantExtended = HomeAssistant & {
  themes: ExtendedThemes;
  formatEntityState: (stateObj: HassEntity) => string;
  formatAttributeName: (entityId: string, attribute: string) => string;
  formatEntityAttributeValue: (entityId: HassEntity, attribute: string) => string;
};

/* ----------------------- INDICATOR CONFIG INTERFACE ----------------------- */

// Indicator configuration for a single entity
export interface IndicatorConfig {
  entity: string;
  icon?: string;
  attribute?: string;
  state_template?: string;
  icon_template?: string;
}

export type IndicatorEntity = Array<{
  icon: string;
  state: string;
}>;

// IndicatorGroup configuration for a group of indicators
export interface IndicatorGroupConfig {
  name: string;
  icon: string;
  visibility: string;
  items: Array<IndicatorGroupItemConfig>; // Array of group items
}

// Configuration for individual items in the indicatorGroup
export interface IndicatorGroupItemConfig {
  entity: string;
  name: string;
  icon: string;
  state_template?: string;
  icon_template?: string;
  attribute?: string;
}

export type IndicatorGroupEntity = Array<{
  name: string;
  icon: string; // Group-level icon
  visibility?: boolean;
  items: Array<{
    name: string;
    icon: string;
    state: string;
  }>; // Array of individual indicator items
}>;

/* ----------------------- RANGE INFO CONFIG INTERFACE ---------------------- */

export interface RangeInfoConfig {
  energy_level: Array<RangeItemConfig>;
  range_level: Array<RangeItemConfig>;
  progress_color: string;
}

export interface RangeItemConfig {
  entity: string;
  attribute: string;
  icon?: string;
}

export type RangeInfoEntity = Array<{
  energy: string;
  range: string;
  progress_color: string;
  icon: string;
  level: number;
}>;

/* ------------------------- CONFIG IMAGES INTERFACE ------------------------ */

export interface ImageConfig {
  url: string;
  title: string;
}

/* ----------------------------- MINI MAP CONFIG ---------------------------- */

export interface MiniMapConfig {
  device_tracker: string;
  hours_to_show: number;
  default_zoom: number;
  theme_mode: 'auto' | 'light' | 'dark';
  enable_popup: boolean;
  google_api_key: string;
}

/* ------------------------- BUTTON AND CARD CONFIG ------------------------- */

export interface SecondaryInfoConfig {
  entity: string;
  attribute: string;
  state_template: string;
}
export interface ButtonConfig {
  primary: string;
  secondary: Array<SecondaryInfoConfig>;
  icon: string;
  notify: string;
}

export type ButtonEntity = {
  primary: string;
  secondary: string;
  icon: string;
  notify: boolean;
  buttonIndex: number;
};

export interface DefaultCardConfig {
  title: string;
  collapsed_items: boolean;
  items: Array<CardItemConfig>;
}

export interface CardItemConfig {
  entity: string;
  name: string;
  icon: string;
  attribute: string;
  state_template: string;
}

export interface ButtonCardConfig {
  button: ButtonConfig;
  hide_button: boolean;
  card_type: 'default' | 'custom';
  default_card: Array<DefaultCardConfig>;
  custom_card: LovelaceCardConfig[];
}

export interface CardItemEntity {
  entity: string;
  name: string;
  icon: string;
  state: string;
}

export type DefaultCardEntity = {
  title: string;
  collapsed_items: boolean;
  items: Array<{
    name: string;
    icon: string;
    state: string;
    entity: string;
  }>;
};

export type ButtonCardEntity = Array<{
  button: {
    primary: string;
    secondary: string;
    icon: string;
    notify: boolean;
  };
  hide_button: boolean;
  card_type: 'default' | 'custom';
  default_card: Array<{
    title: string;
    collapsed_items: boolean;
    items: Array<{
      name: string;
      icon: string;
      state: string;
      entity: string;
    }>;
  }>;
  custom_card: LovelaceCardConfig[];
}>;

export interface LayoutConfig {
  theme_config: {
    theme: string;
    mode: 'auto' | 'light' | 'dark';
  };

  button_grid: {
    rows: number;
    swipe: boolean;
  };
  hide: {
    button_notify: boolean;
    mini_map: boolean;
    buttons: boolean;
    indicators: boolean;
    range_info: boolean;
    images: boolean;
  };
}

/**
 * Configuration interface for the Vehicle Card.
 */

export interface VehicleStatusCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  indicators: {
    single: Array<IndicatorConfig>;
    group: Array<IndicatorGroupConfig>;
  };
  range_info: Array<RangeInfoConfig>;
  images: Array<ImageConfig>;
  mini_map: MiniMapConfig;
  button_card: Array<ButtonCardConfig>;
  layout_config: LayoutConfig;
}
