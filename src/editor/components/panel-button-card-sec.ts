import { html, TemplateResult, CSSResultGroup, nothing, css } from 'lit';
import { customElement, state, property, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { computeStateName } from '../../ha/common/entity/compute_state_name';
import { findEntitiesFromHass } from '../../ha/panels/lovelace/find-entities';
import { BaseButtonCardItemConfig } from '../../types/config';
import { ConfigArea } from '../../types/config-area';
import '../shared/badge-editor-item';
import '../../utils/editor/sub-editor-header';
import { Create, showConfirmDialog } from '../../utils';
import { BUTTON_ACTION_MENU } from '../../utils/editor/create-actions-menu';
import { generateNewButtonConfig } from '../../utils/editor/migrate-button-card';
import { createSecondaryCodeLabel } from '../../utils/editor/sub-editor-header';
import { BaseEditor } from '../base-editor';
import { ACTIONS, PANEL, SUB_PANEL } from '../editor-const';
import { PanelButtonCardMain } from './button-card/panel-button-card-main';

export interface SubButtonCardConfig {
  index: number;
  config?: BaseButtonCardItemConfig;
}

@customElement(PANEL.BUTTON_SEC)
export class PanelButtonCardSec extends BaseEditor {
  constructor() {
    super(ConfigArea.BUTTONS);
  }
  @property({ attribute: false }) public _buttonList?: BaseButtonCardItemConfig[];
  @state() private _buttonItemConfig?: SubButtonCardConfig;
  @state() private _yamlActive: boolean = false;

  @query(SUB_PANEL.BTN_MAIN) _subBtnEl?: PanelButtonCardMain;

  protected render(): TemplateResult {
    const btns = this._buttonList || [];
    if (this._buttonItemConfig) {
      return html`
        <panel-button-card-main
          ._hass=${this._hass}
          ._store=${this._store}
          ._btnConfig=${this._buttonItemConfig.config!}
          ._btnIndex=${this._buttonItemConfig.index}
          @sub-button-closed=${this._closeSubEditor}
          @sub-button-changed=${this._subButtonChanged}
        ></panel-button-card-main>
      `;
    }
    return html`
      <sub-editor-header
        hide-primary
        .leftBtn=${!this._yamlActive}
        ._addBtnLabel=${'Add Button'}
        @left-btn=${this._handleAddBtn}
        .secondaryAction=${createSecondaryCodeLabel(this._yamlActive)}
        @secondary-action=${() => {
          this._yamlActive = !this._yamlActive;
        }}
      ></sub-editor-header>
      ${this._yamlActive ? this._createVscYamlEditor(btns, 'button_cards') : this._renderButtonList()}
    `;
  }

  private _renderButtonList(): TemplateResult {
    const buttonList = this._buttonList ?? [];
    const visibleBtns = buttonList.filter((btn) => !btn.hide_button);
    const hiddenBtns = buttonList.filter((btn) => btn.hide_button);
    return !buttonList.length
      ? html`<div>No buttons added.</div>`
      : html` <ha-sortable handle-selector=".handle" .noStyle=${true} @item-moved=${this._buttonMoved}>
            <div class="button-grid-list" style=${this._computeGridColumns()}>
              ${repeat(visibleBtns, (btn: BaseButtonCardItemConfig, index: number) => {
                return this._renderButtonItem(btn, index);
              })}
            </div>
          </ha-sortable>
          ${hiddenBtns.length > 0
            ? Create.SectionPanel([
                {
                  title: 'Hidden Buttons',
                  content: html`
                    <div class="button-grid-list" style=${this._computeGridColumns()}>
                      ${hiddenBtns.map((btn, index) => {
                        const realIndex = visibleBtns.length + index;
                        return this._renderButtonItem(btn, realIndex, true);
                      })}
                    </div>
                  `,
                  expansion: true,
                },
              ])
            : nothing}`;
  }

  private _renderButtonItem(btn: BaseButtonCardItemConfig, index: number, hidden: boolean = false): TemplateResult {
    let actionMenu = [...BUTTON_ACTION_MENU];
    if (hidden) {
      actionMenu = actionMenu.filter((a) => a.action !== ACTIONS.HIDE_BUTTON && a.action !== ACTIONS.SHOW_BUTTON);
    } else {
      actionMenu = actionMenu.filter((a) => a.action !== ACTIONS.UNHIDE_BUTTON);
    }

    const { name, icon, entity } = btn;
    const iconSlot = icon ?? `mdi:numeric-${index + 1}-circle`;
    let label: string = `Button ${index + 1}`;
    let content: string | undefined = name;
    if (!content && !entity) {
      content = 'Button';
      label = `#${index + 1}`;
    } else if (!content && entity) {
      const stateObj = this._hass.states[entity];
      content = stateObj ? computeStateName(stateObj) : entity;
    }
    return html`
      <badge-editor-item
        class=${!hidden ? 'handle' : 'disabled'}
        .moreOnly=${hidden}
        .btnIndex=${index}
        ._menuAction=${actionMenu}
        .defaultAction=${ACTIONS.EDIT_BUTTON}
        @badge-action-item=${this._handleItemAction}
      >
        <ha-badge .label=${label}>
          <ha-icon slot="icon" .icon=${iconSlot}></ha-icon>
          ${content}
        </ha-badge>
      </badge-editor-item>
    `;
  }

  private _handleItemAction(ev: CustomEvent): void {
    ev.stopPropagation();
    const index = (ev.currentTarget as any).btnIndex;
    const action = ev.detail.action;
    // console.debug('Button action', action, index);
    const updateChange = (newConfig: BaseButtonCardItemConfig[]) => {
      this._buttonsChanged(newConfig);
    };
    let currentList = [...(this._buttonList || [])];
    const visibleBtns = currentList.filter((btn) => !btn.hide_button);
    switch (action) {
      case ACTIONS.EDIT_BUTTON:
        this._editButtonConfig(index);
        break;
      case ACTIONS.DUPLICATE_BUTTON:
        const newBtn = JSON.parse(JSON.stringify(currentList[index]));
        currentList.splice(visibleBtns.length, 0, newBtn); // Insert after last visible button
        updateChange(currentList);
        break;
      case ACTIONS.HIDE_BUTTON:
        currentList[index].hide_button = !currentList[index].hide_button;
        const buttonToHide = currentList.splice(index, 1)[0];
        currentList.push(buttonToHide); // Move to end of list
        updateChange(currentList);
        break;
      case ACTIONS.UNHIDE_BUTTON:
        currentList[index].hide_button = false;
        const buttonToUnhide = currentList.splice(index, 1)[0];
        currentList.splice(visibleBtns.length, 0, buttonToUnhide);
        updateChange(currentList);
        break;
      case ACTIONS.DELETE_BUTTON:
        this._deleteButton(index);
        break;
      case ACTIONS.SHOW_BUTTON:
        this._dispatchEditorEvent('show-button', { buttonIndex: index });
        break;
      default:
        console.warn('Unknown action', action);
    }
  }

  private _editButtonConfig(index: number): void {
    const btnConfig = this._buttonList![index];
    this._buttonItemConfig = {
      index,
      config: btnConfig,
    };
    if (btnConfig.hide_button) {
      return;
    }
    // Auto highlight button after 300ms
    setTimeout(() => {
      if (this._subBtnEl) {
        this._subBtnEl._btnLoading = true;
        this._dispatchEditorEvent('show-button', { buttonIndex: index, keep: true });
        this._subBtnEl._buttonHighlighted = true;
        this._subBtnEl._toggleHighlightButton(true);
        setTimeout(() => {
          if (this._subBtnEl) this._subBtnEl._btnLoading = false;
        }, 3000);
      }
    }, 300);
  }

  private _closeSubEditor = () => {
    this._buttonItemConfig = undefined;
  };

  private _subButtonChanged = (ev: CustomEvent): void => {
    ev.stopPropagation();
    if (!this._buttonItemConfig) return;
    const btnConfig = { ...ev.detail.btnConfig } as BaseButtonCardItemConfig;
    this._buttonItemConfig = {
      ...this._buttonItemConfig,
      config: btnConfig,
    };
    const index = this._buttonItemConfig.index;
    const currentList = [...(this._buttonList || [])];
    currentList[index] = btnConfig;
    this._buttonsChanged(currentList);
  };

  private _deleteButton = async (index: number) => {
    let confirm = await showConfirmDialog(this, 'Are you sure you want to delete this button?', 'Delete');
    if (!confirm) return;
    const currentList = [...(this._buttonList || [])];
    currentList.splice(index, 1);
    this._buttonsChanged(currentList);
  };

  private _handleAddBtn(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('Add new button');
    const entities = findEntitiesFromHass(this._hass, 1, ['light']);
    console.debug('Found entities', entities);
    const newButton = generateNewButtonConfig(entities[0]);
    console.debug('New button config', newButton);
    const currentList = [...(this._buttonList || [])];
    const visibleBtns = currentList.filter((btn) => !btn.hide_button);
    // Insert new button before first hidden button (or at end of list)
    currentList.splice(visibleBtns.length, 0, newButton);
    this._buttonsChanged(currentList);
    // Open editor for new button
    this._editButtonConfig(visibleBtns.length);
  }

  private _buttonMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newList = JSON.parse(JSON.stringify(this._buttonList || []));
    newList.splice(newIndex, 0, newList.splice(oldIndex, 1)[0]);
    this._buttonsChanged(newList);
  }

  protected _onYamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('onYamlChanged (PanelButtonCardSec)');
    const { key, subKey } = ev.target as any;
    const value = ev.detail;
    console.debug('YAML changed:', { key, subKey, value });
    const newBtns = [...value];
    this._buttonsChanged(newBtns);
  }

  private _buttonsChanged(newVal: BaseButtonCardItemConfig[]): void {
    this._buttonList = [...(newVal || [])];
    this._cardConfigChanged({ button_cards: this._buttonList });
    return;
  }

  private _computeGridColumns() {
    const cols = this._getButtonGridCols();
    const minWidth = `calc((100% / ${cols}) - 8px)`;
    return `grid-template-columns: repeat(auto-fill, minmax(${minWidth}, 1fr));`;
  }

  public _reloadPreview(): void {
    if (this._subBtnEl) {
      this._subBtnEl._reoloadPreview();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .button-grid-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(calc((100% - 24px) / 2), 1fr));
          grid-template-rows: auto;
          gap: var(--vic-gutter-gap);
          margin-block-end: 1em;
          position: relative;
          width: 100%;
          box-sizing: border-box;
          height: 100%;
        }
        badge-editor-item {
          min-height: 50px;
          /* --overlay-radius: 1em !important; */
          --ha-badge-size: 100%;
          --ha-badge-border-radius: 1em;
          --badge-editor-justify: flex-start;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-button-card-sec': PanelButtonCardSec;
  }
}
