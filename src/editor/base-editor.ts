import { HomeAssistantStylesManager } from 'home-assistant-styles-manager';
import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

import editorcss from '../css/editor.css';
import { fireEvent, HomeAssistant } from '../ha';
import { VehicleStatusCardConfig } from '../types/config';
import { computePopupCardConfig, mapCommonPopupConfig, computeExtraMapConfig } from '../types/config/card/mini-map';
import { Create } from '../utils';
import * as MIGRATE from '../utils/editor/migrate-indicator';
import { EditorPreviewTypes } from '../utils/editor/types';
import { selectTree } from '../utils/helpers-dom';
import { Store } from '../utils/store';
import { VehicleStatusCard } from '../vehicle-status-card';
import { VehicleStatusCardEditor } from './editor';
import { PREVIEW_CONFIG_TYPES } from './editor-const';
import './shared/vsc-yaml-editor';

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
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) protected _store!: Store;

  @property({ attribute: false }) _migrate = MIGRATE;
  @property() _domHelper = selectTree;
  @property() _computeMapPopupConfig = computePopupCardConfig;
  @property() _computeExtraMapConfig = computeExtraMapConfig;
  @property() _mapCommonPopupConfig = mapCommonPopupConfig;

  @property() _menuItemClicked!: (e: any) => void;

  protected _stylesManager: HomeAssistantStylesManager;

  constructor() {
    super();
    this._stylesManager = new HomeAssistantStylesManager({
      prefix: 'vsc-editor',
      throwWarnings: true,
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
  }
  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._store && !this._store.hass) {
      this._store.hass = hass;
    }
  }
  get hass(): HomeAssistant {
    return this._hass;
  }

  protected get _cardInPreview(): VehicleStatusCard | undefined {
    return this._store?._editor?._vscElem;
  }

  protected get _editor(): VehicleStatusCardEditor {
    return this._store._editor!;
  }

  get _isPreviewGroup(): boolean {
    const config = this._editor?._config;
    return config
      ? config.hasOwnProperty('row_group_preview') && config.row_group_preview?.group_index !== null
      : false;
  }

  protected get _cardConfig(): VehicleStatusCardConfig | undefined {
    return this._editor?._config as VehicleStatusCardConfig;
  }

  protected _createAlert(message: string): TemplateResult {
    return Create.HaAlert({
      message,
    });
  }
  /**
   * Create a vsc-editor-form element
   * @param data config data
   * @param schema HA form schema
   * @param key vsc config key
   * @param subKey sub key for nested objects
   * @value-changed event handler _changed or _onValueChanged
   */
  protected _createVscForm(data: any, schema: any, key?: string, subKey?: string): TemplateResult {
    const currentConfig = this._store?.config;
    return html`
      <vsc-editor-form
        ._hass=${this._hass}
        .data=${data}
        .schema=${schema}
        .currentConfig=${currentConfig}
        .key=${key}
        .subKey=${subKey}
        @value-changed=${this._onValueChanged}
      ></vsc-editor-form>
    `;
  }

  protected _onValueChanged(ev: CustomEvent): void {
    console.debug('onValueChanged (BaseEditor)');
    ev.stopPropagation();
    const { key, subKey, currentConfig } = ev.target as any;
    const value = { ...ev.detail.value };
    console.debug('onValueChanged:', { key, subKey, value });
    if (!currentConfig || typeof currentConfig !== 'object') return;
    console.debug('incoming:', { key, subKey, currentConfig, value });

    const updates: Partial<VehicleStatusCardConfig> = {};
    if (key && subKey) {
      if (typeof currentConfig[key] !== 'object' || currentConfig[key] === null) {
        currentConfig[key] = {};
      }
      currentConfig[key][subKey] = value;
      updates[key] = currentConfig[key];
    } else if (key) {
      updates[key] = value;
    } else {
      Object.assign(updates, value);
    }
    console.debug('updates:', updates);
    if (Object.keys(updates).length > 0) {
      const newConfig = { ...currentConfig, ...updates };
      fireEvent(this, 'config-changed', { config: newConfig });
    }
    return;
  }

  /**
   * Create YAML editor
   * @param configValue current config value
   * @param key attribute key
   * @param subKey sub key for nested objects
   * @param extraAction show close editor button, default false
   */
  protected _createVscYamlEditor(
    configValue: any,
    key?: string | number,
    subKey?: string | number,
    extraAction = true
  ): TemplateResult {
    return html`
      <vsc-yaml-editor
        .hass=${this._hass}
        .configDefault=${configValue}
        .key=${key}
        .subKey=${subKey}
        .extraAction=${extraAction}
        @yaml-value-changed=${this._onYamlChanged}
        @yaml-editor-closed=${this._onYamlEditorClosed}
      ></vsc-yaml-editor>
    `;
  }

  protected _onYamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('YAML changed (BaseEditor)');
    const { key, subKey } = ev.target as any;
    const value = ev.detail;
    console.debug('YAML changed:', { key, subKey, value });
  }
  protected _onYamlEditorClosed(ev: CustomEvent): void {
    ev.stopPropagation();
    const { key, subKey } = ev.target as any;
    console.debug('YAML editor closed:', { key, subKey });
    fireEvent(this, 'yaml-editor-closed', undefined);
  }

  public _cleanConfig(): void {
    if (!this._store) return;
    const config = this._store.config;
    if (!config || typeof config !== 'object') return;

    const newConfig = { ...config };

    let hasChanges = false;
    // Check if any of the preview config types exist in the config
    PREVIEW_CONFIG_TYPES.forEach((key) => {
      if (newConfig.hasOwnProperty(key)) {
        delete newConfig[key];
        hasChanges = true;
        console.debug(`Removed preview config key: ${key}`);
      }
    });

    if (hasChanges) {
      // Update config
      fireEvent(this, 'config-changed', { config: newConfig });
      return;
    } else {
      return;
    }
  }

  public _dispatchEditorEvent(type: EditorCommandTypes, data?: any): void {
    // console.debug(`sent editor command: ${type}`, data);
    fireEvent(this, 'editor-event', { type, data });
  }

  protected _showRow = (rowIndex: number | null, peek = false): void => {
    this._dispatchEditorEvent('toggle-indicator-row', { rowIndex, peek });
  };

  public _setPreviewConfig = <T extends keyof EditorPreviewTypes>(
    previewKey: T,
    value: EditorPreviewTypes[T]['config']
  ) => {
    if (!this._store) return;
    const config = this._store.config;
    if (!config || typeof config !== 'object') return;

    // Update config
    const newConfig = { ...config, [previewKey]: value };
    // console.debug(`Set preview config key: ${previewKey}`, value);
    fireEvent(this, 'config-changed', { config: newConfig });
    return;
  };

  protected _cardConfigChanged(changedConfig: Partial<VehicleStatusCardConfig>): void {
    if (!this._store) return;
    const config = this._store.config;
    if (!config || typeof config !== 'object') return;

    // Update config
    const newConfig = { ...config, ...changedConfig };
    console.debug('Card config changed:', changedConfig, newConfig);
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          --ha-button-border-radius: var(--ha-border-radius-md, 8px);
        }
        *[hidden],
        .hidden {
          display: none !important;
        }
        *[active] {
          color: var(--primary-color);
        }
        .error {
          color: var(--error-color);
        }
        .warning {
          color: var(--warning-color);
        }
        .success {
          color: var(--success-color);
        }
        .info {
          color: var(--info-color);
        }
        li[divider] {
          margin: 4px 0;
          border-bottom: 1px solid var(--divider-color);
        }
      `,

      editorcss,
    ];
  }
}
