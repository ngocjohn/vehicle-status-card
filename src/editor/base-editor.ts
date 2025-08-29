import { css, CSSResultGroup, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import editorcss from '../css/editor.css';
import { fireEvent, HomeAssistant } from '../ha';
import { EditorPreviewTypes } from '../utils/editor/types';
import { Store } from '../utils/store';
import { VehicleStatusCardEditor } from './editor';
import { PREVIEW_CONFIG_TYPES } from './editor-const';

const EditorCommandTypes = [
  'show-button',
  'show-image',
  'toggle-preview',
  'toggle-indicator-row',
  'toggle-helper',
  'toggle-highlight-row-item',
] as const;
type EditorCommandTypes = (typeof EditorCommandTypes)[number];

export type EditorEventParams = {
  type: EditorCommandTypes;
  data?: any;
};

declare global {
  interface HASSDomEvents {
    'editor-event': EditorEventParams;
  }
  interface WindowEventMap {
    'editor-event': CustomEvent<EditorEventParams>;
  }
}

export class BaseEditor extends LitElement {
  @property({ attribute: false }) _hass!: HomeAssistant;
  @property({ attribute: false }) protected _store!: Store;
  constructor() {
    super();
  }

  get _editor(): VehicleStatusCardEditor | undefined {
    return this._store._editor;
  }

  get _isPreviewGroup(): boolean {
    const config = this._editor?._config;
    return config
      ? config.hasOwnProperty('row_group_preview') && config.row_group_preview?.group_index !== null
      : false;
  }

  public _cleanConfig(): void {
    if (!this._store) return;
    const config = this._store.config;
    if (!config || typeof config !== 'object') return;
    let hasPreviewProperties = false;

    // Check if any of the preview config types exist in the config
    PREVIEW_CONFIG_TYPES.forEach((key) => {
      if (config.hasOwnProperty(key) && (config[key] === null || config[key] !== null)) {
        hasPreviewProperties = true;
      }
    });

    if (hasPreviewProperties) {
      PREVIEW_CONFIG_TYPES.forEach((key) => {
        if (config.hasOwnProperty(key)) {
          delete config[key];
          console.debug(`Removed preview config key: ${key}`);
        }
      });

      // Update config
      fireEvent(this, 'config-changed', { config });
      return;
    } else {
      return;
    }
  }

  public _dispatchEditorEvent(type: EditorCommandTypes, data?: any): void {
    console.debug(`sent editor command: ${type}`, data);
    fireEvent(this, 'editor-event', { type, data });
  }

  public _setPreviewConfig = <T extends keyof EditorPreviewTypes>(previewKey: T, value: EditorPreviewTypes[T]) => {
    if (!this._store) return;
    const config = this._store.config;
    if (!config || typeof config !== 'object') return;

    // Update config
    const newConfig = { ...config, [previewKey]: value };
    // console.debug(`Set preview config key: ${previewKey}`, value);
    fireEvent(this, 'config-changed', { config: newConfig });
    return;
  };

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          --ha-button-border-radius: var(--ha-border-radius-md, 8px);
        }
      `,

      editorcss,
    ];
  }
}
