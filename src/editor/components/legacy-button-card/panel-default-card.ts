import { mdiDelete, mdiDrag, mdiPencil } from '@mdi/js';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import memoizeOne from 'memoize-one';

import editorcss from '../../../css/editor.css';
import { HomeAssistant } from '../../../ha';
import { CardItemConfig, DefaultCardConfig } from '../../../types/config';
import { ICON } from '../../../utils';
import { processCardItemEntities } from '../../../utils/editor/process-editor-entities';
import { PANEL } from '../../editor-const';

export const defaultCardSchema = [
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

export const defaultCardItemSchema = memoizeOne(
  (entity: string) =>
    [
      {
        name: '',
        type: 'grid',
        schema: [
          {
            name: 'name',
            label: 'Name',
            selector: { text: { type: 'text' } },
          },
          {
            name: 'entity',
            selector: { entity: {} },
          },
          {
            name: 'icon',
            label: 'Icon',
            selector: { icon: {} },
            context: { icon_entity: 'entity' },
          },
          {
            name: 'attribute',
            label: 'Attribute',
            selector: {
              attribute: {
                entity_id: entity,
              },
            },
          },
        ],
      },
      {
        name: 'state_template',
        label: 'State Template',
        selector: { template: {} },
        helper: 'Customize the state based on a template. The template should return a valid state name.',
      },
    ] as const
);

@customElement(PANEL.DEFAULT_CARD)
export class PanelDefaultCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) defaultCardConfig!: DefaultCardConfig;

  @state() private _cardConfig?: DefaultCardConfig;
  @state() private _cardItemEntities?: CardItemConfig[];

  @state() public _selectedItem: number | null = null;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('defaultCardConfig')) {
      this._cardConfig = {
        ...(this.defaultCardConfig || {}),
      };
      this._cardItemEntities = this._cardConfig.items ? processCardItemEntities(this._cardConfig.items) : [];
    }
  }

  protected render(): TemplateResult {
    const DATA = { ...this.defaultCardConfig };
    const baseForm = html`
      <ha-form
        .hass=${this.hass}
        .data=${DATA}
        .schema=${defaultCardSchema}
        .computeLabel=${(schema: any) => schema.label}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;

    const subContent = this._selectedItem === null ? this._renderItemList() : this._renderSelectedItem();

    return html` <div class="indicator-config">${baseForm} ${subContent}</div> `;
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
            this._cardItemEntities || [],
            (item: CardItemConfig) => item.entity,
            (item: CardItemConfig, index: number) => html`
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

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newEntities = this._cardItemEntities!.concat();
    newEntities.splice(newIndex, 0, newEntities.splice(oldIndex, 1)[0]);
    this._cardItemEntities = newEntities;
    this.defaultCardConfig = { ...this.defaultCardConfig, items: this._cardItemEntities };
    this._dispatchConfigChange(this.defaultCardConfig);
  }

  private _renderSelectedItem(): TemplateResult {
    if (this._selectedItem === null) {
      return html``;
    }
    const DATA = { ...this._cardItemEntities![this._selectedItem] };
    const itemSchema = defaultCardItemSchema(DATA.entity || '');
    return html`
      <div class="header-row">
        <ha-icon-button
          @click=${() => {
            this._selectedItem = null;
          }}
          .path=${ICON.CLOSE}
        ></ha-icon-button>
        <div class="header-title">Edit Item</div>
      </div>
      <ha-form
        .hass=${this.hass}
        .data=${DATA}
        .schema=${itemSchema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._itemValueChanged}
      ></ha-form>
    `;
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

  private _itemValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { value } = ev.detail;
    console.log('Item value changed:', value);
    if (value.entity === undefined || value.entity === '') {
      console.warn('Entity is required for item configuration.');
      return;
    }
    if (this._selectedItem !== null) {
      const items = [...(this._cardItemEntities || [])];
      items[this._selectedItem] = { ...items[this._selectedItem], ...value };
      this._cardItemEntities = items;
      this.defaultCardConfig = { ...this.defaultCardConfig, items: this._cardItemEntities };
      this._dispatchConfigChange(this.defaultCardConfig);
    }
  }

  private _updateItem(ev: any): void {
    ev.stopPropagation();
    const target = ev.target;
    const index = target.index;
    const value = ev.detail.value;
    console.log('Update item:', index, value);
    if (index !== undefined && value) {
      const items = [...(this._cardItemEntities || [])];
      items[index] = { ...items[index], entity: value };
      this._cardItemEntities = items;
      console.log('Updated item:', this._cardItemEntities);
      this.defaultCardConfig = { ...this.defaultCardConfig, items: this._cardItemEntities };
      this._dispatchConfigChange(this.defaultCardConfig);
    }
  }

  private async _addItem(ev: CustomEvent): Promise<void> {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (value === '') {
      return;
    }

    const newEntities = this._cardItemEntities!.concat([{ entity: value as string } as CardItemConfig]);
    (ev.target as any).value = '';

    this.defaultCardConfig = {
      ...this.defaultCardConfig,
      items: newEntities,
    };

    this._dispatchConfigChange(this.defaultCardConfig);
  }

  private _deleteItem(index: number): void {
    let items = [...(this._cardItemEntities || [])];
    items.splice(index, 1);
    this._cardItemEntities = items;
    console.log('Deleted item:', this._cardItemEntities);
    this.defaultCardConfig = { ...this.defaultCardConfig, items: this._cardItemEntities };
    this._dispatchConfigChange(this.defaultCardConfig);
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const { value } = ev.detail;
    this.defaultCardConfig = { ...this.defaultCardConfig, ...value };
    this._dispatchConfigChange(this.defaultCardConfig);
  }

  private _dispatchConfigChange(config: DefaultCardConfig): void {
    const newConfig = { ...this.defaultCardConfig, ...config };
    const event = new CustomEvent('card-item-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
  static get styles(): CSSResultGroup {
    return [
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
      editorcss,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-default-card': PanelDefaultCard;
  }
}
