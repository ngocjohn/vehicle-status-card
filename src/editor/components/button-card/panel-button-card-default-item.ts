import { mdiDelete, mdiDrag, mdiPencil } from '@mdi/js';
import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import memoizeOne from 'memoize-one';

import { fireEvent } from '../../../ha';
import { HaFormSchema } from '../../../ha/panels/ha-form/types';
import { ButtonArea } from '../../../types/config-area';
import { CardDefaultConfig, DefaultCardItemConfig } from '../../../types/config/card/button-card';
import { processCardItemEntities } from '../../../utils';
import '../../../utils/editor/sub-editor-header';
import { ButtonCardBaseEditor } from '../../button-card-base';
import { SUB_PANEL } from '../../editor-const';
const CARD_DEFAULT_SCHEMA = [
  {
    name: 'title',
    label: 'Category Title',
    type: 'string',
  },
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'collapsed_items',
        label: 'Collapsed Items',
        type: 'boolean',
        default: false,
      },
      {
        name: 'state_color',
        label: 'State Color',
        type: 'boolean',
        default: false,
      },
    ],
  },
] as const;

const ENTITY_ITEM_SCHEMA = memoizeOne(
  (entity: string | undefined) =>
    [
      {
        name: 'name',
        selector: { text: { type: 'text' } },
      },
      {
        name: 'entity',
        selector: { entity: {} },
      },
      {
        name: 'icon',
        selector: { icon: {} },
        context: { icon_entity: 'entity' },
      },
      {
        name: 'attribute',
        selector: {
          attribute: {
            entity_id: entity,
          },
        },
      },
      {
        name: 'state_template',
        selector: { template: {} },
        helper: 'Customize the state based on a template. The template should return a valid state name.',
      },
    ] as const satisfies readonly HaFormSchema[]
);

declare global {
  interface HASSDomEvents {
    'card-item-closed': undefined;
    'card-item-changed': { config: CardDefaultConfig };
    'card-item-label-secondary-changed': { label: string; secondary: string | null } | undefined;
  }
}
@customElement(SUB_PANEL.BTN_DEFAULT_CARD_ITEM)
export class PanelButtonCardDefaultItem extends ButtonCardBaseEditor {
  constructor() {
    super(ButtonArea.DEFAULT_CARD);
  }
  @property({ attribute: false }) _baseCardConfig!: CardDefaultConfig;
  @property({ attribute: false }) _index!: number;
  @state() private _catConfig?: CardDefaultConfig;
  @state() private _catItems?: DefaultCardItemConfig[];

  @state() public _selectedItem: number | null = null;
  @state() public _labelSecondary?: { label: string; secondary: string | null };

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_baseCardConfig')) {
      this._catConfig = { ...(this._baseCardConfig || {}) };
    }
    this._catItems = this._catConfig?.items ? processCardItemEntities(this._catConfig.items) : [];
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_selectedItem') || _changedProperties.has('_catConfig')) {
      this._computeLabelSecondary();
      fireEvent(this, 'card-item-label-secondary-changed', this._labelSecondary);
    }
  }

  protected render(): TemplateResult {
    const DATA = { ...this._baseCardConfig };
    const defaultForm = this._createVscForm(DATA, CARD_DEFAULT_SCHEMA, 'category');
    const secondary = this._selectedItem !== null ? 'Back to items' : 'Back to Category';

    return html`
      <sub-editor-header
        hide-secondary
        .secondary=${secondary}
        .primaryIcon=${'back'}
        @primary-action=${this._handleBack}
      ></sub-editor-header>
      <div class="indicator-config">
        ${this._selectedItem === null
          ? html`${defaultForm} ${this._renderItemList()}</div>`
          : this._renderSelectedItem()}
      </div>
    `;
  }

  private _handleBack(): void {
    if (this._selectedItem !== null) {
      this._selectedItem = null;
      return;
    }
    fireEvent(this, 'card-item-closed');
  }
  private _renderSelectedItem(): TemplateResult {
    if (this._selectedItem === null) {
      return html``;
    }
    const DATA = { ...this._catItems![this._selectedItem] };
    const itemSchema = ENTITY_ITEM_SCHEMA(DATA.entity || '');
    return this._createVscForm(DATA, itemSchema, 'item');
  }

  private _renderItemList(): TemplateResult {
    const actionMap = [
      { title: 'Edit', icon: mdiPencil, action: (index: number) => (this._selectedItem = index) },
      {
        title: 'Delete',
        icon: mdiDelete,
        action: (index: number) => this._deleteItem(index),
      },
    ];
    return html`
      <div class="header-row no-padding">
        <div class="header-title">Items</div>
      </div>
      <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved}>
        <div class="indicator-list">
          ${repeat(
            this._catItems || [],
            (item: DefaultCardItemConfig) => item.entity,
            (item: DefaultCardItemConfig, index: number) => html`
              <div class="item-config-row" data-entity-id="${item.entity}" data-index="${index}">
                <div class="handle">
                  <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                </div>
                <div class="item-content">
                  <ha-entity-picker
                    .hass=${this.hass}
                    .value=${item.entity}
                    .index=${index}
                    .hideClearIcon=${true}
                    @value-changed=${this._updateItem}
                  ></ha-entity-picker>
                </div>
                <div class="item-actions">
                  ${actionMap.map(
                    (action) => html`
                      <ha-icon-button
                        .label=${action.title}
                        .path=${action.icon}
                        @click=${() => action.action(index)}
                      ></ha-icon-button>
                    `
                  )}
                </div>
              </div>
            `
          )}
        </div>
      </ha-sortable>
      <div class="add-entity">
        <ha-entity-picker
          .hass=${this.hass}
          .allowCustomEntity=${true}
          @value-changed=${this._addItem}
        ></ha-entity-picker>
      </div>
    `;
  }

  private _computeLabelSecondary(): { label: string; secondary: string | null } {
    let label = `Category #${this._index + 1}`;
    if (this._catConfig?.title && this._catConfig.title !== '') {
      label += `: ${this._catConfig.title}`;
    }
    let secondary: string | null = null;
    if (this._selectedItem !== null) {
      const item = this._catItems![this._selectedItem];
      secondary = item.name || item.entity || `Item #${this._selectedItem + 1}`;
    }
    this._labelSecondary = { label, secondary };
    return { label, secondary };
  }

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newEntities = this._catItems!.concat();
    newEntities.splice(newIndex, 0, newEntities.splice(oldIndex, 1)[0]);
    this._catItems = newEntities;
    this._baseCardConfig = { ...this._baseCardConfig, items: this._catItems };
    this._dispatchConfigChange(this._baseCardConfig);
  }

  private _updateItem(ev: any): void {
    ev.stopPropagation();
    const target = ev.target;
    const index = target.index;
    const value = ev.detail.value;
    console.log('Update item:', index, value);
    if (index !== undefined && value) {
      const items = [...(this._catItems || [])];
      items[index] = { ...items[index], entity: value };
      this._catItems = items;
      console.log('Updated item:', this._catItems);
      this._baseCardConfig = { ...this._baseCardConfig, items: this._catItems };
      this._dispatchConfigChange(this._baseCardConfig);
    }
  }

  private _deleteItem(index: number): void {
    let items = [...(this._catItems || [])];
    items.splice(index, 1);
    this._catItems = items;
    console.log('Deleted item:', this._catItems);
    this._baseCardConfig = { ...this._baseCardConfig, items: this._catItems };
    this._dispatchConfigChange(this._baseCardConfig);
  }
  private async _addItem(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (value === '') {
      return;
    }

    const newEntities = this._catItems!.concat([{ entity: value as string } as DefaultCardItemConfig]);
    (ev.target as any).value = '';

    this._baseCardConfig = {
      ...this._baseCardConfig,
      items: newEntities,
    };

    this._dispatchConfigChange(this._baseCardConfig);
  }

  protected _onValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { key } = (ev.target || ev.currentTarget) as any;
    const value = { ...ev.detail.value };
    if (key === 'item') {
      if (this._selectedItem === null) {
        return;
      }
      if (value.entity === undefined || value.entity === '') {
        console.warn('Entity is required');
        return;
      }
      const items = [...(this._catItems || [])];
      items[this._selectedItem] = { ...items[this._selectedItem], ...value };
      this._catItems = items;
      this._baseCardConfig = { ...this._baseCardConfig, items: this._catItems };
      this._dispatchConfigChange(this._baseCardConfig);
    } else if (key === 'category') {
      this._catConfig = { ...this._catConfig, ...value };
      this._baseCardConfig = { ...this._baseCardConfig, ...this._catConfig };
      this._dispatchConfigChange(this._baseCardConfig);
    }
  }

  private _dispatchConfigChange(config: CardDefaultConfig): void {
    const newConfig = { ...this._baseCardConfig, ...config };
    fireEvent(this, 'card-item-changed', { config: newConfig });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .add-entity {
          display: block;
          margin-left: 36px;
          margin-inline-start: 36px;
          margin-inline-end: calc(2 * (var(--mdc-icon-button-size, 48px) + var(--vic-gutter-gap)));
          direction: var(--direction);
          margin-bottom: var(--vic-card-padding);
        }
        .sub-content {
          margin-bottom: unset;
        }
        .header-row.no-padding {
          padding: 0 !important;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-button-card-default-item': PanelButtonCardDefaultItem;
  }
}
