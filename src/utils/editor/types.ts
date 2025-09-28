import { LovelaceViewConfig, ShowViewConfig, LovelaceCardConfig, ActionConfig } from '../../ha';
import { LovelaceMapPopupConfig } from '../../types/config';
import { ButtonCardConfig } from '../../types/config/card/button';
import { PreviewType, ButtonCardSubCardConfig } from '../../types/config/card/button-card';
import { LovelaceRowItemConfig } from '../../types/config/card/row-indicators';

declare global {
  var __DEV__: boolean;
  var __DEMO__: boolean;
  var __BUILD__: 'latest' | 'es5';
  var __VERSION__: string;
  var __STATIC_PATH__: string;
  var __BACKWARDS_COMPAT__: boolean;
  var __SUPERVISOR__: boolean;

  interface Window {
    // Custom panel entry point url
    customPanelJS: string;
    ShadyCSS: {
      nativeCss: boolean;
      nativeShadow: boolean;
      prepareTemplate(templateElement, elementName, elementExtension);
      styleElement(element);
      styleSubtree(element, overrideProperties);
      styleDocument(overrideProperties);
      getComputedStyleValue(element, propertyName);
    };
  }
  // for fire event
  interface HASSDomEvents {
    'value-changed': {
      value: unknown;
    };
    change: undefined;
  }

  // For loading workers in webpack
  interface ImportMeta {
    url: string;
  }
}

export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
  };
}

export interface GUIModeChangedEvent {
  guiMode: boolean;
  guiModeAvailable: boolean;
}

export interface ViewEditEvent extends Event {
  detail: {
    config: LovelaceViewConfig;
  };
}

export interface ViewVisibilityChangeEvent {
  visible: ShowViewConfig[];
}

export interface ConfigValue {
  format: 'json' | 'yaml';
  value?: string | LovelaceCardConfig;
}

export interface ConfigError {
  type: string;
  message: string;
}

export interface EntityConfig {
  entity: string;
  type?: string;
  name?: string;
  icon?: string;
  image?: string;
}

export interface EntitiesEditorEvent {
  detail?: {
    entities?: EntityConfig[];
    item?: any;
  };
  target?: EventTarget;
}

export interface EditorTarget extends EventTarget {
  value?: string;
  index?: number;
  checked?: boolean;
  configValue?: string;
  type?: HTMLInputElement['type'];
  config: ActionConfig;
}

export interface Card {
  type: string;
  name?: string;
  description?: string;
  showElement?: boolean;
  isCustom?: boolean;
}

export interface HeaderFooter {
  type: string;
  icon?: string;
}

export interface CardPickTarget extends EventTarget {
  config: LovelaceCardConfig;
}

export interface SubElementEditorConfig {
  index?: number;
  elementConfig?:
    | LovelaceCardConfig
    | LovelaceRowItemConfig
    | LovelaceMapPopupConfig
    | ButtonCardSubCardConfig['default_card']
    | ButtonCardSubCardConfig['tire_card'];
  type: string;
  sub_card_type?: 'default_card' | 'custom_card' | 'tire_card';
}

export interface EditSubElementEvent {
  subElementConfig: SubElementEditorConfig;
}
export interface RowGroupPreviewConfig {
  row_index?: number | null;
  group_index?: number | null;
  entity_index?: number | null;
  peek?: boolean;
}
export interface ButtonSubCardPreviewConfig {
  type?: PreviewType | undefined | null;
  config?: ButtonCardSubCardConfig['custom_card' | 'default_card' | 'tire_card'];
}

export interface EditorPreviewTypes {
  row_group_preview: {
    config: RowGroupPreviewConfig | null;
  };
  default_card_preview: {
    config: ButtonCardConfig['default_card'];
  };
  card_preview: {
    config: ButtonCardConfig['custom_card'];
  };
  tire_preview: {
    config: ButtonCardConfig['tire_card'];
  };
  active_button: {
    config: number | null;
  };
}

export type EditorPreviewType = keyof EditorPreviewTypes;

export const enum EDITOR_PREVIEW {
  ROW_GROUP = 'row_group_preview',
}
