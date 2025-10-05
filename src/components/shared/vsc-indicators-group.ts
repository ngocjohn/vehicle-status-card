import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, queryAssignedElements, state } from 'lit/decorators.js';

import { COMPONENT } from '../../constants/const';
import { EDITOR_INDICATOR_ROW_SELECTED, EditorIndicatorRowEventArgs } from '../../events/editor-indicator-row';
import { SECTION } from '../../types/section';
import { BaseElement } from '../../utils/base-element';
import { VscIndicatorRow } from '../vsc-indicator-row';

@customElement('vsc-indicators-group')
export class VscIndicatorsGroup extends BaseElement {
  constructor() {
    super(SECTION.INDICATORS);
  }
  @queryAssignedElements({ selector: COMPONENT.INDICATOR_ROW }) _indicatorRows?: VscIndicatorRow[];
  @state() private _selectedRow?: number | null;
  @state() private _selectedItem?: number | null;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.section && this.isBaseInEditor) {
      document.addEventListener(EDITOR_INDICATOR_ROW_SELECTED, this._handleRowSelected);
    }
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.section && this.isBaseInEditor) {
      document.removeEventListener(EDITOR_INDICATOR_ROW_SELECTED, this._handleRowSelected);
    }
  }

  public get isSubGroupActive(): boolean {
    if (!this._indicatorRows || this._indicatorRows.length === 0) {
      return false;
    }
    const rowInEditor = this._indicatorRows[this._selectedRow ?? -1];
    if (!rowInEditor) {
      return false;
    }
    return rowInEditor._selectedGroupId !== null;
  }
  private _handleRowSelected = (ev: Event) => {
    ev.stopPropagation();
    const evArgs = (ev as CustomEvent).detail as EditorIndicatorRowEventArgs;
    // console.debug(`${this.constructor.name}::_handleRowSelected`, evArgs);
    const { row_index, group_index, entity_index, peek } = evArgs.config;

    this._selectedRow = row_index;
    this._selectedItem = entity_index ?? group_index ?? null;
    // console.debug('selectedRow:', this._selectedRow, 'selectedItem:', this._selectedItem);
    // update the rows

    const rowsEls = this._indicatorRows;
    if (!rowsEls || rowsEls.length === 0) {
      return;
    }

    if (row_index === null || row_index === undefined) {
      // reset all rows
      rowsEls.forEach((row) => {
        row.dimmedInEditor = false;
        row._resetItemsDimmed();
      });
      return;
    }
    // set disabled for all rows except the selected one
    rowsEls.forEach((row) => {
      row.dimmedInEditor = row.rowIndex !== row_index;
    });
    const selectedRow = rowsEls[row_index];
    if (!selectedRow) {
      return;
    }
    const items = selectedRow._itemEls;
    if (group_index !== null && group_index !== undefined) {
      selectedRow._toggleGroupIndicator(group_index);
    } else {
      selectedRow._toggleGroupIndicator(null);
    }
    if (entity_index !== null && entity_index !== undefined) {
      const entityItem = items?.[entity_index];
      if (entityItem) {
        entityItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        if (peek) {
          entityItem.classList.add('peek');
          setTimeout(() => {
            entityItem.classList.remove('peek');
          }, 2000);
        }
      }
      items.forEach((item, index) => {
        if (index === entity_index) {
          item.dimmedInEditor = false;
        } else {
          item.dimmedInEditor = true;
          if (peek) {
            setTimeout(() => {
              item.dimmedInEditor = false;
            }, 2000);
          }
        }
      });
    } else {
      // if entity_index is null, remove dimmed from all items
      items?.forEach((item) => (item.dimmedInEditor = false));
    }
  };

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    // Example usage
    this._indicatorRows?.forEach((row, index) => {
      row.rowIndex = index;
    });
  }

  protected render(): TemplateResult {
    return html`
      <div class="container" style=${this._computeStyle()}>
        <slot></slot>
      </div>
    `;
  }

  private _computeStyle(): string | undefined {
    if (this.parentElement?.previousElementSibling !== null) {
      return 'margin-top: var(--vic-gutter-gap, 8px);';
    }
    return undefined;
  }
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .container {
          display: flex;
          flex-direction: column;
          gap: var(--vic-gutter-gap, 8px);
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-indicators-group': VscIndicatorsGroup;
  }
}
