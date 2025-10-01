import { html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { COMPONENT } from '../../../constants/const';
import './vsc-btn-card';
import './vsc-state-item';
import { actionHandler } from '../../../ha/panels/common/directives/action-handler-directive';
import { handleAction } from '../../../ha/panels/common/handle-actions';
import { hasAction } from '../../../types/config';
import { BaseButton } from '../../../utils/base-button';

@customElement(COMPONENT.BUTTON_CARD_ITEM)
export class VscButtonCardItem extends BaseButton {
  constructor() {
    super();
  }
  @property({ type: Number, attribute: 'item-index' }) public itemIndex?: number;
  @property({ type: Boolean, reflect: true, attribute: 'dimmed-in-editor' }) public dimmedInEditor = false;

  protected render(): TemplateResult | typeof nothing {
    if (!this._btnConfig || !this._hass) {
      return nothing;
    }
    const stateObj = this._stateObj;
    const btnShowConfig = this._btnShowConfig;

    const imageUrl = btnShowConfig.icon_type === 'entity-picture' ? this._getImageUrl() : undefined;
    const icon = this._getTemplateValue('icon_template') ?? this._btnConfig.icon;
    const iconStyle = this._computeIconStyle();
    return html`
      <ha-card ?transparent=${btnShowConfig.transparent} style=${styleMap(iconStyle)}>
        <div
          class="background"
          @action=${this._handleCardAction.bind(this)}
          .actionHandler=${actionHandler({
            hasHold: true,
            hasDoubleClick: true,
          })}
          role="button"
        >
          <ha-ripple></ha-ripple>
        </div>
        <vsc-btn-card .btnShowConfig=${btnShowConfig}>
          <vsc-state-item .btnShowConfig=${btnShowConfig}>
            <vsc-btn-shape-icon
              slot="icon"
              .interactive=${this._hasIconAction}
              .imageSrc=${imageUrl}
              @action=${this._handleIconAction.bind(this)}
              .actionHandler=${actionHandler({
                disabled: !this._hasIconAction,
                hasDoubleClick: true,
                hasHold: true,
              })}
            >
              <ha-state-icon slot="icon" .hass=${this._hass} .stateObj=${stateObj} .icon=${icon}> </ha-state-icon>
            </vsc-btn-shape-icon>

            ${this._renderStateInfo()}
          </vsc-state-item>
        </vsc-btn-card>
      </ha-card>
    `;
  }

  private _handleIconAction(ev: CustomEvent) {
    ev.stopPropagation();
    const action = ev.detail.action;
    const config = {
      entity: this._iconActionConfig!.entity,
      tap_action: this._iconActionConfig!.icon_tap_action,
      hold_action: this._iconActionConfig!.icon_hold_action,
      double_tap_action: this._iconActionConfig!.icon_double_tap_action,
    };
    if (action === 'tap') {
      if (hasAction(config?.tap_action)) {
        handleAction(this, this._hass!, config, 'tap');
        return;
      }
    }
    if (action === 'hold') {
      if (hasAction(config!.hold_action)) {
        handleAction(this, this._hass!, config, 'hold');
        return;
      }
    }
    if (action === 'double_tap') {
      if (hasAction(config!.double_tap_action)) {
        handleAction(this, this._hass!, config, 'double_tap');
        return;
      }
    }
  }

  private _handleCardAction(ev: CustomEvent): void {
    const action = ev.detail.action;
    const isAction = this._btnConfig?.button_type === 'action';

    const config = {
      entity: this._btnConfig?.entity,
      tap_action: this._btnConfig?.tap_action,
      hold_action: this._btnConfig?.hold_action,
      double_tap_action: this._btnConfig?.double_tap_action,
    };
    const _hasAction = isAction && hasAction(config[`${action}_action`]);
    console.debug('_handleCardAction', action, isAction, _hasAction, config[`${action}_action`]);
    switch (action) {
      case 'tap':
        if (!isAction) {
          this.dispatchEvent(new CustomEvent('click-index', { bubbles: true, composed: true }));
          return;
        }
        if (_hasAction) {
          handleAction(this, this._hass!, config, 'tap');
          return;
        }
        break;
      case 'hold':
      case 'double_tap':
        if (_hasAction) {
          handleAction(this, this._hass!, config, action);
          return;
        }
        break;
    }
  }
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
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
          height: 100%;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-button-card-item': VscButtonCardItem;
  }
}
