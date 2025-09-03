import { capitalize } from 'es-toolkit';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import './panel-row-item';
import '../shared/badge-editor-item';
import '../../utils/editor/sub-editor-header';
import { computeStateName, fireEvent } from '../../ha';
import { IndicatorRowConfig, IndicatorRowItem, toCommon, VehicleStatusCardConfig } from '../../types/config';
import { Create, showConfirmDialog } from '../../utils';
import { ActionType } from '../../utils/editor/create-actions-menu';
import { computeNewRow } from '../../utils/editor/migrate-indicator';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { ICON } from '../../utils/mdi-icons';
import { BaseEditor } from '../base-editor';
import { PANEL } from '../editor-const';
import { PanelIndicatorItem } from './panel-row-item';

type RowAction = 'edit' | 'delete' | 'add' | 'peek';
@customElement(PANEL.INDICATOR_ROWS)
export class PanelIndicatorRows extends BaseEditor {
  @property({ attribute: false }) _config!: VehicleStatusCardConfig;

  @state() private _rows: IndicatorRowConfig[] = [];
  @state() private _selectedRowIndex: number | null = null;
  @state() private _yamlActive = false;

  @query(PANEL.INDICATOR_ITEM) _rowEditor?: PanelIndicatorItem;

  constructor() {
    super();
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has('_config') && this._config.indicator_rows) {
      this._rows = this._config.indicator_rows;
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('_selectedRowIndex') && _changedProperties.get('_selectedRowIndex') !== undefined) {
      const oldIndex = _changedProperties.get('_selectedRowIndex') as number | null;
      const newIndex = this._selectedRowIndex;
      if (oldIndex !== newIndex) {
        this._setPreviewConfig('row_group_preview', { row_index: this._selectedRowIndex, group_index: null });
        if (newIndex !== null) {
          setTimeout(() => {
            this._dispatchEditorEvent('toggle-indicator-row', { rowIndex: newIndex, peek: true });
          }, 500);
        }
      }
    }
  }

  protected render(): TemplateResult {
    if (this._selectedRowIndex !== null) {
      return this._renderRowEditor();
    }

    return html`
      <sub-editor-header
        hide-primary
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
        @secondary-action=${() => {
          this._yamlActive = !this._yamlActive;
        }}
      >
        <span slot="primary-action">
          ${Create.HaButton({
            label: 'Add Row',
            onClick: () => this._handleRowAction('add'),
            option: { type: 'add', disabled: this._yamlActive },
          })}
        </span>
      </sub-editor-header>
      ${!this._yamlActive ? this._renderRowList() : this._renderYamlEditor()}
    `;
  }

  private _renderRowList(): TemplateResult {
    const rows = this._rows;

    const actions = [
      { label: 'Edit Row', path: ICON.PENCIL, callback: 'edit' },
      { label: 'Show Row', path: ICON.EYE, callback: 'peek' },
      { label: 'Delete Row', path: ICON.DELETE, callback: 'delete' },
    ];

    return !rows.length
      ? html`<span>No indicator rows configured.</span>`
      : html`
          <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved}>
            <div class="card-config">
              ${repeat(rows, (row, index) => {
                const expansionOps = {
                  icon: `mdi:numeric-${index + 1}-circle`,
                  header: `ROW #${index + 1}`,
                  secondary: `${row.row_items.length} items`,
                  leftChevron: true,
                };
                const slotIcons = html` <div class="item-actions" slot="icons">
                  ${actions.map(
                    (action) => html`
                      <ha-svg-icon
                        .label=${action.label}
                        .path=${action.path}
                        @click=${(ev: Event) => {
                          ev.stopPropagation();
                          this._handleRowAction(action.callback as RowAction, index);
                        }}
                      ></ha-svg-icon>
                    `
                  )}
                  <ha-svg-icon class="handle" .path=${ICON.DRAG}></ha-svg-icon>
                </div>`;
                const content = this._renderRowListItem(row.row_items, index);
                return Create.ExpansionPanel({
                  content,
                  slotIcons,
                  options: expansionOps,
                });
              })}
            </div>
          </ha-sortable>
        `;
  }

  private _renderRowListItem(items: IndicatorRowItem[], rowIndex: number): TemplateResult {
    return html` <div class="row-items">
      ${repeat(items, (item, index) => {
        const { name, icon, entity } = toCommon(item);
        const iconSlot = icon ?? `mdi:numeric-${index + 1}-circle`;
        let content: string | undefined = name;
        if (!content && entity) {
          const stateObj = this._hass.states[entity];
          content = computeStateName(stateObj);
        }
        const label = capitalize(item.type);
        return html` <badge-editor-item
          .rowIndex=${rowIndex}
          .itemIndex=${index}
          @badge-action-item=${this._handleSubRowPeekEdit}
        >
          <ha-badge .label=${label} .iconOnly=${!content}>
            <ha-icon slot="icon" .icon=${iconSlot}></ha-icon>
            ${content ? html`<span>${capitalize(content)}</span>` : ''}
          </ha-badge>
        </badge-editor-item>`;
      })}
    </div>`;
  }

  private _renderYamlEditor(): TemplateResult {
    const rows = this._rows;
    return html`
      <panel-yaml-editor
        .hass=${this._hass}
        .configDefault=${rows}
        @close-editor=${() => {
          this._yamlActive = false;
        }}
        has-extra-actions
        @yaml-config-changed=${this._handleConfigChanged}
      ></panel-yaml-editor>
    `;
  }
  private _renderRowEditor(): TemplateResult {
    const row = this._rows[this._selectedRowIndex!];

    return html` <panel-indicator-item
      ._hass=${this._hass}
      ._store=${this._store}
      ._config=${this._config}
      ._rowConfig=${row}
      .rowIndex=${this._selectedRowIndex!}
      @go-back=${() => {
        this._selectedRowIndex = null;
      }}
      @row-item-changed=${this._handleRowChanged}
    ></panel-indicator-item>`;
  }

  private _handleSubRowPeekEdit = async (ev: Event) => {
    ev.stopPropagation();
    const target = ev.currentTarget as any;
    const { rowIndex, itemIndex } = target;
    console.debug('Peek/Edit sub-row item:', rowIndex, itemIndex);
    const { action } = (ev as CustomEvent).detail;
    console.debug('Action:', action);

    switch (action as ActionType) {
      case 'edit-item':
        this._selectedRowIndex = rowIndex;
        this.requestUpdate();
        await this.updateComplete;
        if (this._rowEditor && this._rowEditor.updateComplete) {
          await this._rowEditor.updateComplete;
          this._rowEditor._editIndex = itemIndex;
          this._rowEditor.requestUpdate();
        }
        break;
      case 'show-item':
        const previewConfig = {
          rowIndex,
          itemIndex,
          peek: true,
        };
        this._dispatchEditorEvent('toggle-highlight-row-item', previewConfig);
        break;
      case 'delete-item':
        let confirm = await showConfirmDialog(this, 'Are you sure you want to delete this item?', 'Delete');
        if (!confirm) return;
        let currentRows = [...(this._rows || [])];
        let row = [...currentRows[rowIndex].row_items];
        row.splice(itemIndex, 1);
        currentRows[rowIndex].row_items = row;
        this._configChanged(currentRows);
        break;
      case 'duplicate-item':
        let currentRowsDup = [...(this._rows || [])];
        let rowDup = [...currentRowsDup[rowIndex].row_items];
        const itemToDuplicate = { ...rowDup[itemIndex] };
        rowDup.splice(itemIndex + 1, 0, itemToDuplicate);
        currentRowsDup[rowIndex].row_items = rowDup;
        this._configChanged(currentRowsDup);
        break;
    }
  };

  private _handleSubRowAdd = async (rowIndex: number) => {
    console.debug('Add sub-row item to row:', rowIndex);
    let currentRows = [...(this._rows || [])];
    const row = currentRows[rowIndex];
    if (!row) {
      console.error('Row not found at index:', rowIndex);
      return;
    }
    // For simplicity, we add a new entity item. In a real scenario, you might want to show a selection dialog.
    const newItem: IndicatorRowItem = computeNewRow(this._hass).row_items[0];
    console.debug('New item to add:', newItem);
    row.row_items.push(newItem);
    currentRows[rowIndex] = row;
    console.debug('Updated rows after adding item:', currentRows);
    this._configChanged(currentRows);
  };

  private _handleConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    if (!isValid) {
      return;
    }
    const newRows = value as IndicatorRowConfig[];
    this._configChanged(newRows);
  }

  private _entityMoved(event: CustomEvent): void {
    event.stopPropagation();
    const { oldIndex, newIndex } = event.detail;
    const newRows = this._rows.concat();
    newRows.splice(newIndex, 0, newRows.splice(oldIndex, 1)[0]);
    this._configChanged(newRows);
  }

  private _handleRowChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const index = this._selectedRowIndex!;
    const rowConfig = ev.detail.rowConfig as IndicatorRowConfig;
    const newRows = [...(this._rows || [])];
    newRows[index] = rowConfig;
    this._configChanged(newRows);
  }

  private _handleRowAction(action: RowAction, index?: number): void {
    let currentRows = [...(this._rows || [])];
    const handleAction = async () => {
      switch (action) {
        case 'edit':
          this._selectedRowIndex = Number(index);
          this.requestUpdate();
          break;
        case 'peek':
          this._dispatchEditorEvent('toggle-indicator-row', { rowIndex: Number(index), peek: true });
          setTimeout(() => {
            this._dispatchEditorEvent('toggle-indicator-row', { rowIndex: null, peek: false });
          }, 3000);
          break;
        case 'delete':
          let confirm = await showConfirmDialog(this, 'Are you sure you want to delete this row?', 'Delete');
          if (!confirm) return;
          currentRows.splice(Number(index), 1);
          this._configChanged(currentRows);
          break;
        case 'add':
          const newRowItem = computeNewRow(this._hass);
          currentRows.push(newRowItem);
          this._configChanged(currentRows);
          this.updateComplete.then(() => {
            this._selectedRowIndex = currentRows.length - 1;
          });
          break;
        default:
          return;
      }
    };
    handleAction();
  }

  private _configChanged(rows: IndicatorRowConfig[]): void {
    this._config = { ...this._config, indicator_rows: rows };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .card-config {
          display: flex;
          flex-direction: column;
          gap: var(--vic-card-padding);
        }
        .range-info-list {
          border-top: none;
          padding-bottom: 0;
          padding-top: 0;
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
        }
        .item-config-row > ha-icon {
          color: var(--secondary-text-color);
          margin-right: var(--vic-card-padding);
        }
        .item-actions {
          gap: 1em;
          display: flex;
          align-items: center;
        }
        .item-actions > .handle {
          margin-inline-start: 12px;
        }
        .row-items {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          width: -webkit-fill-available;
          flex-direction: row;
          height: auto;
          box-sizing: border-box;
          align-items: center;
        }

        .row-items ha-badge {
          --badge-color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-indicator-rows': PanelIndicatorRows;
  }
}
