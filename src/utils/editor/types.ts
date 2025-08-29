import { LovelaceViewConfig, ShowViewConfig, LovelaceCardConfig, ActionConfig } from '../../ha';
import { LovelaceRowItemConfig } from '../../types/config/card/row-indicators';

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
  elementConfig?: LovelaceRowItemConfig;
  type: string;
}

export interface EditSubElementEvent {
  subElementConfig: SubElementEditorConfig;
}

export interface EditorPreviewTypes {
  row_group_preview: {
    row_index?: number | null;
    group_index?: number | null;
    entity_index?: number | null;
  } | null;
}

export const enum EDITOR_PREVIEW {
  ROW_GROUP = 'row_group_preview',
}
