import { html, css, CSSResultGroup, TemplateResult, nothing, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { COMPONENT } from '../../../constants/const';
import './vsc-btn-card';
import './vsc-state-item';
import './vsc-btn-badge';
import { handleAction } from '../../../ha/panels/common/handle-actions';
import { hasAction } from '../../../types/config';
import { BaseButton } from '../../../utils/base-button';
import { ActionDomEvent, ActionHandleOpts, addActionHandler } from '../../../utils/lovelace/action-handler';
import { addActions } from '../../../utils/lovelace/tap-action';

@customElement(COMPONENT.BUTTON_CARD_ITEM)
export class VscButtonCardItem extends BaseButton {
  constructor() {
    super();
  }
  @property({ type: Number, attribute: 'item-index' }) public itemIndex?: number;
  @property({ type: Boolean, reflect: true, attribute: 'dimmed-in-editor' }) public dimmedInEditor = false;

  @query('ha-card') _haCard!: HTMLElement;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._addIconAction();
    this._addCardAction();
  }

  private _addIconAction(): void {
    if (!this._hasIconAction) {
      return;
    }
    const icon = this.renderRoot.querySelector('vsc-btn-shape-icon') as HTMLElement;
    if (!icon) {
      return;
    }
    const config = this._iconActions;
    addActions(icon, config);
  }

  private _addCardAction(): void {
    const card = this.renderRoot.querySelector('#clickable-background') as HTMLElement;
    if (!card) {
      return;
    }
    const handlerOptions: ActionHandleOpts = {
      hasHold: true,
      hasDoubleClick: true,
      hasClick: true,
    };
    addActionHandler(card, handlerOptions);
    card.addEventListener('action', this._handleCardEvent.bind(this) as EventListener);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._btnConfig || !this._hass) {
      return nothing;
    }
    const stateObj = this._stateObj;
    const btnShowConfig = this._btnShowConfig;

    const imageUrl = btnShowConfig.icon_type === 'entity-picture' ? this._getImageUrl() : undefined;
    const icon =
      (btnShowConfig.icon_type === 'icon-template' && this._getTemplateValue('icon_template')) ?? this._btnConfig.icon;
    const iconStyle = this._computeIconStyle();

    const badgeVisible = Boolean(this._getTemplateValue('notify'));
    const notifyIcon = this._getTemplateValue('notify_icon');
    const notifyText = this._getTemplateValue('notify_text');
    const notifyColor = this._getTemplateValue('notify_color');

    return html`
      <ha-card ?transparent=${btnShowConfig.transparent} style=${styleMap(iconStyle)}>
        <div
          id="clickable-background"
          class="background"
          role="button"
        >
          <ha-ripple></ha-ripple>
        </div>
        <vsc-btn-card .btnShowConfig=${btnShowConfig}>
          <vsc-state-item
            .btnShowConfig=${btnShowConfig}
            >
            <vsc-btn-shape-icon
              slot="icon"
              .interactive=${this._hasIconAction}
              .imageSrc=${imageUrl}
              role=${this._hasIconAction ? 'button' : undefined}
              tabindex=${this._hasIconAction ? '0' : undefined}
            >
              <ha-state-icon
                slot="icon"
                .hass=${this._hass}
                .stateObj=${stateObj}
                .icon=${icon}>
              </ha-state-icon>
            </vsc-btn-shape-icon>
            ${
              badgeVisible
                ? html`<vsc-btn-badge
                    slot="badge"
                    .isText=${Boolean(notifyText)}
                    style=${styleMap({ '--vsc-btn-badge-background-color': notifyColor })}
                  >
                    ${notifyText
                      ? html`<span>${notifyText}</span>`
                      : html`<ha-icon .icon=${notifyIcon || 'mdi:circle'}></ha-icon>`}
                  </vsc-btn-badge>`
                : nothing
            }
              </vsc-btn-badge>

            ${this._renderStateInfo()}
          </vsc-state-item>
        </vsc-btn-card>
      </ha-card>
    `;
  }

  private _handleCardEvent(ev: ActionDomEvent): void {
    ev.stopPropagation();
    const action = ev.detail.action;
    const isAction = this._btnConfig?.button_type === 'action';
    const config = this._btnActionConfig;
    const _hasAction = hasAction(config[`${action}_action`]);
    switch (action) {
      case 'tap':
        if (!isAction) {
          this.dispatchEvent(new CustomEvent('click-index', { bubbles: true, composed: true }));
          return;
        }
        if (_hasAction) {
          handleAction(this, this.hass, config, action);
        }
        break;
      case 'hold':
      case 'double_tap':
        if (_hasAction) {
          handleAction(this, this.hass, config, action);
        }
        break;
      default:
        break;
    }
  }

  public _toggleHighlight(): void {
    const haCard = this._haCard;
    if (!haCard) {
      return;
    }
    haCard.classList.add('highlight');
    haCard.addEventListener('animationend', () => {
      haCard.classList.remove('highlight');
    });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        :host {
          --icon-color: rgba(var(--rgb-primary-text-color), 0.75);
          --icon-color-disabled: rgb(var(--default-disabled-color));
          --icon-size: 36px;
          --icon-symbol-size: 0.667em;
          --icon-border-radius: 50%;
          --shape-icon-opacity: 0.2;
          --shape-hover-opacity: 0.35;
          --shape-color: var(--disabled-text-color);
          --shape-color-disabled: rgba(var(--default-disabled-color), 0.2);
          --shape-outline-color: transparent;
        }
        :host([dimmed-in-editor]) {
          opacity: 0.3;
          filter: blur(1px);
        }
        :host([dimmed-in-editor]:hover) {
          opacity: 1;
          filter: none;
        }

        ha-card {
          --ha-ripple-color: var(--icon-color);
          --ha-ripple-hover-opacity: 0.04;
          --ha-ripple-pressed-opacity: 0.12;
          height: 100%;
          transition: box-shadow 180ms ease-in-out, border-color 180ms ease-in-out;
          padding: 0;
          margin: 0;
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: var(--vsc-button-align, center);
          background: var(--secondary-background-color, var(--card-background-color, #fff));
        }
        ha-card[transparent] {
          background: transparent;
          box-shadow: none;
          border: none;
        }
        [role='button'] {
          cursor: pointer;
          pointer-events: auto;
        }
        [role='button']:focus {
          outline: none;
        }
        .background {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          border-radius: var(--ha-card-border-radius, 12px);
          margin: calc(-1 * var(--ha-card-border-width, 1px));
          overflow: hidden;
        }
        .highlight {
          background: transparent;
          &::before {
            content: '';
            position: absolute;
            z-index: -2;
            left: -50%;
            top: -50%;
            width: 200%;
            height: 200%;
            background-color: transparent;
            background-repeat: no-repeat;
            background-size: 50% 50%, 50% 50%;
            background-position: 0 0, 100% 0, 100% 100%, 0 100%;
            background-image: linear-gradient(transparent, transparent), linear-gradient(transparent, transparent),
              linear-gradient(transparent, transparent), linear-gradient(var(--primary-color), var(--primary-color));
            animation: rotate 1s linear infinite;
            animation-fill-mode: forwards;
            display: block;
            animation-iteration-count: 2;
          }

          &::after {
            content: '';
            position: absolute;
            z-index: -1;
            left: 2px;
            top: 2px;
            width: calc(100% - 4px);
            height: calc(100% - 4px);
            background: var(--secondary-background-color, var(--card-background-color, #fff));
            border-radius: inherit;
            display: block;
          }
        }
        @keyframes rotate {
          100% {
            transform: rotate(1turn);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-button-card-item': VscButtonCardItem;
  }
}
