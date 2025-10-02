import { capitalize } from 'es-toolkit';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';
import { customElement, property, query, queryAll, state } from 'lit/decorators.js';

import './indicators/panel-row-item';
import '../shared/badge-editor-item';
import '../../utils/editor/sub-editor-header';
import { repeat } from 'lit/directives/repeat.js';

import { computeStateName } from '../../ha';
import { IndicatorRowConfig, IndicatorRowItem, toCommon } from '../../types/config';
import { ConfigArea } from '../../types/config-area';
import { Create, showConfirmDialog } from '../../utils';
import { ExpansionPanelParams } from '../../utils/editor/create';
import { _renderActionItem, ActionType, ROW_MAIN_ACTIONS } from '../../utils/editor/create-actions-menu';
import { computeNewRow } from '../../utils/editor/migrate-indicator';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { preventDefault, stopAndPrevent, stopPropagation } from '../../utils/helpers-dom';
import { ICON } from '../../utils/mdi-icons';
import { BaseEditor } from '../base-editor';
import { ELEMENT, PANEL, SUB_PANEL } from '../editor-const';
import * as ROW_SUB from './indicators';

type RowAction = 'edit' | 'delete' | 'add' | 'peek';

@customElement(PANEL.INDICATOR_ROWS)
export class PanelIndicatorRows extends BaseEditor {
  @property({ attribute: false }) private _rows!: IndicatorRowConfig[];
  @state() public _selectedRowIndex: number | null = null;
  @state() private _yamlActive = false;

  @query(SUB_PANEL.ROW_ITEM) _rowItemEditor?: ROW_SUB.PanelIndicatorItem;
  @queryAll(ELEMENT.HA_EXPANSION_PANEL) _expansionPanels?: Element[];

  constructor() {
    super(ConfigArea.INDICATORS);
  }

  connectedCallback(): void {
    super.connectedCallback();
  }
  disconnectedCallback(): void {
    this._showSelectedRow(null);
    super.disconnectedCallback();
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_selectedRowIndex') && _changedProperties.get('_selectedRowIndex') !== undefined) {
      const oldIndex = _changedProperties.get('_selectedRowIndex') as number | null;
      const newIndex = this._selectedRowIndex;
      if (oldIndex !== newIndex) {
        console.debug('Selected row index changed:', oldIndex, '->', newIndex);
        if (newIndex === null) {
          this._showSelectedRow(null);
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
        .leftBtn=${!this._yamlActive}
        ._addBtnLabel=${'Add Row'}
        @left-btn=${() => this._handleRowAction('add')}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
        @secondary-action=${() => {
          this._yamlActive = !this._yamlActive;
        }}
      >
      </sub-editor-header>
      ${!this._yamlActive ? this._renderRowList() : this._renderYamlEditor()}
    `;
  }

  private _renderRowList(): TemplateResult {
    const rows = this._rows;

    return !rows.length
      ? html`<span>No indicator rows configured.</span>`
      : html`
          <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved}>
            <div class="card-config" id="rowList">
              ${repeat(rows, (row, index) => {
                const expansionOps = {
                  icon: `mdi:numeric-${index + 1}-circle`,
                  header: `ROW #${index + 1}`,
                  secondary: `${row.row_items?.length || 0} items`,
                  leftChevron: true,
                  elId: `row-${index}`,
                } as ExpansionPanelParams['options'];
                const slotIcons = this._renderRowActions(index);
                const content = this._renderRowListItem(row.row_items, index);
                return Create.ExpansionPanel({
                  content,
                  slotIcons,
                  options: expansionOps,
                  expandedWillChange: this._handlePanelWillChange,
                });
              })}
            </div>
          </ha-sortable>
        `;
  }

  private _handlePanelWillChange = (ev: CustomEvent): void => {
    ev.stopPropagation();
    if (!this._expansionPanels) return;
    const panel = ev.target as any;
    const panelId = panel.id;
    const expanded = ev.detail.expanded;
    // console.debug('Panel will change:', panelId, expanded);
    if (!expanded) {
      // this._showRow(null);
      this._showSelectedRow(null);
      return;
    }
    const rowIndex = panelId?.replace('row-', '');
    // console.debug('Row index expanded:', rowIndex);
    // this._showRow(Number(rowIndex));
    this._showSelectedRow(Number(rowIndex));
    const panels = Array.from(this._expansionPanels).filter((p) => p.id !== panelId) as any[];
    // console.debug('Other panels:', panels);
    panels.forEach((p) => {
      if (p.expanded) {
        p.expanded = false;
      }
    });
  };

  private _renderRowActions(rowIndex: number): TemplateResult {
    let deleteFound = false;
    return html` <div class="item-actions" slot="icons">
      <ha-icon-button
        .label=${'Edit Row'}
        .path=${ICON.CHEVRON_RIGHT}
        .action=${'edit'}
        .index=${rowIndex}
        @click=${this._handleRowAction}
      ></ha-icon-button>
      <div class="separator"></div>
      <ha-button-menu
        corner="BOTTOM_START"
        menu-corner="END"
        .fixed=${true}
        .naturalMenuWidth=${true}
        .activatable=${true}
        @closed=${stopPropagation}
        @opened=${stopAndPrevent}
      >
        <ha-icon-button slot="trigger" .path=${ICON.DOTS_VERTICAL} @click=${preventDefault}> </ha-icon-button>
        ${ROW_MAIN_ACTIONS.map((item) => {
          if (/(delete|remove)/.test(item.action) && !deleteFound) {
            deleteFound = true;
            return html`
              <li divider role="separator"></li>
              ${_renderActionItem({
                item,
                onClick: this._handleRowAction,
                option: { index: rowIndex },
              })}
            `;
          }
          return _renderActionItem({
            item,
            onClick: this._handleRowAction,
            option: { index: rowIndex },
          });
        })}
      </ha-button-menu>
      <div class="separator"></div>
      <ha-svg-icon class="handle" .path=${ICON.DRAG} @click=${preventDefault}></ha-svg-icon>
    </div>`;
  }

  private _renderRowListItem(items: IndicatorRowItem[], rowIndex: number): TemplateResult {
    return html` <div class="row-items">
      ${repeat(items, (item, index) => {
        const { name, icon, entity } = toCommon(item);
        const iconSlot = icon ?? `mdi:numeric-${index + 1}-circle`;
        const itemType = item.type || 'entity';
        let label: string = itemType;
        let content: string | undefined = name;
        if (!content && !entity) {
          content = itemType;
          label = `Item ${index + 1}`;
        } else if (!content && entity) {
          const stateObj = this._hass.states[entity];
          content = stateObj ? computeStateName(stateObj) : entity;
        }
        return html` <badge-editor-item
          .rowIndex=${rowIndex}
          .itemIndex=${index}
          @badge-action-item=${this._handleSubRowPeekEdit}
        >
          <ha-badge .label=${capitalize(label)}>
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

    return html` <panel-row-item
      ._hass=${this._hass}
      ._store=${this._store}
      ._rowConfig=${row}
      .rowIndex=${this._selectedRowIndex!}
      @go-back=${() => {
        this._selectedRowIndex = null;
      }}
      @row-item-changed=${this._handleRowChanged}
    ></panel-row-item>`;
  }

  private _handleSubRowPeekEdit = async (ev: Event) => {
    ev.stopPropagation();
    const target = ev.currentTarget as any;
    const { rowIndex, itemIndex } = target;
    const { action } = (ev as CustomEvent).detail;
    console.debug('Action:', action, rowIndex, itemIndex);

    switch (action as ActionType) {
      case 'edit-item':
        this._selectedRowIndex = rowIndex;
        await this.updateComplete;
        if (this._rowItemEditor && this._rowItemEditor.hasUpdated) {
          this._rowItemEditor._editIndex = itemIndex;
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
    const rowConfig = ev.detail.rowConfig as IndicatorRowConfig;
    const { rowIndex, itemIndex, type } = ev.detail;
    const newRows = [...(this._rows || [])];
    newRows[rowIndex] = rowConfig;
    this._configChanged(newRows);
    console.debug('Row changed:', rowIndex, itemIndex, type);
    // this.updateComplete.then(() => {
    //   const groupIndex = type === 'group' ? itemIndex ?? null : null;
    //   const entityIndex = type === 'entity' ? itemIndex ?? null : null;
    //   setTimeout(() => {
    //     this._showSelectedRow(rowIndex, groupIndex, entityIndex);
    //   }, 500);
    // });
  }

  private _handleRowAction(ev: any | RowAction): void {
    // console.debug('Handle row action:', ev, typeof ev);
    let action: RowAction;
    let index: number | null = null;
    if (ev && ev instanceof Event) {
      ev.stopPropagation();
      ev.preventDefault();
      const target = (ev.target || ev.currentTarget) as any;
      action = target.action;
      index = target.index !== undefined ? Number(target.index) : null;
      console.debug('Action:', action, index);
    } else {
      action = ev;
    }

    const handleAction = async () => {
      const currentRows = [...(this._rows || [])];
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
    const newRows = rows.length ? rows : undefined;
    this._cardConfigChanged({ indicator_rows: newRows });
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

        #rowList ha-expansion-panel[expanded] {
          border-color: rgba(var(--rgb-primary-color), 0.7);
        }

        .item-actions {
          gap: 1em;
          display: flex;
          align-items: center;
        }
        .item-actions .separator {
          width: 1px;
          background-color: var(--divider-color);
          height: 21px;
          margin-inline: -4px;
        }
        /* .item-actions > .handle {
          margin-inline-start: 12px;
        } */
        .item-actions > .handle:hover {
          cursor: move;
          color: var(--primary-color);
        }
        .item-actions > .handle:active {
          cursor: grabbing;
        }

        .row-items {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 8px;
          width: -webkit-fill-available;
          height: auto;
          box-sizing: border-box;
          align-items: center;
          /* background-color: var(--primary-background-color); */
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-indicator-rows': PanelIndicatorRows;
  }
  interface Window {
    IndicatorRowsEditor: PanelIndicatorRows;
  }
}
