import { LitElement, html, TemplateResult, CSSResultGroup, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import editorcss from '../../../css/editor.css';
import { fireEvent, HomeAssistant } from '../../../ha';
import '../../shared/panel-yaml-editor';
import { IndicatorItemConfig } from '../../../types/config';
import { ICON } from '../../../utils';
import { VehicleStatusCardEditor } from '../../editor';
import { singleIndicatorSchema, singleApparenceSchema, singleActionSchema } from '../../form';

@customElement('panel-indicator-single')
export class PanelIndicatorSingle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public editor!: VehicleStatusCardEditor;
  @property({ attribute: false }) private singleConfig?: IndicatorItemConfig[];

  @state() private _yamlEditorVisible: boolean = false;
  @state() private _yamlSubEditorVisible: boolean = false;
  @state() private _selectedItem: number | null = null;

  static get styles(): CSSResultGroup {
    return [
      css`
        .action-footer {
          justify-content: flex-end !important;
        }
        *[hidden] {
          display: none !important;
        }
        .add-entity {
          display: block;
          margin-left: 36px;
          margin-inline-start: 36px;
          margin-inline-end: 48px;
          direction: var(--direction);
          margin-bottom: var(--vic-card-padding);
        }
      `,
      editorcss,
    ];
  }

  private _renderSingleList(): TemplateResult {
    if (this._yamlEditorVisible) {
      return this._renderYamlEditor();
    }

    const singleItems = this.singleConfig;
    const actionMap = [
      { title: 'Edit', icon: 'mdi:pencil', action: (index: number) => this._handleAction('edit', index) },
      {
        title: 'Remove',
        icon: 'mdi:delete',
        action: (index: number) => this._handleAction('remove', index),
        color: 'var(--error-color)',
      },
    ];

    return !this.singleConfig
      ? html`<div class="empty-list">No indicators configured</div>`
      : html`
          <ha-sortable handle-selector=".handle" @item-moved=${this._itemMoved}>
            <div class="indicator-list">
              ${repeat(
                singleItems || [],
                (item: IndicatorItemConfig, index: number) => html`
                  <div class="item-config-row" data-index=${index}>
                    <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
                    <div class="item-content">
                      <ha-entity-picker
                        .hass=${this.hass}
                        .value=${item.entity}
                        .index=${index}
                        .hideClearIcon=${true}
                        @value-changed=${this._itemChanged}
                      ></ha-entity-picker>
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
          </ha-sortable>
          <div class="add-entity">
            <ha-entity-picker
              .hass=${this.hass}
              .allowCustomEntity=${true}
              @value-changed=${this._addEntity}
            ></ha-entity-picker>
          </div>
          <div class="action-footer">
            <ha-button
              size="small"
              variant="neutral"
              appearance="filled"
              @click=${() => (this._yamlEditorVisible = !this._yamlEditorVisible)}
              >${this._yamlEditorVisible ? 'Close YAML' : 'Edit YAML'}
            </ha-button>
          </div>
        `;
  }

  private _renderYamlEditor(): TemplateResult {
    if (!this._yamlEditorVisible) {
      return html``;
    }
    const config = this.singleConfig || [];
    return html`
      <div class="sub-header">
        <div class="icon-title" @click=${() => (this._yamlEditorVisible = false)}>
          <ha-icon icon="mdi:close"></ha-icon>
          <span>Close editor</span>
        </div>
        <div>YAML editor</div>
      </div>
      <div class="sub-panel-config">
        <panel-yaml-editor
          .hass=${this.hass}
          .config=${this.editor._config}
          .cardEditor=${this.editor}
          .configDefault=${config || []}
          @yaml-config-changed=${this._yamlConfigChanged}
        ></panel-yaml-editor>
      </div>
    `;
  }

  private _renderSubItem(): TemplateResult {
    if (this._selectedItem === null || this.singleConfig === undefined) {
      return html``;
    }
    const index = this._selectedItem;
    const item = this.singleConfig[index];
    const itemSchema = (entity: string) => [
      ...singleIndicatorSchema(entity),
      ...singleApparenceSchema,
      ...singleActionSchema(),
    ];

    return html`
      <div class="sub-panel">
        <div class="header-row">
          <div class="icon-title">
            <ha-icon-button .path=${ICON.CLOSE} @click=${() => (this._selectedItem = null)}></ha-icon-button>
          </div>
          <div class="header-title">Item config</div>
          <ha-icon-button
            class="header-yaml-icon"
            @click=${() => (this._yamlSubEditorVisible = !this._yamlSubEditorVisible)}
            .path=${ICON.CODE_JSON}
          ></ha-icon-button>
        </div>
        ${!this._yamlSubEditorVisible
          ? html`
              <ha-form
                .hass=${this.hass}
                .schema=${itemSchema(item.entity)}
                .data=${item}
                .index=${index}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                @value-changed=${this._singleItemChanged}
              ></ha-form>
            `
          : html`
              <panel-yaml-editor
                .hass=${this.hass}
                .config=${this.editor._config}
                .cardEditor=${this.editor}
                .configDefault=${item}
                .configKey=${'single'}
                @yaml-config-changed=${this._yamlConfigChanged}
              ></panel-yaml-editor>
            `}
      </div>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <div class="base-config">${this._selectedItem === null ? this._renderSingleList() : this._renderSubItem()}</div>
    `;
  }

  private _addEntity(ev: CustomEvent): void {
    ev.stopPropagation();
    const entity = ev.detail.value;
    if (!entity) return;

    const newItem: IndicatorItemConfig = {
      entity,
      action_config: {
        tap_action: {
          action: 'more-info',
        },
      },
    };

    const newConfig = this.singleConfig?.concat(newItem) || [newItem];
    (ev.target as any).value = '';
    this._configChanged(newConfig);
  }

  private _itemChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    const value = ev.detail.value;
    if (index === undefined) return;
    const newConfig = [...(this.singleConfig || [])];
    if (!value || value === '') {
      newConfig.splice(index, 1);
      this._configChanged(newConfig);
      return;
    } else {
      let item = { ...newConfig[index] };
      item.entity = value;
      newConfig[index] = item;
      this._configChanged(newConfig);
    }
  }

  private _singleItemChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    let value = ev.detail.value;
    if (index === undefined || value === undefined) return;
    console.log('Single item changed', index, value);

    const actions = value.action_config || {};
    for (const key of Object.keys(actions)) {
      if (actions[key]?.action === 'none') {
        delete actions[key];
      }
      if (key === 'entity') {
        delete actions[key];
      }
    }
    value.action_config = actions;

    const newConfig = [...(this.singleConfig || [])];
    let item = { ...newConfig[index] };
    item = { ...item, ...value };
    newConfig[index] = item;
    console.log('New config after change', newConfig[index]);
    this._configChanged(newConfig);
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newConfig = [...(this.singleConfig || [])];
    newConfig.splice(newIndex, 0, newConfig.splice(oldIndex, 1)[0]);
    this._configChanged(newConfig);
  }

  private _handleAction(action: 'remove' | 'edit', index: number): void {
    switch (action) {
      case 'edit':
        this._selectedItem = this._selectedItem === index ? null : index;
        this._yamlSubEditorVisible = false;
        this.requestUpdate();
        break;
      case 'remove':
        const newConfig = [...(this.singleConfig || [])];
        newConfig.splice(index, 1);
        this._configChanged(newConfig);
        break;
    }
  }

  private _yamlConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { key, isValid } = ev.detail;
    if (!isValid) {
      return;
    }
    let value = ev.detail.value;
    console.log('YAML config changed', key, value);
    if (value === undefined || value === null || value === '' || !Array.isArray(value)) {
      value = [];
    }

    if (key === 'single') {
      const itemIndex = this._selectedItem!;
      const newConfig = [...(this.singleConfig || [])];
      let item = { ...newConfig[itemIndex] };
      item = { ...value };
      newConfig[itemIndex] = item;
      this._configChanged(newConfig);
    } else {
      this._configChanged(value);
    }
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

  private _configChanged(newConfig: IndicatorItemConfig[]): void {
    console.log('Config changed for single', newConfig);
    if (newConfig === undefined || newConfig === null) {
      newConfig = [];
    }
    this.editor._config = {
      ...this.editor._config,
      indicators: {
        ...this.editor._config.indicators,
        single: newConfig,
      },
    };

    fireEvent(this, 'config-changed', { config: this.editor._config });
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'panel-indicator-single': PanelIndicatorSingle;
  }
}
