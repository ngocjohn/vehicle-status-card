import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { repeat } from 'lit/directives/repeat.js';

import {
  HomeAssistantExtended as HomeAssistant,
  VehicleStatusCardConfig,
  IndicatorConfig,
  IndicatorGroupConfig,
  IndicatorGroupItemConfig,
} from '../../types';
import editorcss from '../../css/editor.css';
import { fireEvent } from 'custom-card-helpers';
import { CONFIG_VALUES } from '../editor-const';

import Sortable from 'sortablejs';

import * as Create from '../../utils/create';

@customElement('panel-indicator')
export class PanelIndicator extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: Object }) editor?: any;
  @property({ type: Object }) config!: VehicleStatusCardConfig;
  @property({ type: String }) type!: 'single' | 'group';

  @state() _sortable: Sortable | null = null;
  @state() private _activeSubPanel: number | null = null;
  @state() private _activeGroupItem: number = 0;

  @state() private _newIndicator: Map<string, string> = new Map();

  @state() _reindexItems: boolean = false;

  constructor() {
    super();
    this._closeSubPanel = this._closeSubPanel.bind(this);
    this._toggleEditGroupItem = this._toggleEditGroupItem.bind(this);
    this._removeIndicatorType = this._removeIndicatorType.bind(this);
    this._createItemPicker = this._createItemPicker.bind(this);
    this.initSortable = this.initSortable.bind(this);
  }

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._resetItems();
    this.initSortable();
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (_changedProperties.has('_activeSubPanel') && this._activeSubPanel === null) {
      this._resetItems();
    }
    if (_changedProperties.has('_activeGroupItem') && this._activeGroupItem === null) {
      this._resetItems();
    }

    return true;
  }

  protected render(): TemplateResult {
    const type = this.type;
    if (!type) {
      return html`<span>Invalid type</span>`;
    }

    return html` <div class="base-config">${this._renderIndicatorList(type)} ${this._subPanelConfig(type)}</div> `;
  }

  private _subPanelConfig(type: 'single' | 'group'): TemplateResult {
    if (this._activeSubPanel === null) {
      return html``;
    }

    if (this._reindexItems) {
      return html`<span>Loading...</span>`;
    }

    const typeConfigMap = {
      single: {
        header: 'Indicator settings',
      },
      group: {
        header: 'Group settings',
      },
    };

    return html`
      <div class="sub-panel">
        <div class="sub-header">
          <div class="sub-header-title">${typeConfigMap[type].header}</div>
          <div class="subcard-icon" @click=${this._closeSubPanel}>
            <ha-icon icon="mdi:close"></ha-icon>
          </div>
        </div>
        ${type === 'single' ? this._renderSingleSubPanelConfig() : this._renderGroupSubPanelConfig()}
      </div>
    `;
  }

  /* ------------------------ SUB INDICATORS RENDER ------------------------ */

  private _renderSingleSubPanelConfig(): TemplateResult | typeof nothing {
    const type = this.type;
    if (type !== 'single') {
      return nothing;
    }

    if (this._activeSubPanel === null) {
      return html``;
    }

    const singleIndicators = this.config.indicators?.single || [];

    const configIndex = this._activeSubPanel;

    const indicator = singleIndicators[configIndex];

    // Shared config for all pickers
    const sharedConfig = {
      configIndex,
      configType: 'single',
    };

    const attributes = indicator?.entity ? Object.keys(this.hass.states[indicator.entity].attributes) : [];

    const attrOpts = [...attributes.map((attr) => ({ value: attr, label: attr }))];

    const singlePicker = [
      { value: indicator.entity, pickerType: 'entity', label: 'Entity single' },
      { value: indicator.attribute, pickerType: 'attribute', items: attrOpts },
      { value: indicator.icon, pickerType: 'icon' },
    ];

    const singleTemplate = [
      {
        value: indicator.visibility,
        pickerType: 'template',
        configValue: 'visibility',
        options: {
          label: 'Visibility template',
          helperText: 'Template for the visibility. Use Jinja2 template with result as true to show the indicator',
        },
      },
      {
        value: indicator.icon_template,
        pickerType: 'template',
        configValue: 'icon_template',
        options: {
          label: 'Icon template',
          helperText: 'Template for the icon',
        },
      },
      {
        value: indicator.state_template,
        pickerType: 'template',
        configValue: 'state_template',
        options: {
          label: 'State template',
          helperText: 'Template for the state',
        },
      },
    ];

    const subPanelConfig = html`
      <div class="sub-panel-config">
        <div class="sub-content">
          ${singlePicker.map((config) => this._createItemPicker({ ...config, ...sharedConfig }))}
        </div>
      </div>
      <div class="sub-panel-config">
        ${singleTemplate.map((config) => this._createItemPicker({ ...config, ...sharedConfig }, 'template-content'))}
      </div>
    `;

    return subPanelConfig;
  }

  private _renderGroupSubPanelConfig(): TemplateResult {
    const type = this.type;
    if (!type) {
      return html`<span>Invalid type</span>`;
    }

    // If no active group sub-panel, return empty template
    if (this._activeSubPanel === null) {
      return html``;
    }

    const configIndex = this._activeSubPanel || 0;
    const group: IndicatorGroupConfig = this.config.indicators?.group[configIndex];

    const configShared = {
      component: this,
      configIndex,
      configType: 'group',
    };

    const groupPicker = [
      { value: group.name, pickerType: 'textfield', label: 'Group name', configValue: 'name' },
      { value: group.icon, pickerType: 'icon' },
      {
        value: group.visibility,
        pickerType: 'template',
        configValue: 'visibility',
        options: {
          label: 'Visibility template',
          helperText: 'Template for the visibility. Use Jinja2 template with result as true to show the indicator',
        },
      },
    ];

    const groupNameIcon = html`
      <div class="sub-content">
        ${groupPicker.map((config) => this._createItemPicker({ ...config, ...configShared }))}
      </div>
    `;

    // Group items configuration
    const groupItems = group.items || [];
    const itemsTabs = groupItems.map((_, index) => {
      return {
        key: `item-${index}`,
        label: `#${index + 1}`,
        content: this._renderSubGroupItemConfig(index),
      };
    });

    // Group item content
    const groupItemContent = html`
      <div class="sub-header">
        <div class="subcard-icon" @click=${() => this._addNewType('item')}>
          <ha-button>Add item</ha-button>
        </div>
        <div class="sub-header-title">Group items</div>
      </div>

      <div class="sub-panel-config">
        ${groupItems.length === 0
          ? html`<div>This group: '${group.name}' has no items, add them using the button above.</div>`
          : Create.TabBar({
              tabs: itemsTabs,
              activeTabIndex: this._activeGroupItem || 0,
              onTabChange: (index: number) => this._toggleEditGroupItem(index),
            })}
      </div>
    `;

    return html` <div class="sub-panel-config">${groupNameIcon} ${groupItemContent}</div>`;
  }

  /* ----------------------------- TEMPLATE UI ----------------------------- */

  private _renderAddTemplate(type: string): TemplateResult {
    const formPicker = {
      single: html`
        <ha-entity-picker
          .hass=${this.hass}
          .configValue=${'entity'}
          .label=${'Add new indicator'}
          .value=${this._newIndicator.get('entity')}
          .configType=${'single'}
          .allowCustomEntity=${true}
          @change=${this._handleNewIndicator}
        ></ha-entity-picker>
      `,
      group: html` <ha-textfield
        .label=${'Add new group'}
        .configValue=${'name'}
        .configType=${'group'}
        @change=${this._handleNewIndicator}
      ></ha-textfield>`,
    };

    return html`
      <div class="item-config-row new-item">
        <div class="item-content">${formPicker[type]}</div>
        <div class="item-actions">
          <div class="action-icon" @click=${() => this._addNewType(type)}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </div>
        </div>
      </div>
    `;
  }

  private _addNewType(type: string): void {
    const reset = () => {
      this._newIndicator.clear(); // Clear all keys
      this._resetItems();
    };

    const updateConfig = (newIndicators: Partial<VehicleStatusCardConfig['indicators']>) => {
      this.config = {
        ...this.config,
        indicators: { ...this.config.indicators, ...newIndicators },
      };
      fireEvent(this, 'config-changed', { config: this.config });
      reset();
    };

    const entity = this._newIndicator.get('entity');
    const name = this._newIndicator.get('name');

    if (type === 'single' && entity) {
      const indicators = this.config.indicators?.single || [];
      const newIndicator: IndicatorConfig = {
        entity,
        icon: '',
        attribute: '',
      };
      updateConfig({ single: [...indicators, newIndicator] });
    } else if (type === 'group' && name) {
      const groupIndicators = this.config.indicators?.group || [];
      const newGroup: IndicatorGroupConfig = {
        name,
        icon: 'mdi:car',
        visibility: '',
        items: [],
      };
      updateConfig({ group: [...groupIndicators, newGroup] });
    } else if (type === 'item' && this._activeSubPanel !== null) {
      const groupIndicators = this.config.indicators?.group || [];
      const items = groupIndicators[this._activeSubPanel].items || [];
      const newItem: IndicatorGroupItemConfig = {
        entity: '',
        name: '',
        icon: '',
        attribute: '',
      };
      const updatedItems = [...items, newItem];
      const updatedGroup = { ...groupIndicators[this._activeSubPanel], items: updatedItems };
      const updatedGroups = [
        ...groupIndicators.slice(0, this._activeSubPanel),
        updatedGroup,
        ...groupIndicators.slice(this._activeSubPanel + 1),
      ];
      updateConfig({ group: updatedGroups });
    } else {
      console.error('Invalid or unknown indicator type');
    }
  }

  private _createItemPicker(config: any, wrapperClass = 'item-content'): TemplateResult {
    return html`
      <div class="${wrapperClass}">
        ${Create.Picker({
          ...config,
          component: this,
        })}
      </div>
    `;
  }

  private _toggleEditIndicator(index: number): void {
    this._activeSubPanel = this._activeSubPanel === index ? null : index;
  }

  private _renderIndicatorList(type: 'single' | 'group'): TemplateResult {
    if (this._reindexItems) {
      return html`<span>Loading...</span>`;
    }

    if (this._activeSubPanel !== null) {
      return html``;
    }

    if (type === 'single') {
      const singleIndicators: IndicatorConfig[] = this.config.indicators?.single || [];
      return this._renderIndicatorContent(
        singleIndicators,
        (single: IndicatorConfig) => single.entity,
        (single: IndicatorConfig, index: number) => {
          const entityPickerConfig = {
            component: this,
            value: single.entity,
            configType: 'single',
            configIndex: index,
            label: 'Entity indicator',
            pickerType: 'entity' as 'entity',
            items: undefined, // Ensure 'items' is defined, even if it's not needed for 'entity'
          };
          return Create.Picker(entityPickerConfig);
        }
      );
    } else if (type === 'group') {
      const groupIndicators: IndicatorGroupConfig[] = this.config.indicators?.group || [];
      return this._renderIndicatorContent(
        groupIndicators,
        (group: IndicatorGroupConfig) => group.name,
        (group: IndicatorGroupConfig, index) => {
          const textFieldConfig = {
            component: this,
            label: 'Group name',
            configValue: 'name',
            value: group.name,
            configType: 'group',
            configIndex: index,
            pickerType: 'textfield' as 'textfield',
          };
          return Create.Picker(textFieldConfig);
        }
      );
    }

    return html`<div>No indicators available</div>`;
  }

  private _renderIndicatorContent<T extends IndicatorConfig | IndicatorGroupConfig>(
    indicators: T[],
    getKey: (indicator: T) => string,
    renderContent: (indicator: T, index: number) => TemplateResult
  ): TemplateResult {
    return html`
      <div class="indicator-list" id="indicator-${this.type}-list">
        ${repeat(
          indicators,
          getKey,
          (indicator: T, index: number) => html`
            <div class="item-config-row" data-index=${index}>
              <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
              <div class="item-content">${renderContent(indicator, index)}</div>
              <div class="item-actions">
                <div class="action-icon" @click=${() => this._removeIndicatorType(index)}>
                  <ha-icon icon="mdi:close"></ha-icon>
                </div>
                <div class="action-icon" @click=${() => this._toggleEditIndicator(index)}>
                  <ha-icon icon="mdi:pencil"></ha-icon>
                </div>
              </div>
            </div>
          `
        )}
      </div>
      ${this._renderAddTemplate(this.type)}
    `;
  }

  private _renderSubGroupItemConfig(index: number): TemplateResult {
    if (this._activeGroupItem === null || this._activeSubPanel == null) {
      return html``;
    }

    const items = this.config.indicators?.group[this._activeSubPanel].items || [];

    const item = items[index];

    const itemEntity = item?.entity;
    const itemName = item?.name || '';
    const itemIcon = item?.icon || '';
    const itemAttribute = item?.attribute || '';

    const attributes = item?.entity ? Object.keys(this.hass.states[item.entity].attributes) : [];
    const attrOpts = [...attributes.map((attr) => ({ value: attr, label: attr }))];

    const groupItemConfig = [
      { value: itemName, pickerType: 'textfield', label: 'Item name', configValue: 'name' },
      { value: itemEntity, pickerType: 'entity', label: 'Entity indicator' },
      { value: itemIcon, pickerType: 'icon' },
      { value: itemAttribute, pickerType: 'attribute', items: attrOpts },
    ];

    const groupItemTemplate = [
      {
        value: item.icon_template,
        pickerType: 'template',
        configValue: 'icon_template',
        options: {
          label: 'Icon template',
          helperText: 'Template for the icon',
        },
      },
      {
        value: item.state_template,
        pickerType: 'template',
        configValue: 'state_template',
        options: {
          label: 'State template',
          helperText: 'Template for the state',
        },
      },
    ];

    const sharedConfig = {
      configIndex: index,
      configType: 'item',
    };

    return html`
      <div class="sub-content">
        ${groupItemConfig.map((config) => this._createItemPicker({ ...config, ...sharedConfig }))}
      </div>
      <div class="sub-panel-config">
        ${groupItemTemplate.map((config) => this._createItemPicker({ ...config, ...sharedConfig }, 'template-content'))}
      </div>
      <div class="action-footer" style="justify-content: flex-end;">
        <ha-button class="delete-btn" @click=${() => this._removeGroupItem(index)}>Remove</ha-button>
      </div>
    `;
  }

  private _toggleEditGroupItem(index: number): void {
    this._activeGroupItem = index;
    this.requestUpdate();
  }

  private _removeGroupItem(index: number): void {
    if (this._activeSubPanel === null) {
      return;
    }

    const groupIndex = this._activeSubPanel; // Group index
    const groupIndicators = this.config.indicators?.group || [];
    const group = groupIndicators[groupIndex];
    const items = group.items || [];
    const updatedItems = items.filter((_, i) => i !== index); // Remove item at index
    const updatedGroup = { ...group, items: updatedItems };
    const updatedGroups = [
      ...groupIndicators.slice(0, groupIndex),
      updatedGroup,
      ...groupIndicators.slice(groupIndex + 1),
    ];
    this.config = { ...this.config, indicators: { ...this.config.indicators, group: updatedGroups } };
    fireEvent(this, 'config-changed', { config: this.config });
    this.updateComplete.then(() => {
      this._activeGroupItem = this._activeGroupItem === 0 ? 0 : this._activeGroupItem - 1;
    });
  }

  private _closeSubPanel(): void {
    // const subPanel = this.shadowRoot?.querySelector('.sub-panel-config');
    // const icon = this.shadowRoot?.querySelector('.subcard-icon');
    // if (subPanel && icon) {
    //   icon.classList.toggle('active');
    //   subPanel.classList.toggle('closed');
    // }
    setTimeout(() => {
      this._activeSubPanel = null;
    }, 500);
  }

  private _handleNewIndicator(ev: any): void {
    ev.stopPropagation();
    const target = ev.target as any;
    const configValue = target.configValue;
    const value = target.value;

    const newIndicator = new Map(this._newIndicator);
    newIndicator.set(configValue, value);
    this._newIndicator = newIndicator;

    this.requestUpdate();
  }

  _valueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this.config || !this.hass) {
      return;
    }

    const target = ev.target as any;
    let index = target.index; // Index of the single or group item being modified
    const configType = target.configType; // single || group
    const configValue = target.configValue; // E.g., entity, icon, attribute, etc

    let configIndex = target.configIndex;
    let newValue: any;

    if (CONFIG_VALUES.includes(configValue)) {
      newValue = ev.detail.value;
    } else {
      newValue = target.value;
    }

    const updates: Partial<VehicleStatusCardConfig> = {};

    // Fetch the current indicators config

    let indicatorsConfig = { ...(this.config.indicators || {}) };
    // console.log('current indicators:', indicatorsConfig);

    // SINGLE CHANGE

    if (configType === 'single') {
      let singleIndicators = [...indicatorsConfig.single]; // Clone single []
      let singleItemIndex = { ...singleIndicators[index] }; // Clonse single item at config

      if (!newValue && configValue === 'entity') {
        singleIndicators = [...singleIndicators.slice(0, index), ...singleIndicators.slice(index + 1)];
        console.log(singleIndicators);
        updates.indicators = {
          ...indicatorsConfig,
          single: singleIndicators,
        };
      } else if (singleItemIndex[configValue] === newValue) {
        console.log('Value not changed');
        return;
      } else {
        const singleItemUpdated = { ...singleItemIndex, [configValue]: newValue };
        singleIndicators[index] = singleItemUpdated;
        indicatorsConfig[configType] = singleIndicators;

        updates.indicators = indicatorsConfig; // update indicators config

        console.log('single changed:', configValue, ':', newValue);
      }
    }

    // GROUP CHANGE

    if (configType === 'group') {
      let groupIndicators = [...indicatorsConfig.group];
      // console.log('group indicators:', groupIndicators);

      let group = { ...groupIndicators[index] };
      // console.log('group item', [index], group);
      if (group[configValue] === newValue) {
        console.log(group[configValue] === newValue, 'Value not changed');
        return;
      } else {
        group[configValue] = newValue;
        groupIndicators[index] = group;
        indicatorsConfig[configType] = groupIndicators;
        updates.indicators = indicatorsConfig;
        console.log('group changed:', configValue, ':', newValue);
      }
    }

    if (configType === 'item' && configType !== 'group' && configType !== 'single') {
      index = this._activeSubPanel;
      configIndex = this._activeGroupItem;
      let groupIndicators = this.config.indicators?.group || [];
      // console.log('group indicators:', groupIndicators);
      const group = groupIndicators[index];
      // console.log('group item', [index], group);
      const items = group.items || [];
      const item = items[configIndex];

      if (item[configValue] === newValue) {
        return;
      } else if (!newValue && configValue === 'entity') {
        console.log('not new value');
        return;
      } else {
        const updatedItem = { ...item, [configValue]: newValue };
        const updatedItems = [...items.slice(0, configIndex), updatedItem, ...items.slice(configIndex + 1)];
        const updatedGroup = { ...group, items: updatedItems };
        groupIndicators = [...groupIndicators.slice(0, index), updatedGroup, ...groupIndicators.slice(index + 1)];
        updates.indicators = { ...this.config.indicators, group: groupIndicators };
        // console.log('group item changed:', configValue, ':', newValue);
      }
    }

    if (Object.keys(updates).length > 0) {
      this.config = { ...this.config, ...updates };
      fireEvent(this, 'config-changed', { config: this.config });
      // console.log('config changed', updates);
    }
  }

  private _removeIndicatorType(index: number): void {
    const type = this.type;

    const updateConfig = (updatedItems: Partial<VehicleStatusCardConfig['indicators']>) => {
      this.config = {
        ...this.config,
        indicators: { ...this.config.indicators, ...updatedItems },
      };
      fireEvent(this, 'config-changed', { config: this.config });
      this._validateAndReindexItems();
    };

    if (type === 'single' && index !== null) {
      const indicators = this.config.indicators?.single || [];
      const updatedIndicators = indicators.filter((_, i) => i !== index);
      updateConfig({ single: updatedIndicators });
    } else if (type === 'group' && index !== null) {
      const groupIndicators = this.config.indicators?.group || [];
      const updatedGroups = groupIndicators.filter((_, i) => i !== index);
      updateConfig({ group: updatedGroups });
    } else {
      console.error('Invalid or unknown indicator type');
    }
    console.log('Removed indicator', type, index);
  }

  private initSortable(): void {
    const list = this.shadowRoot?.getElementById(`indicator-${this.type}-list`);
    if (!list) {
      console.log('List not found');
      return;
    }

    // console.log('Init sortable');
    this._sortable = new Sortable(list, {
      handle: '.handle',
      animation: 150,
      onEnd: (evt) => {
        this._handleSortEnd(evt);
      },
    });
  }

  private _validateAndReindexItems(): void {
    setTimeout(() => {
      const itemListCount = this.shadowRoot?.querySelectorAll('.indicator-list .item-config-row').length || 0;

      let configIndicatorsCount: number = 0;

      if (this.type === 'single') {
        configIndicatorsCount = this.config.indicators?.single?.length;
      } else if (this.type === 'group') {
        configIndicatorsCount = this.config.indicators?.group?.length;
      }

      if (itemListCount !== configIndicatorsCount) {
        console.log('Reindexing items');
        this._sortable?.destroy();
        this._reindexItems = true;
        this.requestUpdate();
        this._resetItems();
      }
    }, 200);
  }

  private _resetItems(): void {
    setTimeout(() => {
      this._reindexItems = false;
      this.updateComplete.then(() => {
        this._hideClearButton();
        if (!this._sortable) {
          this.initSortable();
        }
      });
    }, 200);
  }

  /* ---------------------------- SORTABLE HANDLERS --------------------------- */

  private _handleSortEnd(evt: any): void {
    evt.stopPropagation();
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;

    if (oldIndex === newIndex) {
      return;
    }
    const type = this.type;

    const updateConfig = (updatedItems: Partial<VehicleStatusCardConfig['indicators']>) => {
      this.config = {
        ...this.config,
        indicators: { ...this.config.indicators, ...updatedItems },
      };
      fireEvent(this, 'config-changed', { config: this.config });
      this._resetItems();
    };

    if (type === 'single') {
      let indicators = [...(this.config.indicators?.single || [])];
      const [indicator] = indicators.splice(oldIndex, 1);
      indicators.splice(newIndex, 0, indicator);
      updateConfig({ single: indicators });
    } else if (type === 'group') {
      let groupIndicators = [...(this.config.indicators?.group || [])];
      const [group] = groupIndicators.splice(oldIndex, 1);
      groupIndicators.splice(newIndex, 0, group);
      updateConfig({ group: groupIndicators });
    } else {
      console.error('Invalid or unknown indicator type');
    }
  }

  _hideClearButton(): void {
    this.updateComplete.then(() => {
      const entityPickers = this.shadowRoot?.querySelectorAll('#entity-picker-form');
      if (entityPickers) {
        entityPickers.forEach((entityPicker) => {
          const comboBox = entityPicker.shadowRoot
            ?.querySelector('ha-combo-box')
            ?.shadowRoot?.querySelector('vaadin-combo-box-light > ha-svg-icon.clear-button') as HTMLElement;
          if (comboBox) {
            comboBox.style.display = 'none';
          } else {
            return;
          }
        });
      }
    });
  }
}
