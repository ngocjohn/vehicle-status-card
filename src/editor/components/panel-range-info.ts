import iro from '@jaames/iro';
import { LitElement, html, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
// utils
import tinycolor from 'tinycolor2';

import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { HomeAssistant, VehicleStatusCardConfig, RangeInfoConfig, RangeItemConfig, fireEvent } from '../../types';
import * as Create from '../../utils/create';
import './sub-panel-yaml';
import { RANGE_ACTIONS } from '../editor-const';
import { PROGRESS_BAR_SCHEMA, RANGE_ITEM_SCHEMA } from '../form';

@customElement('panel-range-info')
export class PanelRangeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) editor?: any;
  @property({ type: Object }) config!: VehicleStatusCardConfig;

  @state() private _activeIndexItem: number | null = null;
  @state() private _activeColorPicker: number | null = null;
  @state() private _picker!: iro.ColorPicker;

  @state() private _yamlEditorActive = false;
  @state() private _yamlItemEditorActive = false;
  @state() _colorChangeTimeout?: number = undefined;

  private _tinycolor = tinycolor;

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

  private _toggleAction = (
    action: 'add' | 'delete-item' | 'edit-item' | 'edit-yaml' | 'back-to-list',
    index?: number
  ) => {
    const updateChanged = (update: any) => {
      this.config = { ...this.config, range_info: update };
      fireEvent(this, 'config-changed', { config: this.config });
    };
    switch (action) {
      case 'add':
        const randomHex = tinycolor.random().toHexString();
        console.log('Random hex color', randomHex);
        let rangeInfo = [...(this.config.range_info || [])];
        const newRangeInfo = {
          energy_level: {
            entity: '',
            icon: 'mdi:gas-station',
          },
          progress_color: randomHex,
        };
        rangeInfo = [...rangeInfo, newRangeInfo];
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
      case 'edit-yaml':
        this._yamlItemEditorActive = !this._yamlItemEditorActive;
        break;
      case 'back-to-list':
        this._yamlItemEditorActive = false;
        this._activeIndexItem = null;
        break;
      default:
        break;
    }
  };

  private _renderRangeConfigContent(): TemplateResult | typeof nothing {
    if (this._activeIndexItem === null) {
      return nothing;
    }
    const index = this._activeIndexItem;
    const energyConfig = (index: number) => this._renderEnergyLevelConfig(index);
    const rangeConfig = (index: number) => this._renderRangeLevelConfig(index);
    const chargingEntity = (index: number) => this._renderChargingEntityConfig(index);
    const colorTemplate = (index: number) => this._renderColorTemplate(index);
    const barHeightWidth = (index: number) => this._renderBarDimensions(index);
    const colorPicker = (index: number) => this._colorPicker(index);
    const infoAlert = (helper: string) =>
      html`<span slot="message" class="info-alert" style="flex: 0; display: none"> ${helper} </span>`;
    const configContent = {
      energy_level: {
        title: 'Energy Level (Required)',
        helper: infoAlert('Entity to display the energy level (e.g., battery, fuel)'),
        config: energyConfig,
      },
    };
    const rangeAndChargingConfig = {
      range_level: {
        title: 'Range Level (Optional)',
        helper: infoAlert('Entity to display the range level (e.g., distance, range)'),
        config: rangeConfig,
      },
      charging_entity: {
        title: 'Charging Entity (Optional)',
        helper: infoAlert('Entity to display the charging status'),
        config: chargingEntity,
      },
    };
    const progressBarFields = {
      bar_dimensions: {
        title: 'Bar Dimensions',
        helper: infoAlert('Height(px) and Width(%) of the progress bar'),
        config: barHeightWidth,
      },
      progress_color: {
        title: 'Progress Color',
        helper: infoAlert('Color to display the progress bar'),
        config: colorPicker,
      },
      color_template: {
        title: '',
        config: colorTemplate,
      },
    };

    const createSection = (section: any) =>
      Object.keys(section).map(
        (key: string) => html` <div class="sub-panel">
          <div class="sub-header">
            <span>${section[key].title}</span>
            ${section[key].helper
              ? html`
                  <ha-icon
                    class="info-icon"
                    icon="mdi:help-circle"
                    @click=${(ev: Event) => this._toggleHelp(ev)}
                  ></ha-icon>
                `
              : nothing}
            ${section[key].helper}
          </div>
          ${section[key].config(index)}
        </div>`
      );

    return html`
      ${this._renderHeader(
        `Range Info #${index + 1}`,
        undefined,
        this._yamlItemEditorActive
          ? [{ title: 'Close Editor', action: () => (this._yamlItemEditorActive = false), icon: ICON.CLOSE }]
          : [{ title: 'Back to list', action: () => (this._activeIndexItem = null), icon: ICON.CHEVRON_LEFT }],

        [{ action: () => (this._yamlItemEditorActive = !this._yamlItemEditorActive) }]
      )}
      ${this._yamlItemEditorActive
        ? html`
            <vsc-sub-panel-yaml
              .hass=${this.hass}
              .config=${this.config}
              .configDefault=${this.config.range_info[index]}
              .configIndex=${index}
              .configKey=${'range_info_item'}
              @yaml-config-changed=${this._onYamlConfigChanged}
            ></vsc-sub-panel-yaml>
          `
        : html`
            <div class="sub-panel-config" data-index=${index}>
              ${createSection(configContent)}
              ${Create.ExpansionPanel({
                content: html`${createSection(rangeAndChargingConfig)}`,
                options: { header: 'Range level and Charging entity (Optional)' },
              })}
              ${Create.ExpansionPanel({
                content: html`${createSection(progressBarFields)}`,
                options: { header: 'Progress Bar Config' },
              })}
            </div>
          `}
    `;
  }

  private _renderRangeConfigList(): TemplateResult {
    const actionMap = [
      {
        title: 'Edit',
        icon: 'mdi:pencil',
        action: (index: number) => this._toggleAction(RANGE_ACTIONS.EDIT_ITEM, index),
      },
      {
        title: 'Remove',
        icon: 'mdi:delete',
        action: (index: number) => this._toggleAction(RANGE_ACTIONS.DELETE_ITEM, index),
        color: 'var(--error-color)',
      },
    ];
    return html`${
      !this._yamlEditorActive && this.config.range_info
        ? html`
            <div class="range-info-list">
              ${repeat(this.config.range_info, (rangeItem: RangeInfoConfig, index: number) => {
                const entity = rangeItem.energy_level.entity || '';
                const icon = rangeItem.energy_level.icon || '';
                const progressColor = rangeItem.progress_color || 'var(--primary-color)';
                return html`
                  <div class="item-config-row" data-index=${index}>
                    <div class="handle" style="margin: var(--vic-card-padding)">
                      <ha-icon icon=${icon ? icon : 'mdi:gas-station'} style=${`color: ${progressColor}`}></ha-icon>
                    </div>
                    <div
                      class="item-content click-shrink"
                      @click=${() => this._toggleAction(RANGE_ACTIONS.EDIT_ITEM, index)}
                    >
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
                              @click=${() => action.action(index)}
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
          <ha-button @click=${() => this._toggleAction('add')}>
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

  private _onYamlConfigChanged(ev: any): void {
    ev.stopPropagation();
    const detail = ev.detail;
    const { isValid, value, key, index } = detail;
    if (!isValid || !this.config) {
      return;
    }
    console.log('YAML config changed', key, index, value);

    const newConfig = value;
    let rangeInfo = [...(this.config.range_info || [])];
    let rangeItem = { ...rangeInfo[index] }; // Clone the item at the specific index
    if (key === 'range_info') {
      // Update the entire range_info array
      rangeInfo = newConfig;
    } else if (key === 'range_info_item') {
      // Update the specific range_info item
      rangeItem = newConfig;
      rangeInfo[index] = rangeItem; // Replace the modified item in the range_info array
    }

    fireEvent(this, 'config-changed', { config: { ...this.config, range_info: rangeInfo } });
  }

  private _toggleHelp(ev: Event): void {
    const target = ev.target as HTMLElement;
    const alert = target.parentElement?.querySelector('.info-alert') as HTMLElement;
    alert.style.display = alert.style.display === 'none' ? 'block' : 'none';
  }

  private _renderEnergyLevelConfig(index: number): TemplateResult {
    const DATA = {
      ...this.config.range_info[index].energy_level,
    } as RangeItemConfig;
    if (!DATA.entity) {
      DATA.entity = this.config.range_info[index].energy_level.entity || '';
    }

    const energySchema = RANGE_ITEM_SCHEMA(DATA.entity, true);

    return this._createHaForm(DATA, energySchema, 'energy_level');
  }
  private _renderRangeLevelConfig(index: number): TemplateResult {
    const DATA = {
      ...this.config.range_info[index].range_level,
    } as RangeItemConfig;
    if (!DATA.entity) {
      DATA.entity = this.config.range_info[index].energy_level.entity || '';
    }
    const rangeSchema = RANGE_ITEM_SCHEMA(DATA.entity, false);
    return this._createHaForm(DATA, rangeSchema, 'range_level');
  }

  private _renderChargingEntityConfig(index: number): TemplateResult {
    const DATA = {
      charging_entity: this.config.range_info[index].charging_entity || '',
    };
    const chargingEntitySchema = [
      {
        name: 'charging_entity',
        selector: { entity: {} },
        required: false,
      },
    ];
    return this._createHaForm(DATA, chargingEntitySchema);
  }

  private _renderColorTemplate(index: number): TemplateResult {
    const DATA = {
      color_template: this.config.range_info[index].color_template || '',
    };
    const colorTemplateSchema = [
      {
        name: 'color_template',
        label: 'Color Template',
        helper: 'Template to set the color of the progress bar, this will replace the progress_color',
        selector: { template: {} },
      },
    ] as const;
    return this._createHaForm(DATA, colorTemplateSchema);
  }

  private _renderBarDimensions(index: number): TemplateResult {
    const barConfig = this.config.range_info[index];
    const DATA = {
      bar_height: barConfig.bar_height || 5,
      bar_width: barConfig.bar_width || 60,
      bar_radius: barConfig.bar_radius || 5,
    };

    return this._createHaForm(DATA, PROGRESS_BAR_SCHEMA);
  }

  private _colorPicker(index: number): TemplateResult {
    const rangeItem = this.config.range_info[index];
    const progressColor = rangeItem.progress_color;
    const defaultContent = html` <div class="item-content">
      <div class="sub-content">
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
      </div>
    </div>`;

    const colorPicker = html`
    <div class="item-content color-picker">
      <h3>Selected color</h3>
      <div id="values"></div>
      <input id="hexInput"></input>
      <div class="item-actions">
        <ha-button @click=${() => (this._activeColorPicker = null)}>Save</ha-button>
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

  private _renderHeader(
    title: string,
    icon?: string,
    actions?: Array<{ title?: string; action: (ev?: Event) => void; icon?: string }>,
    addedAction?: Array<{ action: (ev?: Event) => void; icon?: string }>
  ): TemplateResult {
    return html` <div class="header-row">
      ${actions?.map(
        (action) =>
          html` <div class="icon-title" @click=${(ev: Event) => action.action(ev)}>
            ${ifDefined(action.icon) ? html`<ha-icon-button .path=${action.icon}></ha-icon-button>` : nothing}
            <span>${action.title}</span>
          </div>`
      )}
      <div class="header-title">${title} ${icon ? html`<ha-icon icon=${icon}></ha-icon>` : nothing}</div>
      ${addedAction?.map(
        (action) =>
          html` <ha-icon-button
            class="header-yaml-icon"
            @click=${(ev: Event) => action.action(ev)}
            .path=${ICON.CODE_JSON}
          >
          </ha-icon-button>`
      )}
    </div>`;
  }

  private _valueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const target = ev.target;
    const index = target.index || target.configIndex;
    const configType = target.configType; // E.g., 'energy_level', 'range_level', 'progress_color'
    const configValue = target.configValue; // E.g., 'entity', 'icon', etc.

    let newValue: any = target.value;

    if (['attribute'].includes(configValue)) {
      newValue = ev.detail.value;
    } else {
      newValue = target.value;
    }

    console.log('Value changed', index, configType, configValue, newValue);
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
    }

    if (Object.keys(updates).length > 0) {
      console.log('Updates', updates.range_info);
      this.config = { ...this.config, ...updates };
      fireEvent(this, 'config-changed', { config: this.config });
    }

    // Send the updated config to the main card
  }
  private _createHaForm = (data: any, schema: any, configyTpe?: string) => {
    return html`
      <ha-form
        .hass=${this.hass}
        .configType=${configyTpe}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._rangeItemValueChanged}
      ></ha-form>
    `;
  };
  private _computeLabel(schema: any) {
    if (schema.name === 'entity' || schema.name === 'charging_entity') {
      return '';
    }
    return schema.label || schema.name;
  }
  private _computeHelper(schema: any) {
    return schema.helper || '';
  }

  private _rangeItemValueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const configType = ev.target.configType; // E.g., 'energy_level', 'range_level', 'progress_color'
    const value = ev.detail.value;
    const index = this._activeIndexItem!; // Get the current active index
    let rangeConfig = [...(this.config.range_info || [])];
    let rangeItem = { ...rangeConfig[index] }; // Clone the item at the specific index

    if (configType !== undefined) {
      rangeItem = { ...rangeItem, [configType]: value }; // Update the specific config type
      rangeConfig[index] = rangeItem; // Replace the modified item in the range_info array
    } else {
      rangeItem = { ...rangeItem, ...value }; // Spread the new values into the rangeItem
      rangeConfig[index] = rangeItem; // Replace the modified item in the range_info array
    }

    this.config = { ...this.config, range_info: rangeConfig };
    fireEvent(this, 'config-changed', { config: this.config });
  }
}
