import { html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { computeStateName, fireEvent, getEntitiesByDomain } from '../../../ha';
import '../../../utils/editor/alignment-selector';
import './panel-row-sub-item';
import '../../shared/vsc-editor-form';
import { IndicatorEntityConfig, IndicatorRowConfig, IndicatorRowItem } from '../../../types/config/card/row-indicators';
import { Create, showConfirmDialog } from '../../../utils';
import { ensureRowItemConfig } from '../../../utils/editor/migrate-indicator';
import { createSecondaryCodeLabel } from '../../../utils/editor/sub-editor-header';
import { ICON } from '../../../utils/mdi-icons';
import { BaseEditor } from '../../base-editor';
import { SUB_PANEL } from '../../editor-const';
import { GLOBAL_BOOLEAN_KEYS, ROW_ICON_SIZE_NO_WRAP_SCHEMA, ROW_NO_WRAP_SCHEMA } from '../../form/indicator-row-schema';
import { PanelRowSubItem } from './panel-row-sub-item';

declare global {
  interface HASSDomEvents {
    'row-item-changed': {
      rowConfig: IndicatorRowConfig;
      rowIndex?: number;
      itemIndex?: number;
      type?: 'entity' | 'group' | null;
    };
  }
}
@customElement(SUB_PANEL.ROW_ITEM)
export class PanelIndicatorItem extends BaseEditor {
  @property({ attribute: false }) private _rowConfig!: IndicatorRowConfig;
  @property({ type: Number, attribute: 'row-index', reflect: true }) public rowIndex!: number;
  @property({ type: Number, attribute: 'edit-item-index', reflect: true }) public _editIndex: number | null = null;

  @state() private _items: IndicatorRowItem[] = [];
  @state() private _yamlActive = false;
  @query(SUB_PANEL.ROW_SUB_ITEM) _rowSubItemEditor?: PanelRowSubItem;

  constructor() {
    super();
  }

  get _editingItemType(): 'entity' | 'group' | null {
    if (this._editIndex === null) return null;
    const item = this._items?.[this._editIndex];
    if (!item) return null;
    return item.type === 'group' ? 'group' : 'entity';
  }

  get _hasGlobalConfig(): boolean {
    return [...GLOBAL_BOOLEAN_KEYS].some((key) => (this._rowConfig as any)[key] !== undefined);
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('_rowConfig')) {
      this._items = this._rowConfig?.row_items || [];
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_editIndex')) {
      const oldIndex = _changedProperties.get('_editIndex') as number | null;
      const newIndex = this._editIndex;
      if (oldIndex !== newIndex) {
        // const itemType = this._editingItemType;
        const currentType = this._editingItemType;
        const groupIndex = currentType === 'group' ? newIndex : null;
        const entity_index = currentType === 'entity' ? newIndex : null;
        this._toggleGroupPreview(groupIndex, entity_index);
      }
    }
  }

  protected render(): TemplateResult {
    if (this._editIndex !== null) {
      return this._renderSubItemEditor();
    }
    const indexLabel = `ROW ${this.rowIndex + 1}`;
    const ROW_DATA = { ...(this._rowConfig || {}) };

    const iconSizeNoWrapData = {
      global_icon_size: ROW_DATA?.global_icon_size,
      global_column_reverse: ROW_DATA?.global_column_reverse,
      global_row_reverse: ROW_DATA?.global_row_reverse,
    };

    const noWrapEl = this._createVscForm({ no_wrap: ROW_DATA?.no_wrap }, ROW_NO_WRAP_SCHEMA, 'icon_size_no_wrap');
    const globalAppearance = this._createVscForm(iconSizeNoWrapData, ROW_ICON_SIZE_NO_WRAP_SCHEMA, 'icon_size_no_wrap');

    return html`
      <div class="base-config gap">
        <sub-editor-header
          ._label=${indexLabel}
          .hidePrimaryAction=${this._yamlActive}
          .primaryIcon=${'close'}
          .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
          @primary-action=${this._goBack}
          @secondary-action=${() => {
            this._yamlActive = !this._yamlActive;
          }}
        >
        </sub-editor-header>

        ${!this._yamlActive
          ? html`
              <div class="row-appearance">
                <vsc-alignment-selector
                  label="Alignment (optional)"
                  .value=${this._rowConfig?.alignment}
                  .key=${'alignment'}
                  @value-changed=${this._onValueChanged}
                ></vsc-alignment-selector>
                ${noWrapEl}
              </div>
              ${globalAppearance} ${this._renderRowItems()} ${this._renderFooterActions()}
            `
          : html` <panel-yaml-editor
              .hass=${this._hass}
              .configDefault=${this._rowConfig}
              @yaml-config-changed=${this._handleYamlConfigChanged}
            ></panel-yaml-editor>`}
      </div>
    `;
  }

  private _renderRowItems(): TemplateResult {
    const items = this._items;
    if (!items || items.length === 0) return html``;
    const actions = [
      { path: ICON.PENCIL, callback: (index: number) => this._handleItemAction('edit', index) },
      { path: ICON.EYE, callback: (index: number) => this._handleItemAction('peek', index) },
      { path: ICON.DELETE, callback: (index: number) => this._handleItemAction('delete', index) },
    ];
    return html`
      <ha-sortable handle-selector=".handle" @item-moved=${this._handleItemMoved}>
        <div class="range-info-list">
          ${repeat(items, (item: IndicatorRowItem, index: number) => {
            const iconPrefix = item.type === 'entity' ? 'e' : 'g';
            const icon = `mdi:alpha-${iconPrefix}-circle`;
            return html`
              <div class="item-config-row" data-index="${index}">
                <div class="handle">
                  <ha-icon-button .path=${ICON.DRAG}></ha-icon-button>
                </div>
                <ha-icon icon=${icon}></ha-icon>
                <div
                  class="item-content"
                  @click=${() => {
                    this._editIndex = index;
                  }}
                >
                  <div class="primary">${item.type}</div>
                  <div class="secondary">${this._renderItemSecondary(item)}</div>
                </div>
                <div class="item-actions">
                  ${actions.map(
                    (action) =>
                      html` <ha-icon-button
                        .path=${action.path}
                        @click=${() => action.callback(index)}
                      ></ha-icon-button>`
                  )}
                </div>
              </div>
            `;
          })}
        </div>
      </ha-sortable>
    `;
  }

  private _renderItemSecondary(item: IndicatorRowItem): string | undefined {
    if ('entity' in item && item.entity) {
      return `${this._getEntityName(item.entity) || item.name || item.entity}`;
    }
    if (item.type === 'group') {
      return item.name || 'Unnamed Group';
    }
    return item.name || '';
  }

  private _getEntityName(entityId: string): string | undefined {
    if (!this._hass) return undefined;
    const entityObj = this._hass.states[entityId];
    if (!entityObj) return undefined;
    return computeStateName(entityObj);
  }
  private _renderFooterActions(): TemplateResult {
    const actions = [
      {
        label: 'Add Item',
        option: { type: 'add' },
        onClick: () => void 0,
      },
      {
        label: 'Entity',
        onClick: () => this._addItem('entity'),
        option: { type: 'add' },
      },
      {
        label: 'Group',
        onClick: () => this._addItem('group'),
        option: { type: 'add' },
      },
    ];

    return html`
      <div class="action-footer">
        <ha-dropdown
          placement="bottom"
          @wa-hide=${(ev: Event) => ev.stopPropagation()}
          @wa-show=${(ev: Event) => ev.stopPropagation()}
        >
          <span slot="trigger"> ${Create.HaButton(actions[0])} </span>
          ${actions.slice(1).map((action) => {
            return html`
              <ha-dropdown-item @click=${action.onClick} .value=${action.label}> ${action.label} </ha-dropdown-item>
            `;
          })}
        </ha-dropdown>
      </div>
    `;
  }

  private _renderSubItemEditor(): TemplateResult {
    const item = this._items[this._editIndex!];
    return html`
      <panel-row-sub-item
        ._subItemConfig=${item}
        ._hass=${this._hass}
        ._store=${this._store}
        .rowIndex=${this.rowIndex}
        .itemIndex=${this._editIndex!}
        @sub-item-closed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          this._editIndex = null;
        }}
        @row-sub-item-changed=${this._rowSubItemChanged}
      ></panel-row-sub-item>
    `;
  }

  public _addItem(type: 'entity' | 'group'): void {
    const entity = getEntitiesByDomain(this._hass.states, 1, ['sensor'])[0];

    const newItemSingle: IndicatorEntityConfig = ensureRowItemConfig(entity) as IndicatorEntityConfig;

    const updated = (items: IndicatorRowItem[]) => {
      this._rowConfig = {
        ...this._rowConfig,
        row_items: items,
      };
      this._rowConfigChanged(this._rowConfig);
    };

    switch (type) {
      case 'entity':
        const newItems = this._items?.concat([newItemSingle]);
        updated(newItems);
        this.updateComplete.then(() => {
          this._editIndex = newItems.length - 1;
        });
        break;
      case 'group':
        const groupConfig: IndicatorRowItem = {
          type: 'group',
          name: 'New Group',
          icon: 'mdi:format-list-bulleted',
          items: [
            {
              entity: entity,
            },
          ],
        } as IndicatorRowItem;
        const groupItems = this._items?.concat([groupConfig]);
        updated(groupItems);
        this.updateComplete.then(() => {
          this._editIndex = groupItems.length - 1;
        });
        break;
      default:
        return;
    }
  }

  public async _handleItemAction(action: 'edit' | 'peek' | 'delete', index: number): Promise<void> {
    switch (action) {
      case 'edit':
        this._editIndex = index;
        break;
      case 'peek':
        const previewConfig = {
          rowIndex: this.rowIndex,
          itemIndex: index,
          peek: true,
        };
        this._dispatchEditorEvent('toggle-highlight-row-item', previewConfig);
        break;
      case 'delete':
        if (index === null) return;
        let confirm = await showConfirmDialog(this, 'Are you sure you want to delete this item?', 'Delete');
        if (!confirm) return;
        const newItems = this._items?.concat() || [];
        newItems.splice(index, 1);
        this._rowConfig = {
          ...this._rowConfig,
          row_items: newItems,
        };
        this._rowConfigChanged(this._rowConfig);
        break;
      default:
        return;
    }
  }
  private _handleYamlConfigChanged(event: CustomEvent): void {
    event.stopPropagation();
    const { isValid, value } = event.detail;
    if (!isValid) {
      return;
    }
    const config = value as IndicatorRowConfig;
    this._rowConfigChanged(config);
  }

  private _handleItemMoved(event: CustomEvent): void {
    event.stopPropagation();
    const { oldIndex, newIndex } = event.detail;
    const newItems = this._items?.concat() || [];
    newItems.splice(newIndex, 0, newItems.splice(oldIndex, 1)[0]);
    this._rowConfig = {
      ...this._rowConfig,
      row_items: newItems,
    };
    this._rowConfigChanged(this._rowConfig);
  }

  private _goBack(): void {
    fireEvent(this, 'go-back');
  }

  protected _onValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { key } = ev.target as any;
    const value = ev.detail?.value;
    // console.debug('Value changed', key, subKey, value);
    const config = { ...(this._rowConfig || {}) } as IndicatorRowConfig;
    if (!config) return;
    if (key === 'alignment') {
      // If the alignment is not set, and the config has no alignment, we should not do anything
      if (!value && !config.alignment) {
        return;
      }
      // If the alignment is not set, and the config has an alignment, we should remove it
      if (!value && config.alignment) {
        delete config.alignment;
      } else {
        config.alignment = value;
      }
      this._rowConfigChanged(config);
      return;
    }
    if (key === 'icon_size_no_wrap') {
      const keys = Object.keys(value || {});
      keys.forEach((k) => {
        const v = (value as any)[k];
        if (v === undefined || v === null || v === false) {
          delete (config as any)[k];
        } else {
          (config as any)[k] = v;
        }
      });
      this._rowConfigChanged(config);
      return;
    }
  }

  private _rowSubItemChanged(event: CustomEvent): void {
    event.stopPropagation();
    if (this._editIndex === null) return;
    const config = event.detail.itemConfig as IndicatorRowItem;
    if (!config) return;

    const currentConfig = { ...(this._rowConfig || {}) };
    const items = this._items?.concat() || [];
    items[this._editIndex!] = config;
    currentConfig.row_items = items;
    this._rowConfigChanged(currentConfig);
  }

  private _toggleGroupPreview(groupIndex: number | null, entity_index: number | null): void {
    const previewConfig = {
      rowIndex: this.rowIndex,
      groupIndex,
      entity_index,
      peek: false,
    };
    this._showSelectedRow(previewConfig.rowIndex, previewConfig.groupIndex, previewConfig.entity_index);
  }

  private _rowConfigChanged(config: IndicatorRowConfig): void {
    const detail = {
      rowConfig: config,
      rowIndex: this.rowIndex,
      itemIndex: this._editIndex !== null ? this._editIndex : undefined,
      type: this._editingItemType,
    };
    this._rowConfig = config;
    // Notify the parent about the change
    fireEvent(this, 'row-item-changed', { ...detail });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .row-appearance {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-direction: row;
          margin-bottom: 8px;
        }

        .action-footer {
          margin-top: 0;
          justify-content: flex-start;
          display: flex;
          /* min-height: 42px; */
          align-items: center;
        }

        /* .action-footer * {
          flex: 1;
          height: 100%;
        } */

        .range-info-list {
          border-top: none;
          padding-inline-start: 4px;
          display: flex;
          flex-direction: column;
        }
        .item-content:hover {
          cursor: pointer;
          color: var(--primary-color);
        }
        .item-config-row {
          border-bottom: 1px solid var(--divider-color);
        }
        .range-info-list > .item-config-row:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }
        .item-config-row > ha-icon {
          color: var(--secondary-text-color);
          margin-right: var(--vic-card-padding);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-row-item': PanelIndicatorItem;
  }
}
