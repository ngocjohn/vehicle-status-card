import { HomeAssistant } from './../home-assistant';

import type { Connection } from 'home-assistant-js-websocket';

export interface Lovelace {
  config: LovelaceConfig;
  rawConfig: LovelaceRawConfig;
  editMode: boolean;
  urlPath: string | null;
  mode: 'generated' | 'yaml' | 'storage';
  locale: any;
  enableFullEditMode: () => void;
  setEditMode: (editMode: boolean) => void;
  saveConfig: (newConfig: LovelaceRawConfig) => Promise<void>;
  deleteConfig: () => Promise<void>;
  showToast: (params: any) => void;
}

export function getLovelace(): Lovelace | null {
   
  let root: any = document.querySelector('home-assistant');
  root = root && root.shadowRoot;
  root = root && root.querySelector('home-assistant-main');
  root = root && root.shadowRoot;
  root = root && root.querySelector('app-drawer-layout partial-panel-resolver, ha-drawer partial-panel-resolver');
  root = (root && root.shadowRoot) || root;
  root = root && root.querySelector('ha-panel-lovelace');
  root = root && root.shadowRoot;
  root = root && root.querySelector('hui-root');
  if (root) {
    // dump property keys of HUI-ROOT:
    // for (const key of Object.keys(root)) {
    //   console.log('root property key: ' + key + ' = ' + root[key]);
    // }
    const ll = root.lovelace;
    //if (!ll) {
    //  //console.log("%cLL root.lovelace not found - getting root.__lovelace", "color:red");
    //  ll = root.__lovelace;
    //}
    //if (!ll) {
    //  //console.log("%cLL root.lovelace not found - getting root[__lovelace]", "color:red");
    //  ll = root["__lovelace"];
    //}
    //console.log("%cLL 06 = %s", "color:red", ll)
    ll.current_view = root.___curView;
    return ll;
  }
  return null;
}

const findHuiCard = (parentNode: any) => {
  let cardOptions = parentNode;
  while (cardOptions) {
    if (cardOptions.tagName === 'HUI-CARD-OPTIONS') {
      console.log('%cLL cardOptions found', 'color: green;', cardOptions);
      return cardOptions;
    }
    cardOptions = cardOptions.parentNode;
  }
  return cardOptions;
};

export function findCardIndex(card: any): Promise<string | null> {
  const ll = getLovelace();
  if (!ll) {
    console.log('%cLL not found', 'color: red;');
    return Promise.reject('Lovelace not found');
  }
  ll.setEditMode(true);

  // Return a promise that resolves after the timeout
  return new Promise((resolve) => {
    setTimeout(() => {
      const cardOptions = findHuiCard(card.parentNode);
      if (!cardOptions) {
        console.log('%cLL cardOptions not found', 'color: red;');
        ll.setEditMode(false);
        resolve(null);
        return;
      }
      const cardPath = cardOptions.__path;
      const urlPath = cardOptions.lovelace.urlPath;
      const cardStorageName = `${urlPath}-${cardPath.join('-')}`;
      ll.setEditMode(false);
      resolve(cardStorageName);
    }, 100); // Default delay is 100ms
  });
}

export type LovelaceCardPath = [number, number] | [number, number, number];
export type LovelaceContainerPath = [number] | [number, number];

export const parseLovelaceCardPath = (
  path: LovelaceCardPath
): { viewIndex: number; sectionIndex?: number; cardIndex: number } => {
  if (path.length === 2) {
    return {
      viewIndex: path[0],
      cardIndex: path[1],
    };
  }
  return {
    viewIndex: path[0],
    sectionIndex: path[1],
    cardIndex: path[2],
  };
};

export const parseLovelaceContainerPath = (
  path: LovelaceContainerPath
): { viewIndex: number; sectionIndex?: number } => {
  if (path.length === 1) {
    return {
      viewIndex: path[0],
    };
  }
  return {
    viewIndex: path[0],
    sectionIndex: path[1],
  };
};

export const getLovelaceContainerPath = (path: LovelaceCardPath): LovelaceContainerPath =>
  path.slice(0, -1) as LovelaceContainerPath;

type FindLovelaceContainer = {
  (config: LovelaceConfig, path: [number]): LovelaceViewRawConfig;
  (config: LovelaceConfig, path: [number, number]): LovelaceSectionRawConfig;
  (config: LovelaceConfig, path: LovelaceContainerPath): LovelaceViewRawConfig | LovelaceSectionRawConfig;
};
export const findLovelaceContainer: FindLovelaceContainer = (
  config: LovelaceConfig,
  path: LovelaceContainerPath
): LovelaceViewRawConfig | LovelaceSectionRawConfig => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  const view = config.views[viewIndex];

  if (!view) {
    throw new Error('View does not exist');
  }
  if (sectionIndex === undefined) {
    return view;
  }
  if (isStrategyView(view)) {
    throw new Error('Can not find section in a strategy view');
  }

  const section = view.sections?.[sectionIndex];

  if (!section) {
    throw new Error('Section does not exist');
  }
  return section;
};

export const findLovelaceCards = (
  config: LovelaceConfig,
  path: LovelaceContainerPath
): LovelaceCardConfig[] | undefined => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  const view = config.views[viewIndex];

  if (!view) {
    throw new Error('View does not exist');
  }
  if (isStrategyView(view)) {
    throw new Error('Can not find cards in a strategy view');
  }
  if (sectionIndex === undefined) {
    return view.cards;
  }

  const section = view.sections?.[sectionIndex];

  if (!section) {
    throw new Error('Section does not exist');
  }
  if (isStrategySection(section)) {
    throw new Error('Can not find cards in a strategy section');
  }
  return section.cards;
};

export const updateLovelaceContainer = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  containerConfig: LovelaceViewRawConfig | LovelaceSectionRawConfig
): LovelaceConfig => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  let updated = false;
  const newViews = config.views.map((view, vIndex) => {
    if (vIndex !== viewIndex) return view;

    if (sectionIndex === undefined) {
      updated = true;
      return containerConfig;
    }

    if (isStrategyView(view)) {
      throw new Error('Can not update section in a strategy view');
    }

    if (view.sections === undefined) {
      throw new Error('Section does not exist');
    }

    const newSections = view.sections.map((section, sIndex) => {
      if (sIndex !== sectionIndex) return section;
      updated = true;
      return containerConfig;
    });
    return {
      ...view,
      sections: newSections,
    };
  });

  if (!updated) {
    throw new Error('Can not update cards in a non-existing view/section');
  }
  return {
    ...config,
    views: newViews,
  };
};

export const updateLovelaceCards = (
  config: LovelaceConfig,
  path: LovelaceContainerPath,
  cards: LovelaceCardConfig[]
): LovelaceConfig => {
  const { viewIndex, sectionIndex } = parseLovelaceContainerPath(path);

  let updated = false;
  const newViews = config.views.map((view, vIndex) => {
    if (vIndex !== viewIndex) return view;
    if (isStrategyView(view)) {
      throw new Error('Can not update cards in a strategy view');
    }
    if (sectionIndex === undefined) {
      updated = true;
      return {
        ...view,
        cards,
      };
    }

    if (view.sections === undefined) {
      throw new Error('Section does not exist');
    }

    const newSections = view.sections.map((section, sIndex) => {
      if (sIndex !== sectionIndex) return section;
      if (isStrategySection(section)) {
        throw new Error('Can not update cards in a strategy section');
      }
      updated = true;
      return {
        ...section,
        cards,
      };
    });
    return {
      ...view,
      sections: newSections,
    };
  });

  if (!updated) {
    throw new Error('Can not update cards in a non-existing view/section');
  }
  return {
    ...config,
    views: newViews,
  };
};

export interface LovelaceCardEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceGenericElementEditor<C = any> extends HTMLElement {
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

export const fetchConfig = (conn: Connection, urlPath: string | null, force: boolean): Promise<LovelaceRawConfig> =>
  conn.sendMessagePromise({
    type: 'lovelace/config',
    url_path: urlPath,
    force,
  });

export const saveConfig = (hass: HomeAssistant, urlPath: string | null, config: LovelaceRawConfig): Promise<void> =>
  hass.callWS({
    type: 'lovelace/config/save',
    url_path: urlPath,
    config,
  });

export const deleteConfig = (hass: HomeAssistant, urlPath: string | null): Promise<void> =>
  hass.callWS({
    type: 'lovelace/config/delete',
    url_path: urlPath,
  });

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
  layout_options?: LovelaceLayoutOptions;
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
