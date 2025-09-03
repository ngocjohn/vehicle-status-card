import { html, TemplateResult, CSSResultGroup, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import { fireEvent } from '../../ha';
import { ButtonCardConfig, VehicleStatusCardConfig } from '../../types/config';
import { Create, ICON, isMobileClient, isTouch } from '../../utils';
import { BUTTON_ACTION_MENU } from '../../utils/editor/create-actions-menu';
import '../shared/badge-editor-item';
import { BaseEditor } from '../base-editor';
import { ACTIONS, BUTTON_CARD_ACTIONS, PANEL } from '../editor-const';
import { BUTTON_GRID_SCHEMA } from '../form';

export type ButtonListEditorEventParams = {
  action: BUTTON_CARD_ACTIONS;
  buttonIndex?: number;
  cardIndex?: number;
};

declare global {
  interface HASSDomEvents {
    'button-list-action': ButtonListEditorEventParams;
    'button-list-changed': { config: ButtonCardConfig[] };
  }
}

const BUTTON_PRIMARY_SCHEMA = (label: string, disabled: boolean = false) =>
  [
    {
      name: 'primary',
      label: label,
      required: false,
      disabled: disabled,
      type: 'string',
    },
  ] as const;

@customElement(PANEL.BUTTON_LIST)
export class PanelButtonList extends BaseEditor {
  @property({ attribute: false }) public config!: VehicleStatusCardConfig;

  @state() private _buttonListConfig?: ButtonCardConfig[];
  @state() private _listView: boolean = false;
  @state() private _inGridSettings: boolean = false;
  @state() private _movingMode: boolean = false;

  constructor() {
    super();
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (_changedProperties.has('_listView') || _changedProperties.has('_inGridSettings')) {
      if (this._movingMode && (this._listView || this._inGridSettings)) {
        this._movingMode = false;
      }
    }
  }
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        *[hidden],
        .hidden {
          display: none !important;
        }
        *[active] {
          color: var(--primary-color);
        }
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

        .button-grid-item {
          display: flex;
          position: relative;
          padding: var(--vic-gutter-gap);
          background: var(--secondary-background-color, var(--card-background-color, #fff));
          box-shadow: var(--ha-card-box-shadow);
          box-sizing: border-box;
          border-radius: var(--ha-card-border-radius, 12px);
          border-width: var(--ha-card-border-width, 1px);
          border-style: solid;
          border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
          align-items: flex-start;
          height: 100%;
          overflow: hidden;
          min-height: 55px;
        }

        .item-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          width: 100%;
          pointer-events: none;
        }

        .item-content > .primary {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 1rem;
          font-weight: 500;
        }
        .item-content > .secondary {
          color: var(--secondary-text-color);
          text-transform: capitalize;
          letter-spacing: 0.5px;
          white-space: nowrap;
          font-weight: 400;
          font-size: 12px;
          line-height: 16px;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .item-actions {
          box-sizing: border-box;
          flex: 0;
          margin-inline: auto 8px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          color: var(--secondary-text-color);
        }
        sub-editor-header [slot='secondary-action'] ha-icon-button {
          color: var(--secondary-text-color);
        }
        sub-editor-header [slot='secondary-action'] ha-icon-button[active],
        sub-editor-header [slot='secondary-action'] ha-icon-button:hover {
          color: var(--primary-color);
        }

        .button-grid-list badge-editor-item.shaking:nth-child(2n) {
          animation: shake1;
          animation-delay: -0.25s;
          animation-duration: 0.27s;
          animation-iteration-count: infinite;
          transform-origin: 50% 10%;
        }

        .button-grid-list badge-editor-item.shaking:nth-child(2n + 1) {
          animation: shake2;
          animation-delay: -0.5s;
          animation-duration: 0.25s;
          animation-iteration-count: infinite;
          animation-direction: alternate;
          transform-origin: 30% 5%;
        }

        @keyframes shake1 {
          0% {
            transform: rotate(-1deg);
            animation-timing-function: ease-in;
          }

          50% {
            transform: rotate(1.5deg);
            animation-timing-function: ease-out;
          }
        }

        @keyframes shake2 {
          0% {
            transform: rotate(1deg);
            animation-timing-function: ease-in;
          }

          50% {
            transform: rotate(-1.5deg);
            animation-timing-function: ease-out;
          }
        }
      `,
    ];
  }

  protected render(): TemplateResult {
    this._buttonListConfig = this.config.button_card;

    return html`
      ${this._editorHeader()} ${!this._inGridSettings ? this._renderButtonList() : this._renderGridLayoutSettings()}
    `;
  }

  private _editorHeader(): TemplateResult {
    const inGridSettings = this._inGridSettings;
    const isListView = this._listView;

    return html`
      <sub-editor-header
        .hidePrimaryAction=${!inGridSettings}
        @primary-action=${() => (this._inGridSettings = false)}
        .primaryIcon=${ICON.CLOSE}
        .hideSecondaryAction=${true}
        ._label=${'Grid layout'}
      >
        ${inGridSettings
          ? nothing
          : html`
              <span slot="primary-action">
                <ha-button size="small" appearance="filled" @click=${() => this._toggleAction(ACTIONS.ADD_NEW_BUTTON)}>
                  <ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon>Add Button</ha-button
                >
              </span>
              <span slot="secondary-action">
                <ha-icon-button
                  ?active=${this._movingMode}
                  .path=${ICON.CURSOR_MOVE}
                  @click=${() => this._toggleMovingMode()}
                ></ha-icon-button>
                <ha-icon-button
                  ?active=${!isListView && !this._movingMode}
                  .path=${ICON.GRID}
                  @click=${() => (this._listView = false)}
                >
                </ha-icon-button>
                <ha-icon-button
                  ?active=${isListView}
                  .path=${ICON.LIST_BOX_OUTLINE}
                  @click=${() => (this._listView = true)}
                >
                </ha-icon-button>
                <ha-icon-button .path=${ICON.COG} @click=${() => (this._inGridSettings = true)}> </ha-icon-button
              ></span>
            `}
      </sub-editor-header>
    `;
  }

  private _renderGridLayoutSettings(): TemplateResult {
    const BUTTON_GRID_DATA = { ...(this.config.layout_config?.button_grid || {}) };
    const useSwiper = BUTTON_GRID_DATA.swipe;
    const gridForm = this._createVscForm(
      BUTTON_GRID_DATA,
      BUTTON_GRID_SCHEMA(!useSwiper),
      'layout_config',
      'button_grid'
    );
    return Create.SectionPanel([{ title: '', content: gridForm }]);
  }

  private _renderButtonList(): TemplateResult {
    const isListView = this._listView;
    const buttons = this._buttonListConfig ?? [];

    const visibleButtons = buttons.filter((btn) => !btn.hide_button);
    const hiddenButtons = buttons.filter((btn) => btn.hide_button);
    return !buttons.length
      ? html`<span>No buttons added</span>`
      : html`<ha-sortable handle-selector=".handle" .noStyle=${true} @item-moved=${this._buttonsMoved}>
            <div class=${!isListView ? 'button-grid-list' : 'button-list'} style=${this._computeGridColumns()}>
              ${repeat(
                visibleButtons,
                (btn: ButtonCardConfig) => btn.button.primary,
                (btn: ButtonCardConfig, index: number) => {
                  return this._renderButton(btn, index);
                }
              )}
            </div>
          </ha-sortable>
          ${hiddenButtons.length > 0
            ? Create.SectionPanel([
                {
                  title: 'Hidden Buttons',
                  content: html`
                    ${hiddenButtons.map((btn: ButtonCardConfig, index: number) => {
                      const realIndex = visibleButtons.length + index;
                      return this._renderButton(btn, realIndex);
                    })}
                  `,
                  expansion: true,
                },
              ])
            : nothing}`;
  }
  private _buttonActionsMap(hide_button: boolean = false, index: number): TemplateResult {
    let actionMap = [
      { title: 'Show Button', action: ACTIONS.SHOW_BUTTON, icon: 'mdi:eye' },
      { title: 'Duplicate', action: ACTIONS.DUPLICATE_BUTTON, icon: 'mdi:content-duplicate' },
      { title: 'Hide on card', action: ACTIONS.HIDE_BUTTON, icon: 'mdi:eye-off' },
      { title: 'Unhide on card', action: ACTIONS.UNHIDE_BUTTON, icon: 'mdi:eye' },
      {
        title: 'Delete',
        action: ACTIONS.DELETE_BUTTON,
        icon: 'mdi:delete',
        color: 'var(--error-color)',
      },
    ];

    if (isTouch || isMobileClient) {
      actionMap.unshift({
        title: 'Edit Button',
        action: ACTIONS.EDIT_BUTTON,
        icon: 'mdi:pencil',
      });
    }

    actionMap = actionMap.filter((action) => {
      if (action.title === 'Show Button' && hide_button) {
        return false;
      }
      if (action.title === 'Hide on card' && hide_button) {
        return false;
      }

      if (action.title === 'Unhide on card' && !hide_button) {
        return false;
      }
      return true;
    });

    return html`
      <ha-icon-button
        id="edit-item-icon"
        @click=${() => this._toggleAction(ACTIONS.EDIT_BUTTON, index)}
        .path=${ICON.PENCIL}
      ></ha-icon-button>
      ${hide_button
        ? html`
            <ha-icon-button
              @click="${() => this._toggleAction(ACTIONS.UNHIDE_BUTTON, index)}"
              .path=${ICON.EYE}
            ></ha-icon-button>
          `
        : nothing}

      <ha-button-menu
        .corner=${'TOP_LEFT'}
        .fixed=${true}
        .menuCorner=${'END'}
        .activatable=${true}
        .naturalMenuWidth=${true}
        @closed=${(ev: Event) => ev.stopPropagation()}
      >
        <ha-icon-button slot="trigger" .path=${ICON.DOTS_VERTICAL}></ha-icon-button>
        ${actionMap.map(
          (action) =>
            html`<ha-list-item
              @click=${() => this._toggleAction(action.action, index)}
              .graphic=${'icon'}
              style="z-index: 6; ${action.color ? `color: ${action.color}` : ''}"
            >
              <ha-icon
                icon=${action.icon}
                slot="graphic"
                style="${action.color ? `color: ${action.color}` : ''}"
              ></ha-icon>
              ${action.title}
            </ha-list-item>`
        )}
      </ha-button-menu>
    `;
  }

  private _renderButton(button: ButtonCardConfig, index: number): TemplateResult {
    const isListView = this._listView;
    const isHidden = button.hide_button;
    const actions = this._buttonActionsMap(button.hide_button, index);
    const gridActions = BUTTON_ACTION_MENU;

    const gridContent = html`
      <badge-editor-item
        class=${this._movingMode ? 'handle shaking' : 'handle'}
        data-index="${index}"
        .buttonIndex=${index}
        ._menuAction=${gridActions}
        .noEdit=${this._movingMode}
        .defaultAction=${ACTIONS.EDIT_BUTTON}
        @badge-action-item=${this._handleButtonActionsMap}
        style="--badge-border-radius: var(--ha-card-border-radius, 12px);"
      >
        <div class="button-grid-item">
          <div class="item-content">
            <span class="primary">#${index + 1}</span>
            <span class="secondary">${button.button.primary}</span>
          </div>
        </div>
      </badge-editor-item>
    `;

    const DATA = { primary: button.button.primary || '' };
    const schema = BUTTON_PRIMARY_SCHEMA(`Button #${index + 1}`, button.hide_button);

    return isListView || isHidden
      ? html`
          <div class="item-config-row" data-index="${index}" ?hiddenoncard=${button.hide_button}>
            <div class=${!button.hide_button ? 'handle' : 'ignore'}>
              <ha-icon-button .path=${ICON.DRAG}></ha-icon-button>
            </div>
            <div class="sub-content">
              <ha-form
                .hass=${this._hass}
                .data=${DATA}
                .schema=${schema}
                .computeLabel=${(schema: any) => {
                  return schema.label || schema.name;
                }}
                .configValue=${'primary'}
                .configType=${'button'}
                .configIndex=${index}
                @value-changed=${this._handleTitlePrimaryChanged}
              ></ha-form>
            </div>
            <div class="item-actions">${actions}</div>
          </div>
        `
      : gridContent;
  }

  private _toggleMovingMode(): void {
    const isMoving = this._movingMode;
    const isGrid = !this._listView;
    if (!isMoving && !isGrid) {
      this._listView = false;
    }
    this._movingMode = !isMoving;
  }

  private _handleButtonActionsMap(ev: CustomEvent): void {
    ev.stopPropagation();
    const action = ev.detail.action;
    const buttonIndex = (ev.currentTarget as any).buttonIndex;
    // console.debug('Button action:', action, buttonIndex);
    this._toggleAction(action, buttonIndex);
  }

  private _computeGridColumns() {
    let columns = this.config.layout_config?.button_grid?.columns || 2;
    columns = Math.max(2, Math.min(columns, 4)); // Ensure columns are between 2 and 4
    const minWidth = `calc((100% / ${columns}) - 8px)`;
    return styleMap({
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    });
  }

  private _handleTitlePrimaryChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const configIndex = (ev.target as any).configIndex;
    const value = ev.detail.value;
    const buttonListConfig = [...(this._buttonListConfig || [])];
    const buttonCard = { ...buttonListConfig[configIndex] };
    const button = { ...buttonCard.button };
    button.primary = value.primary;
    buttonCard.button = button;
    buttonListConfig[configIndex] = buttonCard;
    this._buttonListConfig = buttonListConfig;

    fireEvent(this, 'button-list-changed', { config: this._buttonListConfig });
  }

  private _buttonsMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    console.log('button moved', oldIndex, newIndex);

    const newButtonsConfig = JSON.parse(JSON.stringify(this._buttonListConfig || []));
    newButtonsConfig.splice(newIndex, 0, newButtonsConfig.splice(oldIndex, 1)[0]);
    this._buttonListConfig = [...newButtonsConfig];

    fireEvent(this, 'button-list-changed', { config: this._buttonListConfig });
  }

  private _toggleAction(action: BUTTON_CARD_ACTIONS, buttonIndex?: number, cardIndex?: number) {
    fireEvent(this, 'button-list-action', { action, buttonIndex, cardIndex } as ButtonListEditorEventParams);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-button-list': PanelButtonList;
  }
}
