import { mdiDelete, mdiDrag, mdiPencil } from '@mdi/js';
import { html, TemplateResult, CSSResultGroup, nothing, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { fireEvent } from '../../../ha';
import { getGroupEntities, GroupEntity } from '../../../ha/data/group';
import { IndicatorBaseItemConfig, IndicatorRowGroupConfig } from '../../../types/config/card/row-indicators';
import { Create } from '../../../utils';
import { ICON } from '../../../utils/mdi-icons';
import { BaseEditor } from '../../base-editor';

declare global {
  interface HASSDomEvents {
    'edit-group-item': { index: number };
    'group-items-changed': { items: IndicatorBaseItemConfig[] };
  }
}

@customElement('panel-row-sub-group-item')
export class PanelRowSubGroupItem extends BaseEditor {
  @property({ attribute: false }) public _groupItems?: IndicatorBaseItemConfig[];
  @property({ attribute: false }) public _groupEntityObj?: GroupEntity;
  @property({ attribute: false }) public _groupConfig!: IndicatorRowGroupConfig;

  @query('.add-container', true) private _addContainer?: HTMLDivElement;
  @query('#entity-picker') private _entityPicker?: any;

  @state() private _excludeEntities: string[] = [];
  @state() private _addMode = false;
  private _opened = false;

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

    const members = getGroupEntities(this._groupEntityObj);
    if (!members || members.length === 0) {
      return nothing;
    }
    this._excludeEntities = [...(this._groupConfig.exclude_entities || [])];
    // show members
    const content = html`
      <ha-chip-set>
        ${members.map(
          (ent) =>
            html`<ha-assist-chip
              .label=${ent}
              .selected=${!this._excludeEntities.includes(ent)}
              @click=${() => {
                console.log('click', ent);
              }}
              >${ent}</ha-assist-chip
            >`
        )}
      </ha-chip-set>
    `;

    return Create.SectionPanel([{ title: 'Auto-added members from entity', content, expansion: true }]);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-row-sub-group-item': PanelRowSubGroupItem;
  }
}
