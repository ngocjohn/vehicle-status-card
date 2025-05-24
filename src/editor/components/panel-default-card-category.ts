import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import memoizeOne from 'memoize-one';

import { ICON } from '../../const/const';
import editorcss from '../../css/editor.css';
import { CardItemConfig, DefaultCardConfig, HomeAssistant } from '../../types';
import { processCardItemEntities } from '../../utils/process-editor-entities';
import { VehicleStatusCardEditor } from '../editor';

export const defaultCardSchema = [
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'title',
        label: 'Category Title',
        selector: { text: { type: 'text' } },
      },
      {
        name: 'collapsed_items',
        label: 'Collapsed Items',
        selector: { boolean: {} },
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

@customElement('vsc-panel-default-card')
export class PanelDefaultCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) cardEditor!: VehicleStatusCardEditor;
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
    const items = this._cardItemEntities || [];
    const actionMap = [
      { title: 'Edit', icon: 'mdi:pencil', action: (index: number) => (this._selectedItem = index) },
      {
        title: 'Delete',
        icon: 'mdi:delete',
        action: (index: number) => this._deleteItem(index),
        color: 'var(--error-color)',
      },
    ];

    return html`
      <div class="indicator-list">
        ${repeat(
          items,
          (item: CardItemConfig) => item.entity,
          (item: CardItemConfig, index: number) => html`
            <div class="item-config-row" data-index="${index}">
              <div class="item-content">
                  <ha-selector
                    .hass=${this.hass}
                    .value=${item.entity}
                    .index=${index}
                    .selector=${{ entity: {} }}
                    @value-changed=${this._updateItem}
                  ></ha-selector>
                </div>
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
            </div>
          `
        )}
        <div class="add-entity">
          <ha-entity-picker
            .hass=${this.hass}
            .allowCustomEntity=${true}
            @value-changed=${(ev: CustomEvent) => {
              const value = ev.detail.value;
              if (value) {
                this._addItem(value);
              }
            }}
          ></ha-entity-picker>
        </div>
      </div>
    `;
  }

  private _renderSelectedItem(): TemplateResult {
    if (this._selectedItem === null) {
      return html``;
    }
    const DATA = { ...this._cardItemEntities![this._selectedItem] };
    const itemSchema = defaultCardItemSchema(DATA.entity);
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

  private _addItem(value: string): void {
    let items = [...(this._cardItemEntities || [])];
    items.push({ entity: value });
    this._cardItemEntities = items;
    this.defaultCardConfig = { ...this.defaultCardConfig, items: this._cardItemEntities };
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
          /* margin-left: 36px;
          margin-inline-start: 36px; */
          margin-inline-end: 48px;
          direction: var(--direction);
        }
        .sub-content {
          margin-bottom: unset;
        }
      `,
      editorcss,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-panel-default-card': PanelDefaultCard;
  }
}
