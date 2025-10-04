import { isEmpty } from 'es-toolkit/compat';
import { HomeAssistantStylesManager } from 'home-assistant-styles-manager';
import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

import editorcss from '../css/editor.css';
import { EditorConfigAreaSelectedEvent } from '../events';
import { EditorIndicatorRowSelectedEvent } from '../events/editor-indicator-row';
import { fireEvent, HomeAssistant } from '../ha';
import { showFormDialog } from '../ha/dialogs/form/show-form-dialog';
import { SectionOrder, VehicleStatusCardConfig } from '../types/config';
import { ConfigArea } from '../types/config-area';
import { SECTION } from '../types/section';
import { Create } from '../utils';
import { getSectionFromConfigArea } from '../utils/editor/area-select';
import { selectTree } from '../utils/helpers-dom';
import { Store } from '../utils/store';
import { VehicleStatusCard } from '../vehicle-status-card';
import { VehicleStatusCardEditor } from './editor';
import { PREVIEW_CONFIG_TYPES } from './editor-const';
import {
  BUTTON_GRID_LAYOUT_SCHEMA,
  BUTTON_GRID_SCHEMA,
  IMAGES_LAYOUT_SCHEMA,
  SECTION_ORDER_SCHEMA,
  SLIDE_SIZE_SCHEMA,
  SWIPE_BEHAVIOR_SCHEMA,
} from './form';

const EditorCommandTypes = [
  'show-button',
  'show-image',
  'toggle-preview',
  'toggle-indicator-row',
  'toggle-helper',
  'toggle-highlight-row-item',
  'reset-preview',
  'highlight-button',
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

  @property() _domHelper = selectTree;

  protected _stylesManager: HomeAssistantStylesManager;

  protected _editorArea?: ConfigArea;

  constructor(area?: ConfigArea) {
    super();
    this._stylesManager = new HomeAssistantStylesManager({
      prefix: 'vsc-editor',
      throwWarnings: true,
    });
    if (area) {
      this._editorArea = area;
    }
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

  get cardPreview(): VehicleStatusCard | undefined {
    return this._store?.cardPreview;
  }

  protected get _cardInPreview(): VehicleStatusCard | undefined {
    return this._store?._editor?._vscElem;
  }

  protected get _editor(): VehicleStatusCardEditor {
    return this._store._editor!;
  }

  get _isPreviewGroup(): boolean {
    return this._cardInPreview?.isGroupIndiActive || false;
  }

  protected get _cardConfig(): VehicleStatusCardConfig | undefined {
    return this._editor?._config as VehicleStatusCardConfig;
  }

  get _legacyIndicator(): boolean {
    return !!(this._cardConfig?.indicators && Object.keys(this._cardConfig.indicators).length > 0);
  }

  get _notEmptyOrder(): SectionOrder[] {
    const order = this._store?._config?.layout_config?.section_order || [];
    const config = this._store?._config;
    if (!order || !config) return [];
    return Array.from(order).filter((section) => {
      const secConfig =
        section === SECTION.BUTTONS
          ? config.button_cards
          : section === SECTION.INDICATORS
          ? config.indicator_rows
          : config[section];
      return !isEmpty(secConfig);
    });
  }

  protected _getButtonGridCols(): number {
    const cols = this._cardConfig?.layout_config?.button_grid?.columns || 2;
    return Math.max(2, Math.min(cols, 4)); // Clamp between 2 and 4
  }
  protected openLayoutConfigModal = async (section: SectionOrder) => {
    if (!this._store) return;
    const config = { ...(this._store._config || {}) };
    if (!config || typeof config !== 'object') return;

    let title: string = 'Sections Order';
    const data = {} as Record<string, any>;
    const schema: any[] = [...SECTION_ORDER_SCHEMA];

    data['section_order'] = config.layout_config?.section_order || [];

    if (section === SECTION.BUTTONS) {
      data['button_grid'] = config.layout_config?.button_grid || {};
      schema.unshift(...BUTTON_GRID_LAYOUT_SCHEMA(!data['button_grid']?.swipe, 'button_grid'));
      title += ' & Button Grid';
    }

    if (section === SECTION.IMAGES) {
      data['images_swipe'] = config.layout_config?.images_swipe || {};
      schema.unshift(...IMAGES_LAYOUT_SCHEMA(data['images_swipe'], 'images_swipe'));
      title += ' & Images Swipe';
    }

    const updatedLayout = await showFormDialog(this, {
      title,
      schema,
      data,
    });
    if (!updatedLayout) {
      return;
    }

    console.debug('Updated Layout:', updatedLayout);
    const newConfig = {
      ...config,
      layout_config: {
        ...config.layout_config,
        ...updatedLayout,
      },
    };
    fireEvent(this, 'config-changed', { config: newConfig });
    return;
  };

  public _getSectionInfo(sectionKey: SectionOrder): { total: number; indexInOrder: number } {
    const sectionOrder = this._notEmptyOrder;
    const currentIndex = sectionOrder ? sectionOrder.indexOf(sectionKey) : -1;
    const total = sectionOrder ? sectionOrder.length : 0;
    return { total, indexInOrder: currentIndex };
  }

  public _moveSection(sectionKey: SectionOrder, direction: 'up' | 'down'): void {
    // const orderNotFiltered = this._store?._config?.layout_config?.section_order;
    const sectionOrder = this._notEmptyOrder;

    const currentIndex = sectionOrder.indexOf(sectionKey);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    sectionOrder.splice(currentIndex, 1);
    sectionOrder.splice(newIndex, 0, sectionKey);

    console.debug(`Move section ${sectionKey} ${direction}:`, { currentIndex, newIndex, sectionOrder });

    const newConfig = {
      ...this._store?._config,
      layout_config: {
        ...this._store?._config?.layout_config,
        section_order: sectionOrder,
      },
    };
    // console.debug('Updated config with moved section order:', newConfig);
    fireEvent(this, 'config-changed', { config: newConfig });
    return;
  }

  protected _createAlert(message: string): TemplateResult {
    return Create.HaAlert({
      message,
    });
  }

  protected _renderLayoutSection(type: 'button_grid' | 'images_swipe'): TemplateResult {
    const createForm = (data: any, schema: any) => {
      return this._createVscForm(data, schema, 'layout_config', type);
    };
    const data = {
      button_grid: this._cardConfig?.layout_config?.button_grid || {},
      image_swipe: this._cardConfig?.layout_config?.images_swipe || {},
    };
    const schemas = {
      button_grid: BUTTON_GRID_SCHEMA(!data.button_grid?.swipe),
      images_swipe: [...SLIDE_SIZE_SCHEMA, ...SWIPE_BEHAVIOR_SCHEMA(data.image_swipe)],
    };
    switch (type) {
      case 'button_grid':
        const buttonContent = createForm(data.button_grid, schemas.button_grid);
        return Create.SectionPanel([
          {
            title: 'Button grid configuration',
            content: buttonContent,
          },
        ]);
      case 'images_swipe':
        const imageContent = createForm(data.image_swipe, schemas.images_swipe);
        return Create.SectionPanel([
          {
            title: 'Slide configuration',
            content: imageContent,
          },
        ]);
    }
  }

  /**
   * Create a vsc-editor-form element
   * @param data config data
   * @param schema HA form schema
   * @param key vsc config key
   * @param subKey sub key for nested objects
   * @value-changed event handler _changed or _onValueChanged
   */
  protected _createVscForm(data: any, schema: any, key?: string | number, subKey?: string | number): TemplateResult {
    const currentConfig = this._store?._config;
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
    if (!currentConfig || typeof currentConfig !== 'object') return;
    // console.debug('onValueChanged:', { key, subKey, value });

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
        ._hass=${this._hass}
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
    console.debug('YAML changed (BaseEditor)');
    ev.stopPropagation();
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
    const config = this._store._config;
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

  public _resetPreview = (): void => {
    this._dispatchEditorEvent('reset-preview', {});
  };

  protected _showSelectedRow = (
    rowIndex: number | null,
    groupIndex: number | null = null,
    entity_index: number | null = null,
    peek: boolean = false
  ): void => {
    const rowPreviewConfig = { row_index: rowIndex, group_index: groupIndex, entity_index, peek };
    document.dispatchEvent(EditorIndicatorRowSelectedEvent(rowPreviewConfig));
    // console.debug('event from:', this);
  };

  protected _cardConfigChanged(changedConfig: Partial<VehicleStatusCardConfig>): void {
    if (!this._store) return;
    const config = this._store._config;
    if (!config || typeof config !== 'object') return;

    console.debug('incoming changed from:', this._editorArea);
    // Update config
    const newConfig = { ...config, ...changedConfig };
    fireEvent(this, 'config-changed', { config: newConfig });
    return;
  }

  protected _dispatchEditorArea(area?: ConfigArea): void {
    if (!area) return;
    const sectionNew = getSectionFromConfigArea(area);
    document.dispatchEvent(EditorConfigAreaSelectedEvent(sectionNew));
    // console.debug('event from:', area, sectionNew);
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
