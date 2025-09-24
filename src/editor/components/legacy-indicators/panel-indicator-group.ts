import { LitElement, html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import editorcss from '../../../css/editor.css';
import { fireEvent, HomeAssistant } from '../../../ha';
import { IndicatorGroupConfig, IndicatorItemConfig } from '../../../types/config/card/indicators';
import { ICON } from '../../../utils';
import { showPromptDialog } from '../../../utils/editor/show-dialog-box';
import { VehicleStatusCardEditor } from '../../editor';
import { PANEL } from '../../editor-const';
import { mainGroupSchema, groupApparenceSchema, subGroupItemSchema } from '../../form';

@customElement(PANEL.INDICATOR_GROUP)
export class PanelIndicatorGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public editor!: VehicleStatusCardEditor;
  @property({ attribute: false }) private groupConfig?: IndicatorGroupConfig[];

  @state() private _yamlMode?: boolean = false;
  @state() private _selectedGroup: number | null = null;
  @state() private _selectedItem: number = 0;
  @state() private groupItems: IndicatorGroupConfig['items'] = [];

  private get _groupPreview(): boolean {
    return this.editor._config.hasOwnProperty('active_group');
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_selectedGroup')) {
      const oldValue = _changedProperties.get('_selectedGroup') as number | null;
      const newValue = this._selectedGroup;
      if (oldValue !== undefined && oldValue !== newValue) {
        console.log('Active sub-panel changed from', oldValue, 'to', newValue);
        if (newValue === null && this._groupPreview) {
          // delte active group when sub-panel is closed
          delete this.editor._config.active_group;
        } else {
          // set active group when sub-panel is opened
          this.editor._config.active_group = newValue;
        }
        fireEvent(this, 'config-changed', { config: this.editor._config });
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="base-config">${this._selectedGroup === null ? this._renderGroupList() : this._renderSubGroup()}</div>
    `;
  }

  private _renderGroupList(): TemplateResult {
    if (this._yamlMode) {
      return this._renderYamlEditor();
    }
    const groups = this.groupConfig || [];
    const actionMap = [
      { title: 'Edit', icon: 'mdi:pencil', action: (index: number) => this._handleAction('edit-group', index) },
      {
        title: 'Remove',
        icon: 'mdi:delete',
        action: (index: number) => this._handleAction('remove-group', index),
        color: 'var(--error-color)',
      },
    ];

    return html`${!groups.length
        ? html`<div class="empty-list">No groups added</div>`
        : html` <ha-sortable handle-selector=".handle" @item-moved=${this._groupMoved}>
            <div class="indicator-list">
              ${repeat(
                groups,
                (group: IndicatorGroupConfig) => group.name,
                (group: IndicatorGroupConfig, index: number) => html`
                  <div class="item-config-row" data-index=${index}>
                    <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
                    <div class="item-content">
                      <div class="secondary">Group #${index + 1}</div>
                      <div class="primary">${group.name}</div>
                    </div>
                    <ha-button-menu
                      .corner=${'BOTTOM_START'}
                      .fixed=${true}
                      .menuCorner=${'START'}
                      .activatable=${true}
                      .naturalMenuWidth=${true}
                      @closed=${(ev: Event) => ev.stopPropagation()}
                    >
                      <ha-icon-button slot="trigger" .path=${ICON.DOTS_VERTICAL}></ha-icon-button>
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
            </div>
          </ha-sortable>`}
      <div class="action-footer">
        <ha-button size="small" appearance="filled" @click=${this._togglePromptNewGroup}>
          <ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon>
          Add new group</ha-button
        >
        <ha-button size="small" variant="neutral" appearance="filled" @click=${() => (this._yamlMode = !this._yamlMode)}
          >${this._yamlMode ? 'Close YAML' : 'Edit YAML'}
        </ha-button>
      </div>`;
  }

  private _renderSubGroup(): TemplateResult {
    if (this._yamlMode) {
      return this._renderYamlEditor();
    }

    const groupIndex = this._selectedGroup!;
    const group = this.groupConfig![groupIndex] as IndicatorGroupConfig;
    const DATA = { ...group };
    const _groupSchema = () => [...mainGroupSchema, ...groupApparenceSchema];

    const groupForm = html`
      <ha-form
        .hass=${this.hass}
        .data=${DATA}
        .schema=${_groupSchema()}
        .index=${groupIndex}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._subGroupChanged}
      ></ha-form>
    `;

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
          @click=${() => this._addNewGroupItem()}
          .narrow=${true}
        >
          <ha-svg-icon .path=${ICON.PLUS} slot="icon"></ha-svg-icon>
        </vic-tab>
      </div>
    `;

    const header = html` <div class="header-row">
      <div class="icon-title">
        <ha-icon-button
          .path=${ICON.CLOSE}
          @click=${() => ((this._selectedGroup = null), (this._selectedItem = 0))}
        ></ha-icon-button>
      </div>
      <div class="header-title">Group: ${group.name}</div>
      <ha-icon-button
        class="header-yaml-icon"
        @click=${() => (this._yamlMode = !this._yamlMode)}
        .path=${ICON.CODE_JSON}
      ></ha-icon-button>
    </div>`;

    const previewClass = this._groupPreview ? 'preview-btn active' : 'preview-btn';
    return html`
      <div class="sub-panel">
        ${header} ${groupForm}
        <ha-button
          slot="action"
          size="small"
          appearance="filled"
          @click=${() => this._tooglePreview()}
          class=${previewClass}
          >${this._groupPreview ? 'Close preview' : 'Show items preview'}</ha-button
        >
        <div class="sub-panel-config group">${toolBar} ${this._renderSubGroupItemConfig(selectedItem)}</div>
      </div>
    `;
  }

  private _renderSubGroupItemConfig(index: number): TemplateResult | void {
    if (this._selectedItem !== index || !this.groupItems || this.groupItems.length === 0) {
      return;
    }
    const item = this.groupItems![index];
    const DATA = { ...item };
    const _subGroupSchema = (entity: string) => [...subGroupItemSchema(entity)];

    return html`
      <div ?hidden=${this._selectedItem !== index || !this.groupItems?.length}>
        <ha-form
          .hass=${this.hass}
          .data=${DATA}
          .schema=${_subGroupSchema(DATA.entity || '')}
          .itemIndex=${index}
          .computeLabel=${this._computeLabel}
          .computeHelper=${this._computeHelper}
          @value-changed=${this._groupItemValueChanged}
        ></ha-form>
        <div class="action-footer" style="justify-content: flex-end;">
          <ha-button
            slot="action"
            size="small"
            appearance="filled"
            variant="danger"
            @click=${() => {
              this._removeGroupItem(index), (this._selectedItem = index === 0 ? 0 : index - 1);
            }}
            >Remove Item</ha-button
          >
        </div>
      </div>
    `;
  }

  private _renderYamlEditor(): TemplateResult {
    const mainConfig = this.groupConfig || [];
    const subConfig = this.groupConfig![this._selectedGroup!] as IndicatorGroupConfig;

    const yamlConfig = this._selectedGroup === null ? mainConfig : subConfig;
    const configKey = this._selectedGroup === null ? 'main_group' : 'sub_group';
    const header = html`
      <div class="sub-header">
        <div class="icon-title" @click=${() => (this._yamlMode = false)}>
          <ha-icon icon="mdi:close"></ha-icon>
          <span>Close editor</span>
        </div>
        <div>YAML editor</div>
      </div>
    `;
    return html`
      ${header}
      <div class="sub-panel-config">
        <panel-yaml-editor
          .hass=${this.hass}
          .config=${this.editor._config}
          .cardEditor=${this.editor}
          .configDefault=${yamlConfig || []}
          .configKey=${configKey}
          @yaml-config-changed=${this._yamlConfigChanged}
        >
        </panel-yaml-editor>
      </div>
    `;
  }

  private _groupMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newGroups = [...(this.groupConfig || [])];
    newGroups.splice(newIndex, 0, newGroups.splice(oldIndex, 1)[0]);
    this._configChanged(newGroups);
  }

  private _handleAction(action: 'edit-group' | 'remove-group', index: number): void {
    switch (action) {
      case 'edit-group':
        this._selectedGroup = index;
        this._yamlMode = false;
        this.requestUpdate();
        break;
      case 'remove-group':
        const newGroups = [...(this.groupConfig || [])];
        newGroups.splice(index, 1);
        this._configChanged(newGroups);
        break;
    }
  }

  private _togglePromptNewGroup = async () => {
    let newGroupName = await showPromptDialog(this, 'Enter new group name', 'Group name');
    if (!newGroupName || newGroupName === '') {
      return;
    }

    const newGroup: IndicatorGroupConfig = {
      name: newGroupName,
      icon: 'mdi:car',
      visibility: '',
      items: [],
    };
    const newGroups = this.groupConfig?.concat([newGroup]) || [newGroup];
    this._configChanged(newGroups);
  };

  private _yamlConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { key, isValid } = ev.detail;
    if (!isValid) {
      return;
    }
    let value = ev.detail.value;
    console.log('YAML config changed', key, value);

    if (key === 'main_group') {
      if (value === undefined || value === null || value === '' || !Array.isArray(value)) {
        value = [];
      }
      this.groupConfig = value as IndicatorGroupConfig[];
      this._configChanged(this.groupConfig);
    } else if (key === 'sub_group' && this._selectedGroup !== null) {
      console.log('Sub group config changed', this._selectedGroup, value);
      const newGroups = [...(this.groupConfig || [])];
      if (value === undefined || value === null || typeof value !== 'object' || Object.keys(value).length === 0) {
        this._handleAction('remove-group', this._selectedGroup!);
        this._yamlMode = false; // Close YAML mode if group is removed
        this._selectedGroup = null; // Reset selected group if value is empty
        this.requestUpdate();
        return;
      } else {
        newGroups[this._selectedGroup] = value as IndicatorGroupConfig;
        this._configChanged(newGroups);
      }
    }
  }

  private _removeGroupItem(index: number): void {
    const groupIndex = this._selectedGroup!;
    const newGroupItems = [...(this.groupConfig![groupIndex].items || [])];
    newGroupItems.splice(index, 1);
    const newGroupConfig = {
      ...this.groupConfig![groupIndex],
      items: newGroupItems,
    } as IndicatorGroupConfig;
    const newGroups = [...(this.groupConfig || [])];
    newGroups[groupIndex] = newGroupConfig;
    this._configChanged(newGroups);
  }

  private _addNewGroupItem(): void {
    const groupIndex = this._selectedGroup!;
    const newItem: IndicatorItemConfig = {
      entity: '',
    };
    const newGroupItems = [...(this.groupConfig![groupIndex].items || []), newItem];
    const newGroupConfig = {
      ...this.groupConfig![groupIndex],
      items: newGroupItems,
    } as IndicatorGroupConfig;
    const newGroups = [...(this.groupConfig || [])];
    newGroups[groupIndex] = newGroupConfig;
    this._configChanged(newGroups);
    this._selectedItem = newGroupItems.length - 1; // Select the newly added item
  }

  private _groupItemValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const index = (ev.target as any).itemIndex;
    let value = ev.detail.value as IndicatorItemConfig;
    if (index === undefined || value === undefined) return;
    console.log('Group item changed', index, value);
    const actionConfig = value.action_config;
    if (actionConfig && Object.keys(actionConfig).length !== 0) {
      for (const key of Object.keys(actionConfig)) {
        if (actionConfig[key]?.action === undefined || actionConfig[key]?.action === 'none') {
          delete actionConfig[key];
        }
        if (actionConfig.entity !== undefined) {
          delete actionConfig.entity;
        }
      }
    }
    if (Object.keys(actionConfig || {}).length === 0) {
      delete value.action_config;
    }

    const groupIndex = this._selectedGroup!;
    const newGroups = [...(this.groupConfig || [])];
    const groupConfig = { ...newGroups[groupIndex] } as IndicatorGroupConfig;
    const newItems = [...(groupConfig.items || [])];
    let item = { ...newItems[index] };
    item = { ...value };
    newItems[index] = item;
    groupConfig.items = newItems;
    newGroups[groupIndex] = groupConfig;
    this._configChanged(newGroups);
    console.log('New group config after item change', newGroups[groupIndex]);
  }

  private _subGroupChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const groupIndex = (ev.target as any).index;
    const groupConfig = ev.detail.value as IndicatorGroupConfig;
    const newGroups = [...(this.groupConfig || [])];
    newGroups[groupIndex] = groupConfig;
    this._configChanged(newGroups);
  }

  private _configChanged(newConfig: IndicatorGroupConfig[]): void {
    console.log('Config changed for group', newConfig);
    if (newConfig === undefined || newConfig === null) {
      newConfig = [];
    }
    this.editor._config = {
      ...this.editor._config,
      indicators: {
        ...this.editor._config.indicators,
        group: newConfig,
      },
    };

    fireEvent(this, 'config-changed', {
      config: this.editor._config,
    });
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

  _tooglePreview(): void {
    if (this._groupPreview) {
      delete this.editor._config.active_group;
    } else {
      this.editor._config.active_group = this._selectedGroup;
    }
    fireEvent(this, 'config-changed', { config: this.editor._config });
    this.requestUpdate();
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        *[hidden] {
          display: none !important;
        }
        ha-expansion-panel:not(:last-child) {
          margin-bottom: var(--vic-gutter-gap);
        }

        ha-button.preview-btn {
          width: 100%;
          margin-block: var(--vic-gutter-gap);
        }
        ha-button.preview-btn.active {
          --mdc-theme-primary: var(--accent-color);
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
      `,
      editorcss,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-indicator-group': PanelIndicatorGroup;
  }
}
