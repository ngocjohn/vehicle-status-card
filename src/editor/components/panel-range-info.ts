import iro from '@jaames/iro';
import { LitElement, html, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat.js';
// utils
import tinycolor from 'tinycolor2';

import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { HomeAssistant, VehicleStatusCardConfig, RangeInfoConfig, RangeItemConfig, fireEvent } from '../../types';
import * as Create from '../../utils/create';
import { RANGE_ACTIONS } from '../editor-const';
import './sub-panel-yaml';

@customElement('panel-range-info')
export class PanelRangeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) editor?: any;
  @property({ type: Object }) config!: VehicleStatusCardConfig;

  @state() private _activeIndexItem: number | null = null;
  @state() private _activeColorPicker: number | null = null;
  @state() private _picker!: iro.ColorPicker;

  @state() private _yamlEditorActive = false;
  @state() _colorChangeTimeout?: number = undefined;

  constructor() {
    super();
  }

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  // Initialize the color picker in the `firstUpdated` method
  protected firstUpdated(changedProps: Map<string | number | symbol, unknown>): void {
    super.firstUpdated(changedProps);
  }

  private _initColorPicker(currentColor: string): void {
    const pickerElement = this.shadowRoot?.getElementById('picker');
    if (!pickerElement) {
      console.log('Picker element not found');
      return;
    }
    const inputColor = tinycolor(currentColor);
    const format = inputColor.getFormat();
    console.log('Current color', currentColor, 'input color', inputColor, 'format', format);
    const displayFormat = format === 'hex' ? 'hex' : format === 'rgb' ? 'rgb' : 'hsl';

    // Initialize the iro color picker
    this._picker = iro.ColorPicker(pickerElement, {
      width: 150,
      color: currentColor,
      borderWidth: 1,
      borderColor: '#fff',
    });

    console.log('Color picker initialized');

    const hexInput = this.shadowRoot?.getElementById('hexInput') as HTMLInputElement;
    const values = this.shadowRoot?.getElementById('values') as HTMLElement;

    // Add an event listener to listen to color changes
    this._picker.on(['color:init', 'color:change'], (color: any) => {
      values.innerHTML = ['hex: ' + color.hexString, 'rgb: ' + color.rgbString, 'hsl: ' + color.hslString].join('<br>');

      // Set the new color value
      if (hexInput) {
        switch (displayFormat) {
          case 'hex':
            hexInput.value = color.hexString;
            break;
          case 'rgb':
            hexInput.value = color.rgbString;
            break;
          case 'hsl':
            hexInput.value = color.hslString;
            break;
        }
      }

      // Clear the color change timeout
      if (this._colorChangeTimeout !== undefined) {
        clearTimeout(this._colorChangeTimeout);
      }

      // Set a new color change timeout
      this._colorChangeTimeout = window.setTimeout(() => {
        this._handleColorOnChange(hexInput.value);
      }, 500);
    });

    // Add an event listener to the input field to allow manual changes
    hexInput?.addEventListener('change', () => {
      console.log('Input changed', hexInput.value, 'display format', displayFormat);
      const trimmedValue = hexInput.value.trim();
      console.log('Input changed', trimmedValue);

      // Set the new color value
      this._picker.color.set(trimmedValue);
    });
  }

  private _handleColorOnChange(color: string): void {
    if (!color) {
      return;
    }
    const index = this._activeColorPicker;
    if (index === null) {
      return;
    }
    const rangeInfo = [...(this.config.range_info || [])];
    const rangeInfoItem = { ...rangeInfo[index] };
    rangeInfoItem.progress_color = color;
    rangeInfo[index] = rangeInfoItem;
    fireEvent(this, 'config-changed', { config: { ...this.config, range_info: rangeInfo } });
  }

  protected render(): TemplateResult {
    return html`
      <div class="card-config">
        ${this._activeIndexItem !== null ? this._renderRangeConfigContent() : this._renderRangeConfigList()}
      </div>
    `;
  }

  private _toggleAction(action: 'add' | 'delete-item' | 'edit-item' | 'edit-yaml', index?: number): () => void {
    return () => {
      const updateChanged = (update: any) => {
        fireEvent(this, 'config-changed', { config: { ...this.config, range_info: update } });
      };
      console.log('Action', action, 'Index', index);
      const handleAction = () => {
        switch (action) {
          case 'add':
            const randomHex = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
            const rangeInfo = [...(this.config.range_info || [])];
            const newRangeInfo = {
              energy_level: {
                entity: '',
                attribute: '',
                icon: '',
              },
              range_level: {
                entity: '',
                attribute: '',
              },
              progress_color: randomHex,
            };
            rangeInfo.push(newRangeInfo);
            updateChanged(rangeInfo);
            break;
          case 'delete-item':
            if (index !== undefined) {
              const rangeInfo = [...(this.config.range_info || [])];
              rangeInfo.splice(index, 1);
              updateChanged(rangeInfo);
            }
            break;

          case 'edit-item':
            if (index !== undefined) {
              console.log('Edit item', index);
              this._activeIndexItem = index;
              this.requestUpdate();
            }
            break;
        }
      };
      handleAction();
    };
  }

  private _renderRangeConfigContent(): TemplateResult | typeof nothing {
    if (this._activeIndexItem === null) {
      return nothing;
    }
    const index = this._activeIndexItem;
    const energyConfig = (index: number) => this._renderEnergyLevelConfig(index);
    const rangeConfig = (index: number) => this._renderRangeLevelConfig(index);
    const colorPicker = (index: number) => this._colorPicker(index);
    const infoAlert = (helper: string) =>
      html`<span slot="message" class="info-alert" style="display: none"> ${helper} </span>`;
    const configContent = {
      energy_level: {
        title: 'Energy Level',
        helper: infoAlert('Entity to display the energy level (e.g., battery, fuel)'),
        config: energyConfig,
      },
      range_level: {
        title: 'Range Level',
        helper: infoAlert('Entity to display the range level (e.g., distance, range)'),
        config: rangeConfig,
      },
      progress_color: {
        title: 'Progress Color',
        helper: infoAlert('Color to display the progress bar'),
        config: colorPicker,
      },
    };

    return html`
      <div class="sub-header">
        <div class="icon-title" @click=${() => (this._activeIndexItem = null)}>
          <ha-icon icon="mdi:arrow-left"></ha-icon>
          <span>Back to list</span>
        </div>
        <div>Range Info #${index + 1}</div>

      </div>
        <div class="sub-panel-config" data-index=${index}>
          ${Object.keys(configContent).map(
            (key) => html`
              <div class="sub-panel">
                <div class="sub-header">
                  <span>${configContent[key].title}</span>
                  <ha-icon
                    class="info-icon"
                    icon="mdi:help-circle"
                    @click=${(ev: Event) => this._toggleHelp(ev)}
                  ></ha-icon>
                  ${configContent[key].helper}
                </div>
                <div class="sub-content">${configContent[key].config(index)}</div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderRangeConfigList(): TemplateResult {
    const actionMap = [
      { title: 'Edit', icon: 'mdi:pencil', action: RANGE_ACTIONS.EDIT_ITEM },
      {
        title: 'Remove',
        icon: 'mdi:delete',
        action: RANGE_ACTIONS.DELETE_ITEM,
        color: 'var(--error-color)',
      },
    ];
    return html`${
      !this._yamlEditorActive
        ? html`
            <div class="range-info-list">
              ${repeat(this.config.range_info, (rangeItem: RangeInfoConfig, index: number) => {
                const entity = rangeItem.energy_level.entity;
                const icon = rangeItem.energy_level.icon;
                const progressColor = rangeItem.progress_color;
                return html`
                  <div class="item-config-row" data-index=${index}>
                    <div class="handle">
                      <ha-icon icon=${icon ? icon : 'mdi:gas-station'} style=${`color: ${progressColor}`}></ha-icon>
                    </div>
                    <div class="item-content">
                      <div class="primary">Range Info #${index + 1}</div>
                      <div class="secondary">${entity}</div>
                    </div>
                    <div class="item-actions">
                      <ha-button-menu
                        .corner=${'BOTTOM_START'}
                        .fixed=${true}
                        .menuCorner=${'START'}
                        .activatable=${true}
                        .naturalMenuWidth=${true}
                        @closed=${(ev: Event) => ev.stopPropagation()}
                      >
                        <ha-icon-button class="action-icon" slot="trigger" .path=${ICON.DOTS_VERTICAL}></ha-icon-button>
                        ${actionMap.map(
                          (action) => html`
                            <mwc-list-item
                              @click=${this._toggleAction(action.action, index)}
                              .graphic=${'icon'}
                              style="${action.color ? `color: ${action.color}` : ''}"
                            >
                              <ha-icon
                                .icon=${action.icon}
                                slot="graphic"
                                style="${action.color ? `color: ${action.color}` : ''}"
                              ></ha-icon>
                              ${action.title}
                            </mwc-list-item>
                          `
                        )}
                      </ha-button-menu>
                    </div>
                  </div>
                `;
              })}
            </div>
          `
        : this._renderYamlEditor()
    }
        <div class="action-footer">
          <ha-button @click=${this._toggleAction('add')}>
            <span>Add new info bar</span>
          </ha-button>
          <ha-button @click=${() => (this._yamlEditorActive = !this._yamlEditorActive)}>
            <span>${!this._yamlEditorActive ? 'Edit YAML' : 'Close YAML'}</span>
          </ha-button>
        </div>
      </div>
    `;
  }

  private _renderYamlEditor(): TemplateResult | typeof nothing {
    if (!this._yamlEditorActive) {
      return nothing;
    }

    return html`
      <div class="card-config">
        <vsc-sub-panel-yaml
          .hass=${this.hass}
          .config=${this.config}
          .configDefault=${this.config.range_info}
          .configKey=${'range_info'}
          @yaml-config-changed=${this._onYamlConfigChanged}
        ></vsc-sub-panel-yaml>
      </div>
    `;
  }

  private _onYamlConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const detail = ev.detail;
    const { isValid, value } = detail;
    if (!isValid) {
      return;
    }
    const rangeInfo = [...value];
    const updates: Partial<VehicleStatusCardConfig> = { range_info: rangeInfo };
    fireEvent(this, 'config-changed', { config: { ...this.config, ...updates } });
  }

  private _toggleHelp(ev: Event): void {
    const target = ev.target as HTMLElement;
    const alert = target.parentElement?.querySelector('.info-alert') as HTMLElement;
    alert.style.display = alert.style.display === 'none' ? 'block' : 'none';
  }

  private _renderEnergyLevelConfig(index: number): TemplateResult {
    const configShared = {
      component: this,
      configType: 'energy_level',
      configIndex: index,
    };

    const energyEntry = this.config.range_info[index].energy_level as RangeItemConfig;
    const energyEntity = energyEntry.entity || '';
    let energyIcon = energyEntry.icon;
    if (!energyIcon && energyEntity) {
      energyIcon = this.hass.states[energyEntity].attributes.icon;
    } else if (!energyIcon && !energyEntity) {
      energyIcon = 'mdi:gas-station';
    }

    const energyAttribute = energyEntry.attribute || '';
    const entityAttrs = energyEntity ? Object.keys(this.hass.states[energyEntity].attributes) : [];

    const attrOpts = [...entityAttrs.map((attr) => ({ value: attr, label: attr }))];

    return html`
      <div class="item-content">
        ${Create.Picker({
          ...configShared,
          value: energyEntity,
          label: 'Entity energy',
          pickerType: 'entity',
        })}
      </div>
      <div class="item-content">
        ${Create.Picker({
          ...configShared,
          value: energyAttribute,
          label: 'Attribute energy',
          items: attrOpts,
          pickerType: 'attribute',
        })}
      </div>
      <div class="item-content">
        ${Create.Picker({
          ...configShared,
          value: energyIcon ?? '',
          pickerType: 'icon',
        })}
      </div>
    `;
  }

  private _renderRangeLevelConfig(index: number): TemplateResult {
    const configShared = {
      component: this,
      configType: 'range_level',
      configIndex: index,
    };

    const rangeEntry = this.config.range_info[index].range_level as RangeItemConfig;
    const rangeEntity = rangeEntry?.entity;
    const entityAttrs = rangeEntity ? Object.keys(this.hass.states[rangeEntity].attributes) : [];

    const attrOpts = [...entityAttrs.map((attr) => ({ value: attr, label: attr }))];

    return html`
      <div class="item-content">
        ${Create.Picker({
          ...configShared,
          value: rangeEntity,
          label: 'Entity range',
          pickerType: 'entity',
        })}
      </div>
      <div class="item-content">
        ${Create.Picker({
          ...configShared,
          value: rangeEntry?.attribute,
          label: 'Attribute range',
          pickerType: 'attribute',
          items: attrOpts,
        })}
      </div>
    `;
  }

  private _colorPicker(index: number): TemplateResult {
    const rangeItem = this.config.range_info[index];
    const progressColor = rangeItem.progress_color;
    const defaultContent = html` <div class="item-content">
        <ha-textfield
          .label=${'Progress Color'}
          .value=${progressColor}
          .configType=${'progress_color'}
          .index=${index}
          @change=${this._valueChanged}
        ></ha-textfield>
      </div>
      <div
        class="item-content color-preview"
        style="background-color: ${progressColor}"
        @click=${() => this._toggleColorPicker(index, progressColor)}
      >
        <h3>CHOOSE COLOR</h3>
      </div>`;

    const colorPicker = html`
    <div class="item-content color-picker">
      <h3>Selected color</h3>
      <div id="values"></div>
      <input id="hexInput"></input>
      <div class="item-actions">
        <ha-button @click=${() => (this._activeColorPicker = null)}>Cancel</ha-button>
        <ha-button @click=${() => this._picker.color.reset()}>Reset</ha-button>
      </div>
    </div>
    <div class="picker-wrapper">
      <div id="picker"></div>
    </div>
    `;
    return this._activeColorPicker === index ? colorPicker : defaultContent;
  }

  private _toggleColorPicker(index: number, color: string): void {
    this._activeColorPicker = index;
    this.updateComplete.then(() => {
      this._initColorPicker(color);
    });
  }

  private _valueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const target = ev.target;
    const index = target.index;
    const configType = target.configType; // E.g., 'energy_level', 'range_level', 'progress_color'
    const configValue = target.configValue; // E.g., 'entity', 'icon', etc.

    let newValue: any = target.value;

    if (configValue === 'attribute') {
      newValue = ev.detail.value;
    } else {
      newValue = target.value;
    }

    console.log('Value changed', target, index, configType, configValue, newValue);
    // console.log(ev, configValue, configType, index, newValue);
    const updates: Partial<VehicleStatusCardConfig> = {};

    // Fetch the current range_info array
    let rangeInfo = [...(this.config.range_info || [])];
    let rangeInfoItem = { ...rangeInfo[index] }; // Clone the item at the specific index

    if (configType === 'progress_color') {
      // Directly update progress_color since it's a simple string value
      if (rangeInfoItem.progress_color === newValue) {
        console.log('Value not changed');
        return;
      }

      // Update progress_color value
      rangeInfoItem.progress_color = newValue;
      rangeInfo[index] = rangeInfoItem; // Replace the modified item in the range_info array

      updates.range_info = rangeInfo; // Apply the updates
      console.log(`Range info [${index}] progress_color changed to`, newValue);
      console.log('Updates', updates);
    } else if (configType === 'energy_level' || configType === 'range_level') {
      // Update the entity or attribute value
      const rangeLevel = rangeInfoItem[configType];
      rangeLevel[configValue] = newValue;
      rangeInfoItem[configType] = rangeLevel;
      rangeInfo[index] = rangeInfoItem;

      updates.range_info = rangeInfo;
    }

    // Send the updated config to the main card
    fireEvent(this, 'config-changed', { config: { ...this.config, ...updates } });
  }
}
