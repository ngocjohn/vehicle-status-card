import { capitalize } from 'es-toolkit';
import { html, TemplateResult, CSSResultGroup, css } from 'lit';

import '../../../utils/editor/sub-editor-header';
import { customElement, queryAll, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { computeStateName, fireEvent } from '../../../ha';
import { ButtonArea } from '../../../types/config-area';
import { CardDefaultConfig } from '../../../types/config/card/button-card';
import { Create, ICON } from '../../../utils';
import { ExpansionPanelParams } from '../../../utils/editor/create';
import {
  _renderActionItem,
  BUTTON_DEFAULT_CARD_CATEGORY_ACTIONS,
  computeActionList,
} from '../../../utils/editor/create-actions-menu';
import { preventDefault, stopAndPrevent, stopPropagation } from '../../../utils/helpers-dom';
import './panel-button-card-default-item';
import { ButtonCardBaseEditor } from '../../button-card-base';
import { ELEMENT, SUB_PANEL } from '../../editor-const';

interface SubDefaultCardItemConfig {
  index: number;
  itemConfig?: CardDefaultConfig;
}

declare global {
  interface HASSDomEvents {
    'default-card-changed': { config: CardDefaultConfig[] };
  }
}

@customElement(SUB_PANEL.BTN_DEFAULT_CARD)
export class PanelButtonDefaultCard extends ButtonCardBaseEditor {
  constructor() {
    super(ButtonArea.DEFAULT_CARD);
  }
  @state() _defaultCardConfig!: CardDefaultConfig[];
  @state() private _subDefaultCardConfig?: SubDefaultCardItemConfig;

  @queryAll(ELEMENT.HA_EXPANSION_PANEL) _expansionPanels?: Element[];

  protected render(): TemplateResult {
    if (this._subDefaultCardConfig) {
      return html`
        <panel-button-card-default-item
          ._hass=${this._hass}
          ._store=${this._store}
          ._baseCardConfig=${this._subDefaultCardConfig.itemConfig || {}}
          ._index=${this._subDefaultCardConfig.index}
          @card-item-changed=${this._subCardChanged}
          @card-item-closed=${() => (this._subDefaultCardConfig = undefined)}
        ></panel-button-card-default-item>
      `;
    }
    return html`
      <sub-editor-header
        hide-primary
        hide-secondary
        .leftBtn=${true}
        ._addBtnLabel=${'Add category'}
        @left-btn=${this._handleAddCategory}
      ></sub-editor-header>
      ${this._renderDefaultCardList()}
    `;
  }

  private _renderDefaultCardList(): TemplateResult {
    const categories = this._defaultCardConfig || [];
    if (categories.length === 0) {
      return html` <span>No category added yet.</span> `;
    }
    return html`
      <ha-sortable handle-selector=".handle" .listIndex=${'1'} @item-moved=${this._categoryMoved}>
        <div class="card-config" id="rowList">
          ${repeat(categories, (cat: CardDefaultConfig, index: number) => {
            const options: ExpansionPanelParams['options'] = {
              icon: `mdi:numeric-${index + 1}-circle`,
              header: `#${index + 1} ${cat.title ? `- ${cat.title}` : ''}`,
              secondary: `${cat.items?.length || 0} item(s)`,
              leftChevron: true,
              elId: `category-${index}`,
            };
            const slotIcons = this._renderCategoryActions(index);
            const content = this._renderCategoryContent(cat, index);
            return Create.ExpansionPanel({
              content,
              slotIcons,
              options,
              expandedWillChange: this._handlePanelWillChange,
            });
          })}
        </div>
      </ha-sortable>
    `;
  }

  private _categoryMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newList = this._defaultCardConfig.concat();
    newList.splice(newIndex, 0, newList.splice(oldIndex, 1)[0]);
    this._defaultCardChanged(newList);
  }

  private _renderCategoryActions(catIndex: number): TemplateResult {
    let deleteFound = false;
    return html` <div class="item-actions" slot="icons">
      <ha-icon-button
        .label=${'Edit Row'}
        .path=${ICON.CHEVRON_RIGHT}
        .action=${'edit'}
        .index=${catIndex}
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
        ${BUTTON_DEFAULT_CARD_CATEGORY_ACTIONS.map((item) => {
          if (/(delete|remove)/.test(item.action) && !deleteFound) {
            deleteFound = true;
            return html`
              <li divider role="separator"></li>
              ${_renderActionItem({
                item,
                onClick: this._handleRowAction,
                option: { index: catIndex },
              })}
            `;
          }
          return _renderActionItem({
            item,
            onClick: this._handleRowAction,
            option: { index: catIndex },
          });
        })}
      </ha-button-menu>
      <div class="separator"></div>
      <ha-svg-icon class="handle" .path=${ICON.DRAG} @click=${preventDefault}></ha-svg-icon>
    </div>`;
  }

  private _renderCategoryContent(catConfig: CardDefaultConfig, catIndex: number): TemplateResult {
    const items = catConfig.items || [];
    const itemActions = computeActionList(['edit-item', 'delete-item']);
    return html`
      <div class="row-items">
        ${repeat(items, (item, index) => {
          const { name, icon, entity } = item;
          const iconSlot = icon ?? `mdi:numeric-${index + 1}-circle`;
          const itemType = entity ? 'Entity' : 'Empty';
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
            .catIndex=${catIndex}
            .itemIndex=${index}
            ._menuAction=${itemActions}
            @badge-action-item=${this._handleItemAction}
          >
            <ha-badge .label=${capitalize(label)}>
              <ha-icon slot="icon" .icon=${iconSlot}></ha-icon>
              ${content ? html`<span>${capitalize(content)}</span>` : ''}
            </ha-badge>
          </badge-editor-item>`;
        })}
      </div>
    `;
  }

  private _subCardChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail || !this._subDefaultCardConfig) return;
    const { _index } = (ev.target || ev.currentTarget) as any;
    const newConfig = ev.detail.config as CardDefaultConfig;
    console.debug('Sub card changed:', _index, newConfig);
    this._subDefaultCardConfig = {
      ...this._subDefaultCardConfig,
      itemConfig: newConfig,
    };

    const newList = [...(this._defaultCardConfig || [])];
    newList[_index] = newConfig;
    this._defaultCardChanged(newList);
  }

  private _handleItemAction(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    const { itemIndex, catIndex } = (ev.target || ev.currentTarget) as any;
    const action = (ev as any).detail.action;
    console.debug('Item action', action, itemIndex, catIndex);
    const catConfig = { ...(this._defaultCardConfig?.[catIndex] || {}) };
    const items = (catConfig.items || []).concat();
    switch (action) {
      case 'delete-item':
        items.splice(itemIndex, 1);
        catConfig.items = items;
        this._defaultCardConfig[catIndex] = catConfig;
        this._defaultCardChanged(this._defaultCardConfig);
        break;
    }
  }

  private _handleRowAction(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    const { action, index } = (ev.target || ev.currentTarget) as any;
    console.debug('Category action', action, index);
    const categories = (this._defaultCardConfig || []).concat();
    switch (action) {
      case 'delete':
        categories.splice(index, 1);
        this._defaultCardChanged(categories);
        break;
      case 'edit':
        this._subDefaultCardConfig = {
          index,
          itemConfig: { ...(categories[index] || {}) },
        };
        break;
      case 'duplicate':
        const newCat = { ...(categories[index] || {}) };
        newCat.title = `${newCat.title || 'Category'} copy`;
        categories.splice(index + 1, 0, newCat);
        this._defaultCardChanged(categories);
        break;
    }
  }

  private _handleAddCategory(): void {
    const newCategory: CardDefaultConfig = {
      title: 'New Category',
      items: [],
    };
    const newList = [...(this._defaultCardConfig || []), newCategory];
    this._defaultCardChanged(newList);
  }

  private _defaultCardChanged(newConfig: CardDefaultConfig[]): void {
    this._defaultCardConfig = newConfig || [];
    fireEvent(this, 'default-card-changed', { config: this._defaultCardConfig });
  }

  private _handlePanelWillChange = (ev: CustomEvent): void => {
    ev.stopPropagation();
    if (!this._expansionPanels) return;
    const panel = ev.target as any;
    const panelId = panel.id;
    // const expanded = ev.detail.expanded;
    // console.debug('Panel will change:', panelId, expanded);

    // const catIndex = panelId?.replace('category-', '');
    const panels = Array.from(this._expansionPanels).filter((p) => p.id !== panelId) as any[];
    // console.debug('Other panels:', panels);
    panels.forEach((p) => {
      if (p.expanded) {
        p.expanded = false;
      }
    });
  };

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
    'panel-button-card-default': PanelButtonDefaultCard;
  }
}
