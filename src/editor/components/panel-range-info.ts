import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat.js';

import { HA as HomeAssistant, VehicleStatusCardConfig, RangeInfoConfig, RangeItemConfig } from '../../types';

import iro from '@jaames/iro';

import editorcss from '../../css/editor.css';
import { fireEvent } from 'custom-card-helpers';

import * as Create from '../../utils/create';

@customElement('panel-range-info')
export class PanelRangeInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) editor?: any;
  @property({ type: Object }) config!: VehicleStatusCardConfig;

  @state() private _activeIndexItem: number | null = null;
  @state() private _newColor: string = '';
  @state() private _picker!: iro.ColorPicker;

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
    let displayFormat = 'hex';

    const testFormat = (colorValue: string): string => {
      if (colorValue.includes('#')) {
        return 'hex';
      }
      if (colorValue.includes('rgb')) {
        return 'rgb';
      }
      if (colorValue.includes('hsl')) {
        return 'hsl';
      }
      return 'hex';
    };

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

    // Determine the display format based on the current color
    if (hexInput) {
      const trimmedValue = hexInput.value.trim();
      displayFormat = testFormat(trimmedValue);
    }

    // Add an event listener to listen to color changes
    this._picker.on(['color:init', 'color:change'], (color: any) => {
      values.innerHTML = ['hex: ' + color.hexString, 'rgb: ' + color.rgbString, 'hsl: ' + color.hslString].join('<br>');

      // Set the new color value
      if (hexInput) {
        if (displayFormat === 'hex') {
          hexInput.value = color.hexString;
        }
        if (displayFormat === 'rgb') {
          hexInput.value = color.rgbString;
        }
        if (displayFormat === 'hsl') {
          hexInput.value = color.hslString;
        }
        this._newColor = hexInput.value;
      }
    });

    // Add an event listener to the input field to allow manual changes
    hexInput?.addEventListener('change', () => {
      console.log('Input changed', hexInput.value, 'display format', displayFormat);
      const trimmedValue = hexInput.value.trim();
      console.log('Input changed', trimmedValue);
      displayFormat = testFormat(trimmedValue);

      // Set the new color value
      this._picker.color.set(trimmedValue);
    });
  }
  protected render(): TemplateResult {
    const actionFooter = html`
      <div class="action-footer">
        <ha-button class="add-button" @click=${this._toggleAction('add')}>
          <span>Add new info bar</span>
        </ha-button>
        ${this.config.range_info?.length !== 0
          ? html` <ha-button class="delete-btn" @click=${this._toggleAction('showdelete')}>
              <span class="showdelete">Delete</span>
            </ha-button>`
          : nothing}
      </div>
    `;
    return html` <div class="indicator-config">${this._renderRangeConfigContent()} ${actionFooter}</div> `;
  }

  private _toggleAction(action?: 'add' | 'delete' | 'showdelete', index?: number): () => void {
    return () => {
      const updateChanged = (update: any) => {
        fireEvent(this, 'config-changed', { config: { ...this.config, range_info: update } });
      };
      const hideAllDeleteButtons = () => {
        const deleteButtons = this.shadowRoot?.querySelectorAll('.card-actions');
        deleteButtons?.forEach((button) => {
          button.classList.add('hidden');
        });
      };

      if (action === 'add') {
        hideAllDeleteButtons();
        const rangeInfo = [...(this.config.range_info || [])];
        const newRangeInfo = {
          energy_level: [{ entity: '', attribute: '', icon: '' }],
          range_level: [{ entity: '', attribute: '' }],
          progress_color: '',
        };
        rangeInfo.push(newRangeInfo);
        updateChanged(rangeInfo);
      }
      if (action === 'delete' && index !== undefined) {
        const rangeInfo = [...(this.config.range_info || [])];
        rangeInfo.splice(index, 1);
        updateChanged(rangeInfo);
      }

      if (action === 'showdelete') {
        const deleteButtons = this.shadowRoot?.querySelectorAll('.card-actions');
        const isHidden = deleteButtons?.[0].classList.contains('hidden'); // Check if the first button is hidden
        const showDeleteBton = this.shadowRoot?.querySelector('.showdelete') as HTMLElement;
        showDeleteBton.innerText = isHidden ? 'Cancel' : 'Delete';
        deleteButtons?.forEach((button) => {
          button.classList.toggle('hidden');
        });
      }
    };
  }

  private _renderRangeConfigContent(): TemplateResult {
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

    const wrapper = (index: number) => html`
      <div class="sub-panel-config" data-index=${index}>
        ${Object.keys(configContent).map(
          (key) => html`
            <div class="sub-panel">
              <div class="sub-header">
                <span class="title">${configContent[key].title}</span>
                <ha-icon
                  class="info-icon"
                  icon="mdi:help-circle"
                  @click=${(ev: Event) => this._toggleHelp(ev)}
                ></ha-icon>
                ${configContent[key].helper}
              </div>
              <div class="sub-content ${key}">${configContent[key].config(index)}</div>
            </div>
          `
        )}
      </div>
    `;
    return html`
      ${repeat(this.config.range_info, (rangeItem: RangeInfoConfig, index: number) => {
        const entity = rangeItem.energy_level.map((item) => item.entity).join(', ');
        const icon = rangeItem.energy_level.map((item) => item.icon).join(', ') ?? 'mdi:gas-station';
        const progressColor = rangeItem.progress_color;
        return html`
          <div class="item-row-panel">
            <ha-expansion-panel
              class="panel-row"
              .index=${index}
              .outlined=${true}
              .expanded=${false}
              .header=${'Info bar #' + (index + 1)}
              .secondary=${entity}
              .leftChevron=${true}
            >
              <div slot="icons" style="color: ${progressColor};">
                <ha-icon icon=${icon}></ha-icon>
              </div>
              <div class="card-config">${wrapper(index)}</div>
            </ha-expansion-panel>
            <div class="card-actions hidden">
              <ha-icon-button @click=${this._toggleAction('delete', index)}
                ><ha-icon icon="mdi:close"></ha-icon
              ></ha-icon-button>
            </div>
          </div>
        `;
      })}
    `;
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

    const energyEntry = this.config.range_info[index].energy_level[0] as RangeItemConfig;
    const energyEntity = energyEntry?.entity;
    const energyAttribute = energyEntry?.attribute;
    const energyIcon = energyEntry?.icon || '';
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
          value: energyIcon,
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

    const rangeEntry = this.config.range_info[index].range_level[0] as RangeItemConfig;
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
          .configValue=${'progress_color'}
          .index=${index}
          @change=${(ev: Event) => this._valueChanged(ev)}
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
        <ha-button @click=${() => this._handleNewColor(index)}>Save</ha-button>
        <ha-button @click=${() => (this._activeIndexItem = null)}>Cancel</ha-button>
        <ha-button @click=${() => this._picker.color.reset()}>Reset</ha-button>
      </div>
    </div>
    <div class="picker-wrapper">
      <div id="picker"></div>
    </div>
    `;
    return this._activeIndexItem === index ? colorPicker : defaultContent;
  }

  private _handleNewColor(index: number): void {
    if (!this._newColor) {
      return;
    }
    const target = {
      configType: 'progress_color',
      value: this._newColor,
      index: index,
    };
    this._valueChanged({ target });
    console.log(target);
    this._newColor = '';
    this.requestUpdate();
  }

  private _toggleColorPicker(index: number, color: string): void {
    this._activeIndexItem = index;
    this.updateComplete.then(() => {
      this._initColorPicker(color);
    });
  }

  private _valueChanged(ev: any): void {
    if (!this.config || !this.hass) {
      return;
    }

    const target = ev.target as any;
    const index = target.index; // Index of the range_info item being modified
    const configType = target.configType; // E.g., 'energy_level', 'range_level', 'progress_color'
    const configValue = target.configValue; // E.g., 'entity', 'icon', etc.
    let newValue: any;

    if (configValue === 'attribute') {
      newValue = ev.detail.value;
    } else {
      newValue = target.value;
    }

    // console.log(ev, configValue, configType, index, newValue);
    const updates: Partial<VehicleStatusCardConfig> = {};

    // Fetch the current range_info array
    const rangeInfo = [...(this.config.range_info || [])];
    const rangeInfoItem = { ...rangeInfo[index] }; // Clone the item at the specific index

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

      // Trigger an update or fire an event to apply the changes
      fireEvent(this, 'config-changed', { config: { ...this.config, ...updates } });
      return; // No need to proceed further for progress_color
    }

    // Clone the nested configType object (e.g., energy_level or range_level) if it's not progress_color
    const rangeInfoConfig = [...(rangeInfoItem[configType] || [])];

    // Check if the value actually changed
    if (rangeInfoConfig[0][configValue] === newValue) {
      // console.log('Value not changed');
      return;
    }

    // Update the nested config type (e.g., energy_level or range_level)
    rangeInfoConfig[0] = { ...rangeInfoConfig[0], [configValue]: newValue };

    // Update the specific config type (e.g., energy_level or range_level) in the item
    rangeInfoItem[configType] = rangeInfoConfig;

    // Replace the modified item in the range_info array
    rangeInfo[index] = rangeInfoItem;

    // Apply the updates
    updates.range_info = rangeInfo;

    console.log(`Range info [${index}] ${configType} ${configValue} changed to`, newValue);
    console.log('Updates', updates);

    // Trigger an update or fire an event to apply the changes
    fireEvent(this, 'config-changed', { config: { ...this.config, ...updates } });
  }
}
