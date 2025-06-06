import iro from '@jaames/iro';
import { LitElement, html, TemplateResult, CSSResultGroup, nothing, css } from 'lit';
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
import { VehicleStatusCardEditor } from '../editor';
import { RANGE_ACTIONS } from '../editor-const';
import { CHARGE_TARGET_SCHEMA, CHARGING_STATE_SCHEMA, PROGRESS_BAR_SCHEMA, RANGE_ITEM_SCHEMA } from '../form';

@customElement('panel-range-info')
export class PanelRangeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) editor?: VehicleStatusCardEditor;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;

  @state() private _activeIndexItem: number | null = null;
  @state() private _activeColorPicker: number | null = null;
  @state() private _picker!: iro.ColorPicker;

  @state() private _yamlEditorActive = false;
  @state() private _yamlItemEditorActive = false;
  @state() _colorChangeTimeout?: number = undefined;

  private _tinycolor = tinycolor;

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-icon.tooltip-icon {
          color: var(--secondary-text-color);
          cursor: pointer;
        }
        .tooltip-icon:hover {
          color: var(--primary-text-color);
        }

        .sub-panel.section {
          margin-block: var(--vic-card-padding);
        }
        .item-content.color-preview {
          height: fit-content;
          justify-content: end;
          align-items: center;
          cursor: pointer;
          opacity: 0.8;
          text-align: center;
          background-color: var(--vsc-progress-color, var(--disabled-color));
          transition: all 0.3s ease-in-out;
        }

        .item-content.color-preview:hover {
          opacity: 1;
          color: var(--vsc-progress-color, var(--primary-text-color));
          background-color: var(--secondary-background-color, var(--primary-background-color));
        }

        .item-content.color-picker {
          display: flex;
          justify-content: space-around;
          align-items: center;
          flex-direction: column;
          height: 100%;
          gap: var(--vic-gutter-gap);
        }

        .item-content.color-picker #values {
          font-family: system-ui;
          line-height: 150%;
        }

        .item-content.color-picker input#hexInput {
          padding: var(--vic-card-padding);
          font-family: monospace;
          letter-spacing: 1px;
        }

        input#hexInput:focus {
          outline: auto;
        }

        .picker-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `,
      editorcss,
    ];
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
    const chargeTargetEntity = (index: number) => this._renderChargeTargetEntityConfig(index);
    const colorTemplate = (index: number) => this._renderColorTemplate(index);
    const barHeightWidth = (index: number) => this._renderBarDimensions(index);
    const colorPicker = (index: number) => this._colorPicker(index);
    const configContent = {
      energy_level: {
        title: 'Energy entity (Required)',
        helper: 'Entity to display the energy level (e.g., battery, fuel)',
        config: energyConfig,
      },
    };
    const rangeLevelConfig = {
      range_level: {
        title: 'Range Level (Optional)',
        helper: 'Entity to display the range level (e.g., distance, range)',
        config: rangeConfig,
      },
    };
    const chargingEntityConfig = {
      charging_entity: {
        title: 'Charging Entity',
        helper: 'Entity to display the charging status',
        config: chargingEntity,
      },
      charge_target_entity: {
        title: 'Charge Target Entity',
        helper: 'Entity to display the target charge level',
        config: chargeTargetEntity,
      },
    };
    const progressBarFields = {
      bar_dimensions: {
        title: 'Bar Dimensions',
        helper: 'Height(px) and Width(%) of the progress bar',
        config: barHeightWidth,
      },
      progress_color: {
        title: 'Progress Color',
        helper: 'Color to display the progress bar',
        config: colorPicker,
      },
      color_template: {
        title: '',
        config: colorTemplate,
      },
    };

    const createSection = (section: any) =>
      Object.keys(section).map(
        (key: string) => html` <div class="sub-panel section">
          <div class="sub-header">
            <span>${section[key].title}</span>
            ${section[key].helper
              ? html`
                  <ha-tooltip content=${section[key].helper}>
                    <ha-icon class="tooltip-icon" icon="mdi:help-circle"></ha-icon>
                  </ha-tooltip>
                `
              : nothing}
          </div>
          ${section[key].config(index)}
        </div>`
      ) as TemplateResult[];

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
              ${Create.ExpansionPanel({
                content: html`${createSection(configContent)}`,
                options: { header: 'Energy level', expanded: true, noCollapse: false },
              })}
              ${Create.ExpansionPanel({
                content: html`${createSection(rangeLevelConfig)}`,
                options: { header: 'Range level (Optional)' },
              })}
              ${Create.ExpansionPanel({
                content: html`${createSection(chargingEntityConfig)}`,
                options: { header: 'Charging entities (Optional)' },
              })}
              ${Create.ExpansionPanel({
                content: html`${createSection(progressBarFields)}`,
                options: { header: 'Progress Bar Customization' },
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
    return html`${!this._yamlEditorActive && this.config.range_info
        ? html`
            <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved}>
              <div class="range-info-list">
                ${repeat(
                  this.config.range_info || [],
                  (rangeItem: RangeInfoConfig) => rangeItem.energy_level.entity,
                  (rangeItem: RangeInfoConfig, index: number) => {
                    const entity = rangeItem.energy_level.entity || '';
                    const icon = rangeItem.energy_level.icon || '';
                    const progressColor = rangeItem.progress_color || 'var(--primary-color)';
                    return html`
                      <div class="item-config-row" data-index=${index}>
                        <div class="handle">
                          <ha-svg-icon .path=${ICON.DRAG}></ha-svg-icon>
                        </div>
                        <ha-icon
                          icon=${icon ? icon : 'mdi:gas-station'}
                          style=${`color: ${progressColor}; margin-inline-end: 0.5rem;`}
                        ></ha-icon>
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
                            <ha-icon-button
                              class="action-icon"
                              slot="trigger"
                              .path=${ICON.DOTS_VERTICAL}
                            ></ha-icon-button>
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
                  }
                )}
              </div>
            </ha-sortable>
          `
        : this._renderYamlEditor()}
      <div class="action-footer">
        <ha-button .outlined=${true} @click=${() => this._toggleAction('add')} .label=${'Add Range Info'}> </ha-button>
        <ha-button
          .outlined=${true}
          class="edit-yaml-btn"
          @click=${() => (this._yamlEditorActive = !this._yamlEditorActive)}
          .label=${!this._yamlEditorActive ? 'Edit YAML' : 'Close YAML'}
        >
        </ha-button>
      </div> `;
  }

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newRangeInfo = this.config.range_info.concat();
    newRangeInfo.splice(newIndex, 0, newRangeInfo.splice(oldIndex, 1)[0]);
    this.config = { ...this.config, range_info: newRangeInfo };
    fireEvent(this, 'config-changed', { config: this.config });
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

  private _renderEnergyLevelConfig(index: number): TemplateResult {
    const DATA = {
      ...this.config.range_info[index].energy_level,
    } as RangeItemConfig;

    return this._createHaForm(DATA, RANGE_ITEM_SCHEMA(DATA.entity || '', true), 'energy_level');
  }

  private _renderRangeLevelConfig(index: number): TemplateResult {
    const DATA = {
      ...this.config.range_info[index].range_level,
    } as RangeItemConfig;
    return this._createHaForm(DATA, RANGE_ITEM_SCHEMA(DATA.entity || ''), 'range_level');
  }

  private _renderChargingEntityConfig(index: number): TemplateResult {
    const DATA = {
      charging_entity: this.config.range_info[index].charging_entity || '',
      charging_template: this.config.range_info[index].charging_template || '',
    };

    return this._createHaForm(DATA, CHARGING_STATE_SCHEMA);
  }

  private _renderChargeTargetEntityConfig(index: number): TemplateResult {
    const rangeInfo = this.config.range_info[index] as RangeInfoConfig;
    const targetConfigKey = [
      'charge_target_entity',
      'charge_target_color',
      'charge_target_visibility',
      'charge_target_tooltip',
    ] as const;

    const DATA = {
      ...targetConfigKey.reduce((acc, key) => {
        acc[key] = rangeInfo[key] ? (key === 'charge_target_tooltip' ? Boolean(rangeInfo[key]) : rangeInfo[key]) : '';
        return acc;
      }, {} as Record<(typeof targetConfigKey)[number], string | boolean>),
    };

    return this._createHaForm(DATA, CHARGE_TARGET_SCHEMA);
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
      bar_width: barConfig.bar_width || 100, // Default to 100% width
      bar_radius: barConfig.bar_radius || 5,
    };

    return this._createHaForm(DATA, PROGRESS_BAR_SCHEMA);
  }

  private _colorPicker(index: number): TemplateResult {
    const rangeItem = this.config.range_info[index];
    const progressColor = rangeItem.progress_color;
    const colorFieldSchema = [
      {
        name: 'progress_color',
        label: 'Progress Color',
        helper: 'Color to display the progress bar',
        type: 'string',
      },
    ] as const;
    const DATA = { progress_color: progressColor } as RangeItemConfig;
    const defaultContent = html`
      <div class="sub-content">
        ${this._createHaForm(DATA, colorFieldSchema)}
        <div
          class="item-content color-preview"
          style="--vsc-progress-color: ${progressColor}"
          @click=${() => this._toggleColorPicker(index, progressColor)}
        >
          <h3>CHOOSE COLOR</h3>
        </div>
      </div>
    `;

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
    return schema.label || '';
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
    // console.log('Range item value changed', index, configType, value);
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
