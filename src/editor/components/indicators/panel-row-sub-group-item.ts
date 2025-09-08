import { mdiDelete, mdiDrag, mdiPencil } from '@mdi/js';
import { capitalize } from 'es-toolkit';
import { html, TemplateResult, CSSResultGroup, nothing, css, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { fireEvent } from '../../../ha';
import { getGroupEntities, GroupEntity } from '../../../ha/data/group';
import { IndicatorBaseItemConfig, IndicatorRowGroupConfig } from '../../../types/config/card/row-indicators';
import { Create } from '../../../utils';
import { GROUP_ENTITY_ADDED_ACTIONS } from '../../../utils/editor/create-actions-menu';
import { ICON } from '../../../utils/mdi-icons';
import { BaseEditor } from '../../base-editor';
import { SUB_PANEL } from '../../editor-const';

interface GroupConfigChangeEventDetail {
  items?: IndicatorBaseItemConfig[];
  exclude_entities?: string[];
}

declare global {
  interface HASSDomEvents {
    'edit-group-item': { index: number };
    'group-items-changed': GroupConfigChangeEventDetail;
  }
}

@customElement(SUB_PANEL.ROW_SUB_GROUP_ITEM)
export class PanelRowSubGroupItem extends BaseEditor {
  @property({ attribute: false }) public _groupItems?: IndicatorBaseItemConfig[];
  @property({ attribute: false }) public _groupEntityObj?: GroupEntity;
  @property({ attribute: false }) public _groupConfig!: IndicatorRowGroupConfig;

  @query('.add-container', true) private _addContainer?: HTMLDivElement;
  @query('#entity-picker') private _entityPicker?: any;

  @state() private _excludeEntities: Set<string> = new Set();
  @state() private _addMode = false;
  private _opened = false;

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_groupConfig') && this._groupConfig) {
      this._excludeEntities = new Set(this._groupConfig?.exclude_entities || []);
    }
  }

  protected render(): TemplateResult {
    const config = this._groupConfig;
    const ignoreGroupMenbers = !!config.ignore_group_members;

    const actionMap = [
      { title: 'Edit', icon: mdiPencil, action: (index: number) => this._editItem(index) },
      {
        title: 'Delete',
        icon: mdiDelete,
        action: (index: number) => this._deleteItem(index),
      },
    ];
    return html`
      ${ignoreGroupMenbers ? nothing : this._renderAutoAddedMembers()}
      <ha-sortable handle-selector=".handle" @item-moved=${this._entityMoved}>
        <div class="indicator-list">
          ${repeat(
            this._groupItems || [],
            (item: IndicatorBaseItemConfig) => item.entity,
            (item: IndicatorBaseItemConfig, index: number) => html`
              <div class="item-config-row" data-entity-id="${item.entity}" data-index="${index}">
                <ha-icon-button class="handle" .path=${mdiDrag}></ha-icon-button>
                <div class="item-content">
                  <ha-entity-picker
                    .hass=${this._hass}
                    .value=${item.entity}
                    .index=${index}
                    .hideClearIcon=${true}
                    .showEntityId=${true}
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
      <div class="add-container">
        <ha-button appearance="filled" size="small" @click=${this._addEntity}>
          <ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon> Add entity
        </ha-button>
        ${this._renderPicker()}
      </div>
    `;
  }

  private _renderAutoAddedMembers(): TemplateResult | typeof nothing {
    if (!this._groupEntityObj) {
      return nothing;
    }
    const groupItems = this._groupItems?.map((item) => item.entity) || [];

    let members = getGroupEntities(this._groupEntityObj);
    if (!members || members.length === 0) {
      return nothing;
    }

    // remove items that are already in the group items
    members = members.filter((ent) => !groupItems.includes(ent));
    if (members.length === 0) {
      return nothing;
    }

    const excluded = this._excludeEntities;
    const includedMembers = members.filter((ent) => !excluded.has(ent));
    if (includedMembers.length === 0) {
      return nothing;
    }

    // show members
    const content = html`
      <div class="row-items">
        ${includedMembers.map((ent) => this._renderBadgeItem(ent, excluded.has(ent)))}
        ${excluded.size > 0 ? html`<div class="divider"><span> Excluded members </span></div>` : ''}
        ${[...excluded].map((ent) => this._renderBadgeItem(ent, excluded.has(ent)))}
      </div>
    `;

    const expansionOpts = {
      header: `Auto generated entities from entity`,
      secondary: 'You can exclude entities from the list below',
    };

    return Create.ExpansionPanel({ content, options: expansionOpts });
  }

  private _renderBadgeItem(e: string, excluded: boolean): TemplateResult {
    const defaultAction = excluded ? 'remove-exclude-entity' : 'add-exclude-entity';
    const actionMenu = [GROUP_ENTITY_ADDED_ACTIONS.find((a) => a.action === defaultAction)];
    const icon = !excluded ? 'mdi:check-circle' : 'mdi:close-circle';
    return html`
      <badge-editor-item
        .entity=${e}
        ._menuAction=${actionMenu}
        .defaultAction=${defaultAction}
        show-tooltip
        @badge-action-item=${this._handleAddIncludeEntity}
      >
        <ha-badge ?disabled=${excluded}>
          <ha-icon .icon=${icon} slot="icon"></ha-icon>
          <span>${capitalize(e)}</span>
        </ha-badge>
      </badge-editor-item>
    `;
  }

  private _handleAddIncludeEntity(ev: CustomEvent): void {
    ev.stopPropagation();
    const entity = (ev.target as any).entity;
    const action = ev.detail.action;
    console.debug('handle exclude/include entity:', entity, action);
    if (!entity || !action) {
      return;
    }
    const excluded = this._excludeEntities;
    if (action === 'add-exclude-entity') {
      excluded.add(entity);
    } else if (action === 'remove-exclude-entity') {
      excluded.delete(entity);
    }
    console.debug('Excluded entities:', Array.from(excluded));
    const value = excluded.size > 0 ? Array.from(excluded) : undefined;

    fireEvent(this, 'group-items-changed', { exclude_entities: value });
  }

  private _renderPicker() {
    if (!this._addMode) {
      return nothing;
    }
    return html`
      <mwc-menu-surface
        open
        .anchor=${this._addContainer}
        @closed=${this._onClosed}
        @opened=${this._onOpened}
        @opened-changed=${this._openedChanged}
        @input=${(ev) => ev.stopPropagation()}
      >
        <ha-entity-picker
          .hass=${this._hass}
          id="entity-picker"
          .placeholder=${this._hass.localize('ui.components.target-picker.add_entity_id')}
          .searchLabel=${this._hass.localize('ui.components.target-picker.add_entity_id')}
          @value-changed=${this._entityPicked}
          @click=${(ev) => ev.preventDefault()}
          allow-custom-entity
        ></ha-entity-picker>
      </mwc-menu-surface>
    `;
  }

  private _onClosed(ev) {
    ev.stopPropagation();
    ev.target.open = true;
  }

  private async _onOpened() {
    if (!this._addMode) {
      return;
    }
    await this._entityPicker?.focus();
    await this._entityPicker?.open();
    this._opened = true;
  }

  private _openedChanged(ev: any) {
    if (this._opened && !ev.detail.value) {
      this._opened = false;
      this._addMode = false;
    }
  }

  private async _addEntity(ev): Promise<void> {
    ev.stopPropagation();
    this._addMode = true;
  }

  // GROUP ITEMS HANDLERS
  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newEntities = this._groupItems!.concat();
    newEntities.splice(newIndex, 0, newEntities.splice(oldIndex, 1)[0]);
    fireEvent(this, 'group-items-changed', { items: newEntities });
  }

  private async _entityPicked(event: CustomEvent): Promise<void> {
    event.stopPropagation();
    const value = event.detail.value;
    if (value === undefined || value === null || value === '') {
      return;
    }
    const newEntityConfig: IndicatorBaseItemConfig = {
      entity: value as string,
      show_state: true,
      show_name: true,
      show_icon: true,
      tap_action: { action: 'more-info' },
    };

    const newEntities = (this._groupItems || []).concat([newEntityConfig]);

    fireEvent(this, 'group-items-changed', { items: newEntities });
  }

  private _deleteItem(index: number): void {
    const newEntities = this._groupItems!.concat();
    newEntities.splice(index, 1);
    fireEvent(this, 'group-items-changed', { items: newEntities });
  }

  private _editItem(index: number): void {
    fireEvent(this, 'edit-group-item', { index });
  }
  private _updateItem(event: CustomEvent): void {
    event.stopPropagation();
    const index = (event.target as any).index;
    const value = event.detail.value;
    if (index !== undefined && value) {
      const newEntities = this._groupItems!.concat();
      newEntities[index] = { ...newEntities[index], entity: value };
      fireEvent(this, 'group-items-changed', { items: newEntities });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .indicator-list {
          border: none;
          padding: 0;
          margin-block: 1em;
        }
        .add-container {
          position: relative;
          width: 100%;
          padding-bottom: 8px;
        }

        mwc-menu-surface {
          --mdc-menu-min-width: 100%;
        }
        ha-entity-picker {
          display: block;
          width: 100%;
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
        .row-items ha-badge[disabled] {
          --badge-color: var(--disabled-text-color);
          opacity: 0.6;
        }
        .divider {
          width: 100%;
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--secondary-text-color);
          font-size: 0.75em;
          margin-block: 4px;
        }
        .divider span {
          padding: 0 8px;
          background-color: var(--card-background-color);
        }
        .divider::before {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--divider-color);
        }
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-row-sub-group-item': PanelRowSubGroupItem;
  }
}
