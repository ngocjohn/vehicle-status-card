import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import Sortable from 'sortablejs';

import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import {
  HomeAssistant,
  VehicleStatusCardConfig,
  IndicatorConfig,
  IndicatorGroupConfig,
  IndicatorGroupItemConfig,
  fireEvent,
} from '../../types';
import { showPromptDialog } from '../../utils';
import './sub-panel-yaml';
import * as Create from '../../utils/create';
import { VehicleStatusCardEditor } from '../editor';
import { CONFIG_VALUES } from '../editor-const';
import { singleIndicatorSchema, singleApparenceSchema, singleActionSchema } from '../form';
import { mainGroupSchema, groupApparenceSchema, subGroupItemSchema } from '../form/indicators-schema';

enum TYPES {
  SINGLE = 'single',
  GROUP = 'group',
}
@customElement('panel-indicator')
export class PanelIndicator extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) editor!: VehicleStatusCardEditor;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;
  @property({ attribute: 'type', reflect: true }) public type!: TYPES;

  @state() _sortable: Sortable | null = null;
  @state() private _activeSubPanel: number | null = null;
  @state() private _activeGroupItem: number | null = null;

  @state() _reindexItems: boolean = false;
  @state() _yamlEditorVisible: boolean = false;
  @state() _yamlSubPanelVisible: boolean = false;
  @state() protected _selectedItem = 0;
  @state() groupItems?: IndicatorGroupItemConfig[];

  constructor() {
    super();
    this._toggleEditGroupItem = this._toggleEditGroupItem.bind(this);
    this._removeIndicatorType = this._removeIndicatorType.bind(this);
    this.initSortable = this.initSortable.bind(this);
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host([type='group']) .action-footer {
          justify-content: space-between;
        }
        :host([type='single']) .action-footer {
          justify-content: flex-end;
        }
        *[hidden] {
          display: none !important;
        }
        ha-expansion-panel:not(:last-child) {
          margin-bottom: var(--vic-gutter-gap);
        }
        .add-entity {
          display: block;
          margin-left: 36px;
          margin-inline-start: 36px;
          margin-inline-end: 48px;
          direction: var(--direction);
        }
        .edit-yaml-btn {
          --mdc-theme-primary: var(--accent-color);
          place-self: flex-end;
        }
        .toolbar {
          display: flex;
        }
        .sub-panel-config.group {
          border: 1px solid var(--outline-color);
          margin-block: var(--vic-gutter-gap);
          padding: 4px 8px;
          border-radius: 8px;
        }
        .empty-list {
          display: flex;
          flex: 1;
          align-items: anchor-center;
          text-transform: uppercase;
          font-weight: 500;
          font-size: 14px;
        }
      `,
      editorcss,
    ];
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    // this._resetItems();
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

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('_activeSubPanel') && this._activeSubPanel !== null) {
      if (!this._sortable) {
        this.initSortable();
      }
    }
  }

  protected render(): TemplateResult {
    return html` <div class="base-config">${this._renderIndicatorList()} ${this._subPanelConfig()}</div> `;
  }

  private _subPanelConfig(): TemplateResult {
    if (this._activeSubPanel === null) {
      return html``;
    }
    const type = this.type;
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
        ${this._renderHeader(
          typeConfigMap[type].header,
          undefined,
          this._yamlSubPanelVisible
            ? [
                {
                  title: 'Close YAML',
                  action: () => {
                    this._yamlSubPanelVisible = false;
                  },
                  icon: ICON.CLOSE,
                },
              ]
            : [
                {
                  title: 'Back',
                  action: () => {
                    this._activeSubPanel = null;
                  },
                  icon: ICON.CHEVRON_LEFT,
                },
              ],
          [
            {
              action: () => {
                this._yamlSubPanelVisible = !this._yamlSubPanelVisible;
              },
            },
          ]
        )}
        ${this._yamlSubPanelVisible
          ? this._renderYamlSubPanelConfig(this._activeSubPanel)
          : type === 'single'
          ? this._renderSingleSubPanelConfig()
          : this._renderGroupSubPanelConfig()}
      </div>
    `;
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

  /* ------------------------ SUB INDICATORS RENDER ------------------------ */

  private _renderYamlSubPanelConfig(configIndex: number): TemplateResult | typeof nothing {
    if (!this._yamlSubPanelVisible) {
      return nothing;
    }
    const type = this.type;
    if (!type) {
      return nothing;
    }

    const singleIndicators = this.config.indicators?.single || [];
    const groupIndicators = this.config.indicators?.group || [];
    const yamlConfig = {
      single: singleIndicators[configIndex],
      group: groupIndicators[configIndex],
    };

    return html` <div>
      <vsc-sub-panel-yaml
        .hass=${this.hass}
        .config=${this.config}
        .cardEditor=${this.editor}
        .configDefault=${yamlConfig[type]}
        .configIndex=${configIndex}
        .configKey=${type}
        @yaml-config-changed=${this._handleYamlSubChanged}
      ></vsc-sub-panel-yaml>
    </div>`;
  }

  private _handleYamlSubChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const detail = ev.detail;
    const { isValid, value, key, index } = detail;
    if (!isValid || !this.config) {
      return;
    }
    if (key === 'single') {
      const singleIndicators = this.config.indicators?.single || [];
      singleIndicators[index] = value;
      this.config = { ...this.config, indicators: { ...this.config.indicators, single: singleIndicators } };
    } else if (key === 'group') {
      const groupIndicators = this.config.indicators?.group || [];
      groupIndicators[index] = value;
      this.config = { ...this.config, indicators: { ...this.config.indicators, group: groupIndicators } };
    }
    fireEvent(this, 'config-changed', { config: this.config });
    // console.log('YAML config changed:', key, value);
  }

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
    const data = { ...indicator };

    const _singleSchema = (entity: string) => [
      ...singleIndicatorSchema(entity),
      ...singleApparenceSchema,
      ...singleActionSchema,
    ];

    const singleForm = html`
      <ha-form
        .hass=${this.hass}
        .schema=${_singleSchema(indicator.entity)}
        .data=${data}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._singleValueChanged}
      >
      </ha-form>
    `;

    return singleForm;
  }

  private _renderGroupSubPanelConfig(): TemplateResult {
    // If no active group sub-panel, return empty template
    if (this._activeSubPanel === null) {
      return html``;
    }

    const configIndex = this._activeSubPanel || 0;
    const group: IndicatorGroupConfig = this.config.indicators?.group[configIndex];

    const data = { ...group };
    const _groupSchema = () => [...mainGroupSchema, ...groupApparenceSchema];

    const groupForm = html`
      <ha-form
        .hass=${this.hass}
        .schema=${_groupSchema()}
        .data=${data}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._groupValueChanged}
      >
      </ha-form>
    `;

    // Group items configuration
    this.groupItems = group.items || [];
    const selectedItem = this._selectedItem!;
    const itemsLength = this.groupItems.length;

    const toolBar = html`
      <div class="toolbar">
        ${!this.groupItems.length || this.groupItems.length === 0
          ? html`<div class="empty-list">No items yet, click + to add</div>`
          : html`
              <vic-tab-bar>
                ${this.groupItems.map(
                  (_item, i) =>
                    html`<vic-tab
                      .active=${selectedItem === i}
                      .name=${`#${i + 1}`}
                      @click=${() => (this._selectedItem = i)}
                      style="flex: 0!important;"
                    ></vic-tab>`
                )}
              </vic-tab-bar>
            `}
        <vic-tab
          id="add-item"
          .active=${selectedItem === itemsLength}
          @click=${() => {
            this._addNewType('item');
            setTimeout(() => {
              this._selectedItem = itemsLength;
            }, 200);
          }}
          .narrow=${true}
        >
          <ha-svg-icon .path=${ICON.PLUS} slot="icon"></ha-svg-icon>
        </vic-tab>
      </div>
    `;

    return html`
      ${groupForm}
      <div class="sub-panel-config group">
        ${toolBar}
        ${this.groupItems.map((_, index) => {
          return html`
            <div ?hidden=${selectedItem !== index} @click=${() => this._toggleEditGroupItem(index)}>
              ${this._renderSubGroupItemConfig(index)}
              <div class="action-footer" style="justify-content: flex-end;">
                <ha-button
                  class="delete-btn"
                  .label=${'Remove Item'}
                  @click=${() => {
                    this._removeGroupItem(index), (this._selectedItem = index === 0 ? 0 : index - 1);
                  }}
                ></ha-button>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderSubGroupItemConfig(index: number): TemplateResult {
    const items = this.config.indicators?.group[this._activeSubPanel!].items;
    const item = items[index];
    const itemData = { ...item };
    const _itemSchema = () => [...subGroupItemSchema(item.entity)];

    const itemForm = html`
      <ha-form
        .hass=${this.hass}
        .schema=${_itemSchema()}
        .data=${itemData}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._groupItemValueChanged}
      >
      </ha-form>
    `;

    return html` ${itemForm} `;
  }

  /* ----------------------------- TEMPLATE UI ----------------------------- */

  private _renderYamlEditor(): TemplateResult {
    if (!this._yamlEditorVisible) {
      return html``;
    }
    const singleIndicators = this.config.indicators?.single || [];
    const groupIndicators = this.config.indicators?.group || [];
    const yamlConfig = {
      single: singleIndicators,
      group: groupIndicators,
    };
    const header = html`
      <div class="sub-header">
        <div class="icon-title" @click=${() => (this._yamlEditorVisible = false)}>
          <ha-icon icon="mdi:close"></ha-icon>
          <span>Close editor</span>
        </div>
        <div>YAML editor</div>
      </div>
    `;
    return html` ${header}
      <div class="sub-panel-config">
        <vsc-sub-panel-yaml
          .hass=${this.hass}
          .config=${this.config}
          .cardEditor=${this.editor}
          .configDefault=${yamlConfig[this.type]}
          .configIndex=${0}
          .configKey=${this.type}
          @yaml-config-changed=${this._handleYamlConfigChange}
        ></vsc-sub-panel-yaml>
      </div>`;
  }

  private _handleYamlConfigChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const detail = ev.detail;
    const { key, value, isValid } = detail;
    if (!isValid || !this.config) {
      return;
    }
    if (key === 'single') {
      this.config = { ...this.config, indicators: { ...this.config.indicators, single: value } };
    } else if (key === 'group') {
      this.config = { ...this.config, indicators: { ...this.config.indicators, group: value } };
    }
    fireEvent(this, 'config-changed', { config: this.config });
    console.log('YAML config changed:', key, value);
  }

  private _addNewType(type: string, value?: string): void {
    const reset = () => {
      this._resetItems();
      this.requestUpdate();
    };

    const updateConfig = (newIndicators: Partial<VehicleStatusCardConfig['indicators']>) => {
      this.config = {
        ...this.config,
        indicators: { ...this.config.indicators, ...newIndicators },
      };
      fireEvent(this, 'config-changed', { config: this.config });
      reset();
    };

    // const entity = this._newIndicator.get('entity');
    // const name = this._newIndicator.get('name');

    if (type === 'single' && value) {
      const entity = value;
      const indicators = this.config.indicators?.single || [];
      const newIndicator: IndicatorConfig = {
        entity,
        action_config: {
          entity: entity,
          tap_action: {
            action: 'none',
          },
          hold_action: {
            action: 'none',
          },
          double_tap_action: {
            action: 'none',
          },
        },
      };
      updateConfig({ single: [...indicators, newIndicator] });
    } else if (type === 'group' && value) {
      const name = value;
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
        action_config: {
          entity: '',
          tap_action: {
            action: 'none',
          },
          hold_action: {
            action: 'none',
          },
          double_tap_action: {
            action: 'none',
          },
        },
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

  private _toggleEditIndicator(index: number): void {
    this._activeSubPanel = this._activeSubPanel === index ? null : index;
  }

  private _renderIndicatorList(): TemplateResult {
    if (this._activeSubPanel !== null) {
      return html``;
    }

    if (this._reindexItems) {
      return html`<span>Loading...</span>`;
    }
    const type = this.type;

    switch (type) {
      case 'single':
        return this._renderSingleIndicatorList();
      case 'group':
        return this._renderGroupIndicatorList();
      default:
        return html`<div>No indicators available</div>`;
    }
  }

  private _renderSingleIndicatorList(): TemplateResult {
    const singleIndicators: IndicatorConfig[] = this.config.indicators?.single || [];
    if (this._yamlEditorVisible) {
      return this._renderYamlEditor();
    }
    return this._renderIndicatorContent(
      singleIndicators,
      (single: IndicatorConfig) => single.entity,
      (single: IndicatorConfig, index: number) => {
        const entityPickerConfig = {
          component: this,
          value: single.entity,
          configType: 'single',
          configIndex: index,
          label: '',
          pickerType: 'entity' as 'entity',
          items: undefined, // Ensure 'items' is defined, even if it's not needed for 'entity'
          options: { hideClearIcon: true },
        };
        return Create.Picker(entityPickerConfig);
      },
      html`<ha-entity-picker
        .hass=${this.hass}
        .allowCustomEntity=${true}
        @value-changed=${(ev: CustomEvent) => {
          this._addNewType('single', ev.detail.value);
        }}
      ></ha-entity-picker>`
    );
  }

  private _renderGroupIndicatorList(): TemplateResult {
    const groupIndicators: IndicatorGroupConfig[] = this.config.indicators?.group || [];
    if (this._yamlEditorVisible) {
      return this._renderYamlEditor();
    }
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

  private _renderIndicatorContent<T extends IndicatorConfig | IndicatorGroupConfig>(
    indicators: T[],
    getKey: (indicator: T) => string,
    renderContent: (indicator: T, index: number) => TemplateResult,
    addedContent?: TemplateResult
  ): TemplateResult {
    const actionMap = [
      { title: 'Edit', icon: 'mdi:pencil', action: (index: number) => this._toggleEditIndicator(index) },
      {
        title: 'Remove',
        icon: 'mdi:delete',
        action: (index: number) => this._removeIndicatorType(index),
        color: 'var(--error-color)',
      },
    ];
    return html`
      <div class="indicator-list" id="indicator-${this.type}-list">
        ${repeat(
          indicators,
          getKey,
          (indicator: T, index: number) => html`
            <div class="item-config-row" data-index=${index}>
              <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
              <div class="item-content">${renderContent(indicator, index)}</div>
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
          `
        )}
        <div class="add-entity">${addedContent}</div>
      </div>
      <div class="action-footer">
        <ha-button
          .outlined=${true}
          .hidden=${this.type === 'single'}
          @click=${this._togglePromptNewGroup}
          .label=${'Add new group'}
        ></ha-button>
        <ha-button
          .outlined=${true}
          class="edit-yaml-btn"
          @click=${() => (this._yamlEditorVisible = !this._yamlEditorVisible)}
          .label=${this._yamlEditorVisible ? 'Close YAML' : 'Edit YAML'}
        >
        </ha-button>
      </div>
    `;
  }

  private _togglePromptNewGroup = async () => {
    let newGroupName = await showPromptDialog(this, 'Enter new group name', 'Group name');
    if (!newGroupName || newGroupName === '') {
      return;
    }
    this._addNewType('group', newGroupName);
  };
  private _toggleEditGroupItem(index: number): void {
    this._activeGroupItem = index;
    this.requestUpdate();
  }

  private _removeGroupItem(index: number): void {
    if (this._activeSubPanel === null) {
      return;
    }

    const groupIndex = this._activeSubPanel; // Group index
    let groupIndicators = { ...(this.config.indicators || {}) };
    let group = groupIndicators.group || [];
    let items = group[groupIndex].items || [];
    let updatedItems = [...items];
    updatedItems = updatedItems.filter((_, i) => i !== index); // Remove item at index
    items = updatedItems;
    group[groupIndex].items = items;
    groupIndicators.group = group;
    this.config = { ...this.config, indicators: groupIndicators };
    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _singleValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const config = ev.detail.value;
    const singleIndex = this._activeSubPanel!;
    const indicators = { ...(this.config.indicators || {}) };
    const singleIndicators = [...(indicators.single || [])];
    let singleItem = { ...singleIndicators[singleIndex] };
    singleItem = { ...config };
    if (!singleItem.action_config.entity && singleItem.entity) {
      singleItem.action_config.entity = singleItem.entity;
    }
    singleIndicators[singleIndex] = singleItem;

    // Update the single item
    this.config = {
      ...this.config,
      indicators: { ...this.config.indicators, single: singleIndicators },
    };

    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _groupValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const config = ev.detail.value;
    const groupIndex = this._activeSubPanel!;
    const indicators = { ...(this.config.indicators || {}) };
    const groupIndicators = [...(indicators.group || [])];
    let groupItem = { ...groupIndicators[groupIndex] };
    groupItem = { ...config };
    groupIndicators[groupIndex] = groupItem;

    console.log('Group item changed:', groupItem);
    // Update the single item
    this.config = {
      ...this.config,
      indicators: { ...this.config.indicators, group: groupIndicators },
    };

    fireEvent(this, 'config-changed', { config: this.config });
  }

  private _groupItemValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config) {
      return;
    }
    const config = ev.detail.value;
    const groupIndex = this._activeSubPanel!;
    const itemIndex = this._activeGroupItem!;
    const indicators = { ...(this.config.indicators || {}) };
    const groupIndicators = [...(indicators.group || [])];
    let groupItem = { ...groupIndicators[groupIndex] };
    let items = groupItem.items || [];
    let item = { ...items[itemIndex] };
    item = { ...config };
    if (!item.action_config.entity && item.entity) {
      item.action_config.entity = item.entity;
    }

    items[itemIndex] = item;
    groupItem.items = items;
    groupIndicators[groupIndex] = groupItem;

    // Update the single item
    this.config = {
      ...this.config,
      indicators: { ...this.config.indicators, group: groupIndicators },
    };

    fireEvent(this, 'config-changed', { config: this.config });
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
    console.log('Value changed:', configValue, ':', newValue);
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
      } else if (configValue === 'entity' && newValue) {
        const updatedItem = { ...singleItemIndex, entity: newValue };
        singleIndicators[index] = updatedItem;
        indicatorsConfig[configType] = singleIndicators;
        updates.indicators = indicatorsConfig; // update indicators config
        console.log('single entity changed:', configValue, ':', newValue);
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
    } else if (configType === 'group_item_action' && this._activeSubPanel !== null) {
      let groupIndicators = [...indicatorsConfig.group];
      let group = { ...groupIndicators[this._activeSubPanel] };
      let items = group.items || [];
      let groupItem = { ...items[configIndex] };

      if (groupItem.action_config[configValue] === newValue) {
        console.log('Value not changed');
        return;
      } else {
        const actionConfig = { ...groupItem.action_config, [configValue]: newValue };
        groupItem.action_config = actionConfig;
        items[configIndex] = groupItem;
        group.items = items;
        groupIndicators[this._activeSubPanel] = group;
        indicatorsConfig.group = groupIndicators;
        updates.indicators = indicatorsConfig;
        console.log('group action changed:', configValue, ':', newValue);
      }
    }

    if (Object.keys(updates).length > 0) {
      this.config = { ...this.config, ...updates };
      fireEvent(this, 'config-changed', { config: this.config });
      // console.log('config changed', updates);
      this._validateAndReindexItems();
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
        if (!this._sortable) {
          this.initSortable();
        }
      });
    }, 200);
  }

  private _computeLabel(schema: any) {
    if (schema.name === 'entity') {
      return '';
    }
    return schema.label || schema.name;
  }
  private _computeHelper(schema: any) {
    return schema.helper || '';
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
