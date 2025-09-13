import { Connection, HassServiceTarget } from 'home-assistant-js-websocket';

import { HomeAssistant } from '../types';

export interface LovelaceCardEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceCardConfig): void;
}

interface LovelaceGenericElementEditor<C = any> extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: LovelaceConfig;
  context?: C;
  setConfig(config: any): void;
  focusYamlEditor?: () => void;
}

// ****************************************************************************************************
// HA types.ts
// ****************************************************************************************************
export interface LovelaceDashboardBaseConfig {}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  isPanel?: boolean;
  preview?: boolean;
  layout?: string;
  getCardSize(): number | Promise<number>;
  getLayoutOptions?(): LovelaceLayoutOptions;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceConfig extends LovelaceDashboardBaseConfig {
  background?: string;
  views: LovelaceViewRawConfig[];
}

export interface LovelaceDashboardStrategyConfig extends LovelaceDashboardBaseConfig {
  strategy: LovelaceStrategyConfig;
}

export interface LegacyLovelaceConfig extends LovelaceConfig {
  resources?: LovelaceResource[];
}

export type LovelaceRawConfig = LovelaceConfig | LovelaceDashboardStrategyConfig;

export function isStrategyDashboard(config: LovelaceRawConfig): config is LovelaceDashboardStrategyConfig {
  return 'strategy' in config;
}

/* -------------------------------------------------------------------------- */
// HA view.ts
/* -------------------------------------------------------------------------- */

export interface ShowViewConfig {
  user?: string;
}

interface LovelaceViewBackgroundConfig {
  image?: string;
}

export interface LovelaceBaseViewConfig {
  index?: number;
  title?: string;
  path?: string;
  icon?: string;
  theme?: string;
  panel?: boolean;
  background?: string | LovelaceViewBackgroundConfig;
  visible?: boolean | ShowViewConfig[];
  subview?: boolean;
  back_path?: string;
  max_columns?: number; // Only used for section view, it should move to a section view config type when the views will have dedicated editor.
}

export interface LovelaceViewConfig extends LovelaceBaseViewConfig {
  type?: string;
  badges?: Array<string | LovelaceBadgeConfig>;
  cards?: LovelaceCardConfig[];
  sections?: LovelaceSectionRawConfig[];
}

export interface LovelaceStrategyViewConfig extends LovelaceBaseViewConfig {
  strategy: LovelaceStrategyConfig;
}

export type LovelaceViewRawConfig = LovelaceViewConfig | LovelaceStrategyViewConfig;

export function isStrategyView(view: LovelaceViewRawConfig): view is LovelaceStrategyViewConfig {
  return 'strategy' in view;
}

/* -------------------------------------------------------------------------- */
// HA section.ts exports.
/* -------------------------------------------------------------------------- */
export interface LovelaceBaseSectionConfig {
  visibility?: Condition[];
  column_span?: number;
  row_span?: number;
  /**
   * @deprecated Use heading card instead.
   */
  title?: string;
}

export interface LovelaceSectionConfig extends LovelaceBaseSectionConfig {
  type?: string;
  cards?: LovelaceCardConfig[];
}

export interface LovelaceStrategySectionConfig extends LovelaceBaseSectionConfig {
  strategy: LovelaceStrategyConfig;
}

export type LovelaceSectionRawConfig = LovelaceSectionConfig | LovelaceStrategySectionConfig;

export function isStrategySection(section: LovelaceSectionRawConfig): section is LovelaceStrategySectionConfig {
  return 'strategy' in section;
}

/* -------------------------------------------------------------------------- */
// HA strategy.ts
/* -------------------------------------------------------------------------- */
export interface LovelaceStrategyConfig {
  type: string;
  [key: string]: any;
}

/* -------------------------------------------------------------------------- */
// HA badge.ts
/* -------------------------------------------------------------------------- */
export interface LovelaceBadgeConfig {
  type: string;
  [key: string]: any;
  visibility?: Condition[];
}

export const ensureBadgeConfig = (config: Partial<LovelaceBadgeConfig> | string): LovelaceBadgeConfig => {
  if (typeof config === 'string') {
    return {
      type: 'entity',
      entity: config,
      show_name: true,
    };
  }
  if ('type' in config && config.type) {
    return config as LovelaceBadgeConfig;
  }
  return {
    type: 'entity',
    ...config,
  };
};

/* -------------------------------------------------------------------------- */
// HA card.ts
/* -------------------------------------------------------------------------- */
export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: any;
  /** @deprecated Use `grid_options` instead */
  layout_options?: LovelaceLayoutOptions;
  grid_options?: LovelaceGridOptions;
  type: string;
  [key: string]: any;
  visibility?: Condition[];
}

/* -------------------------------------------------------------------------- */
// HA types.ts
/* -------------------------------------------------------------------------- */
export type LovelaceLayoutOptions = {
  grid_columns?: number | 'full';
  grid_rows?: number | 'auto';
  grid_max_columns?: number;
  grid_min_columns?: number;
  grid_min_rows?: number;
  grid_max_rows?: number;
};

export interface LovelaceGridOptions {
  columns?: number | 'full';
  rows?: number | 'auto';
  max_columns?: number;
  min_columns?: number;
  min_rows?: number;
  max_rows?: number;
  fixed_rows?: boolean;
  fixed_columns?: boolean;
}
/* -------------------------------------------------------------------------- */
// HA validate-condition.ts
/* -------------------------------------------------------------------------- */

export type Condition =
  | NumericStateCondition
  | StateCondition
  | ScreenCondition
  | UserCondition
  | OrCondition
  | AndCondition;

// Legacy conditional card condition
export interface LegacyCondition {
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

interface BaseCondition {
  condition: string;
}

export interface NumericStateCondition extends BaseCondition {
  condition: 'numeric_state';
  entity?: string;
  below?: string | number;
  above?: string | number;
}

export interface StateCondition extends BaseCondition {
  condition: 'state';
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

export interface ScreenCondition extends BaseCondition {
  condition: 'screen';
  media_query?: string;
}

export interface UserCondition extends BaseCondition {
  condition: 'user';
  users?: string[];
}

export interface OrCondition extends BaseCondition {
  condition: 'or';
  conditions?: Condition[];
}

export interface AndCondition extends BaseCondition {
  condition: 'and';
  conditions?: Condition[];
}

// ****************************************************************************************************
// HA resource.ts
// ****************************************************************************************************
export type LovelaceResource = {
  id: string;
  type: 'css' | 'js' | 'module' | 'html';
  url: string;
};

export type LovelaceResourcesMutableParams = {
  res_type: LovelaceResource['type'];
  url: string;
};

export const fetchResources = (conn: Connection): Promise<LovelaceResource[]> =>
  conn.sendMessagePromise({
    type: 'lovelace/resources',
  });

export const createResource = (hass: HomeAssistant, values: LovelaceResourcesMutableParams) =>
  hass.callWS<LovelaceResource>({
    type: 'lovelace/resources/create',
    ...values,
  });

export const updateResource = (hass: HomeAssistant, id: string, updates: Partial<LovelaceResourcesMutableParams>) =>
  hass.callWS<LovelaceResource>({
    type: 'lovelace/resources/update',
    resource_id: id,
    ...updates,
  });

export const deleteResource = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: 'lovelace/resources/delete',
    resource_id: id,
  });

/**
 * ACTION CONFIG INTERFACES
 */

export interface ToggleActionConfig extends BaseActionConfig {
  action: 'toggle';
}

export interface CallServiceActionConfig extends BaseActionConfig {
  action: 'call-service' | 'perform-action';
  /** @deprecated "service" is kept for backwards compatibility. Replaced by "perform_action". */
  service?: string;
  perform_action: string;
  target?: HassServiceTarget;
  /** @deprecated "service_data" is kept for backwards compatibility. Replaced by "data". */
  service_data?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface NavigateActionConfig extends BaseActionConfig {
  action: 'navigate';
  navigation_path: string;
  navigation_replace?: boolean;
}

export interface UrlActionConfig extends BaseActionConfig {
  action: 'url';
  url_path: string;
}

export interface MoreInfoActionConfig extends BaseActionConfig {
  action: 'more-info';
  entity?: string;
}

export interface AssistActionConfig extends BaseActionConfig {
  action: 'assist';
  pipeline_id?: string;
  start_listening?: boolean;
}

export interface NoActionConfig extends BaseActionConfig {
  action: 'none';
}

export interface CustomActionConfig extends BaseActionConfig {
  action: 'fire-dom-event';
}

export interface BaseActionConfig {
  action: string;
  confirmation?: ConfirmationRestrictionConfig;
}

export interface ConfirmationRestrictionConfig {
  text?: string;
  exemptions?: RestrictionConfig[];
}

export interface RestrictionConfig {
  user: string;
}

export type ActionConfig =
  | ToggleActionConfig
  | CallServiceActionConfig
  | NavigateActionConfig
  | UrlActionConfig
  | MoreInfoActionConfig
  | AssistActionConfig
  | NoActionConfig
  | CustomActionConfig;

export type UiAction = Exclude<ActionConfig['action'], 'fire-dom-event'>;
