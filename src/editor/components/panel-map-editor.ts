import { isString } from 'es-toolkit';
import { LitElement, html, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { VehicleStatusCardConfig, HomeAssistant, fireEvent } from '../../types';
import { Create } from '../../utils';
import { VehicleStatusCardEditor } from '../editor';

@customElement('panel-map-editor')
export class PanelMapEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) cardEditor!: VehicleStatusCardEditor;
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  protected render(): TemplateResult {
    const baseMapSection = this._renderBaseMapSection();
    const mapConfigSection = this._renderMapConfigSection();
    const popupSection = this._renderPopupSection();

    const sections = [
      {
        options: { header: 'Map Configuration' },
        content: baseMapSection,
      },
      {
        options: { header: 'Mini Map Layout' },
        content: mapConfigSection,
      },
      {
        options: { header: 'Popup Configuration' },
        content: popupSection,
      },
    ];

    return html`<div class="tip-content">${sections.map(Create.ExpansionPanel)}</div>`;
  }

  private _renderBaseMapSection(): TemplateResult {
    const docLink = 'https://github.com/ngocjohn/vehicle-status-card/wiki/Mini-map#maptiler-popup';
    const miniMap = this._config?.mini_map || {};

    const apiKeys = [
      {
        configValue: 'device_tracker',
        label: 'Device Tracker',
        pickerType: 'entity',
        value: miniMap.device_tracker ?? '',
        options: { includeDomains: ['device_tracker', 'person'] },
      },
      {
        configValue: 'google_api_key',
        label: 'Google API Key (Optional)',
        pickerType: 'baseSelector',
        value: miniMap.google_api_key ?? '',
        options: {
          selector: { text: { type: 'text' } },
        },
      },
      {
        configValue: 'maptiler_api_key',
        label: 'Maptiler API Key (Optional)',
        pickerType: 'baseSelector',
        value: miniMap.maptiler_api_key ?? '',
        options: {
          selector: { text: { type: 'text' } },
        },
      },
    ];

    return html`
      <div class="sub-content">
        ${this.createPickers(apiKeys)}
        <ha-alert alert-type="info">
          How to get Maptiler API Key?
          <mwc-button slot="action" @click="${() => window.open(docLink)}" label="More"></mwc-button>
        </ha-alert>
      </div>
    `;
  }

  private _renderMapConfigSection(): TemplateResult {
    const { getBooleanPicker, getNumberPicker } = this;

    const miniMap = this._config?.mini_map || {};

    const configFields = [
      getBooleanPicker('enable_popup', 'Enable Popup', miniMap.enable_popup ?? false),
      getBooleanPicker('us_format', 'US Address Format', miniMap.us_format ?? false),
      getBooleanPicker('hide_map_address', 'Hide Address', miniMap.hide_map_address ?? false),
      getBooleanPicker('use_zone_name', 'Use Zone Name', miniMap.use_zone_name ?? false),
      getNumberPicker('map_zoom', 'Map Zoom', miniMap.map_zoom ?? 14),
      getNumberPicker('map_height', 'Minimap Height (px)', miniMap.map_height ?? 150, 500, 150, 10, 'slider'),
    ];

    return html` <div class="sub-content">${this.createPickers(configFields)}</div> `;
  }

  private _renderPopupSection(): TemplateResult {
    const { getBooleanPicker, getNumberPicker } = this;

    const miniMap = this._config?.mini_map || {};

    const popupConfig = [
      getNumberPicker('default_zoom', 'Default Zoom', miniMap.default_zoom || 14),
      getNumberPicker('hours_to_show', 'Hours to Show', miniMap.hours_to_show || 0),
      {
        configValue: 'theme_mode',
        label: 'Theme Mode',
        pickerType: 'attribute',
        value: miniMap.theme_mode ?? 'auto',
        items: [
          { label: 'Auto', value: 'auto' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      },
      {
        configValue: 'aspect_ratio',
        label: 'Aspect Ratio',
        pickerType: 'baseSelector',
        value: miniMap.aspect_ratio ?? '',
        options: {
          selector: { text: { type: 'text' } },
        },
      },
      getBooleanPicker('auto_fit', 'Auto Fit', miniMap.auto_fit ?? false),
      {
        configValue: 'path_color',
        label: 'Path Color',
        pickerType: 'baseSelector',
        value: miniMap.path_color || undefined,
        options: { selector: { ui_color: { include_none: false, include_state: false, default_color: '' } } },
      },
      {
        configValue: 'history_period',
        label: 'History Period',
        pickerType: 'baseSelector',
        value: miniMap.history_period || undefined,
        options: {
          selector: {
            select: {
              sort: true,
              mode: 'dropdown',
              options: [
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
              ],
            },
          },
        },
      },
      {
        configValue: 'label_mode',
        label: 'Label Mode',
        pickerType: 'baseSelector',
        value: miniMap.label_mode || undefined,
        options: {
          selector: {
            select: {
              sort: true,
              mode: 'dropdown',
              options: [
                { label: 'Name', value: 'name' },
                { label: 'State', value: 'state' },
                { label: 'Icon', value: 'icon' },
                { label: 'Attribute', value: 'attribute' },
              ],
            },
          },
        },
      },
      {
        configValue: 'attribute',
        label: 'Attribute',
        pickerType: 'baseSelector',
        value: miniMap.attribute || undefined,
        options: {
          selector: {
            attribute: {
              entity_id: miniMap.device_tracker,
            },
          },
          disabled: miniMap.label_mode !== 'attribute',
        },
      },
    ];

    return html` <div class="sub-content">${this.createPickers(popupConfig)}</div>
      <ha-alert alert-type="info">This options is for Map popup.</ha-alert>`;
  }

  private getBooleanPicker = (
    configValue: string,
    label: string,
    value: boolean,
    configType?: string,
    configIndex?: string | number
  ) => ({
    configValue,
    label,
    pickerType: 'selectorBoolean',
    value,
    options: { selector: { boolean: ['true', 'false'] } },
    configType: configType || 'mini_map',
    configIndex: configIndex || 0,
  });

  private getNumberPicker = (
    configValue: string,
    label: string,
    value: number,
    max = 500,
    min = 0,
    step = 1,
    mode = 'box'
  ) => ({
    configValue,
    label,
    pickerType: 'number',
    value,
    options: { selector: { number: { max, min, step, mode } } },
  });

  private createPickers = (configs: any[]): TemplateResult<1>[] => {
    const sharedConfig = {
      component: this,
      configIdex: 0,
      configType: 'mini_map',
    };

    return configs.map(
      (config) => html`<div class="item-content">${Create.Picker({ ...sharedConfig, ...config })}</div>`
    );
  };

  public _valueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this._config) return;

    const target = ev.target;
    const configValue = target.configValue;
    const configType = target.configType;
    const newValue = ev.detail.value;

    const updates: Partial<VehicleStatusCardConfig> = {};

    if (configType === 'mini_map') {
      const miniMap = { ...(this._config.mini_map || {}) };
      if (miniMap![configValue] === newValue) return;
      if (['google_api_key', 'maptiler_api_key', 'path_color'].includes(configValue)) {
        if (newValue === '' || (isString(newValue) && newValue.trim() === '')) {
          miniMap[configValue] = undefined;
          updates.mini_map = miniMap;
          console.log('Config delete:', configValue, newValue);
        } else {
          miniMap[configValue] = newValue;
          updates.mini_map = miniMap;
          console.log('Config changes:', configValue, newValue);
        }
      } else {
        miniMap[configValue] = newValue;
        updates.mini_map = miniMap;
        console.log('Mini Map Updates:', configValue, newValue);
      }
    }

    if (Object.keys(updates).length > 0) {
      this._config = { ...this._config, ...updates };
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-map-editor': PanelMapEditor;
  }
}
