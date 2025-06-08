// External
import { forwardHaptic } from 'custom-card-helpers';
import { HassEntity, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

// styles
import cardstyles from '../../css/card.css';
// local
import { BUTTON_LAYOUT, ButtonCardEntityItem, HomeAssistant } from '../../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../types';
import { addActions, hasTemplate, strStartsWith } from '../../utils';
import { hasActions } from '../../utils/ha-helper';
import { VehicleButtonsGrid } from '../vsc-vehicle-buttons-grid';

const TEMPLATE_KEYS = ['state_template', 'notify', 'color', 'picture_template', 'notify_color', 'notify_icon'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-button-single')
export class VehicleButtonSingle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) _card!: VehicleButtonsGrid;
  @property({ attribute: false }) _buttonConfig!: ButtonCardEntityItem;
  @property({ attribute: false }) _index!: number;
  @property({ attribute: 'layout', type: String }) layout?: BUTTON_LAYOUT;
  @property({ attribute: false }) _entityStateObj?: HassEntity;

  @state() private _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};

  @state() private _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();
  @state() private _iconStyle: Record<string, string | undefined> = {};

  @state() private _stateBadgeEl?: any;

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private get _stateColor(): boolean {
    if (!this._entityStateObj || !this._buttonConfig.button.secondary.entity) {
      return false;
    }
    return this._buttonConfig.button.state_color || false;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('_buttonConfig') && this._buttonConfig) {
      const button = this._buttonConfig.button;
      if (button.secondary && button.secondary.entity) {
        this._entityStateObj = this.hass.states[button.secondary.entity];
      }
    }
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    this._setEventListeners();
    if (!this._stateBadgeEl) {
      this._stateBadgeEl = this.shadowRoot?.querySelector('state-badge');
      if (this._stateBadgeEl) {
        // Wait for the state badge to be rendered before setting the initial icon style
        if (this._stateColor) {
          setTimeout(() => {
            const _iconStyle = this._stateBadgeEl?._iconStyle || {};
            this._iconStyle = _iconStyle;
            this.requestUpdate('_iconStyle');
          }, 0);
        } else {
          this._iconStyle = {};
          this._stateBadgeEl.stateColor = false;
        }
      }
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this._tryConnect();
    }
    if (
      (this._stateColor && changedProperties.has('hass') && this.hass) ||
      (changedProperties.has('_entityStateObj') && this._entityStateObj)
    ) {
      const oldEntitObj = changedProperties.get('_entityStateObj') as HassEntity | undefined;
      const newEntityObj = this._entityStateObj as HassEntity;
      // log the change to console
      if (oldEntitObj && JSON.stringify(oldEntitObj) !== JSON.stringify(newEntityObj)) {
        setTimeout(() => {
          const newIconStyle = this._stateBadgeEl?._iconStyle || {};
          const currentStyle = this._iconStyle;
          if (JSON.stringify(currentStyle) !== JSON.stringify(newIconStyle)) {
            this._iconStyle = newIconStyle;
            this.requestUpdate('_iconStyle');
          }
        }, 100);
      }
    }
  }

  private _setEventListeners(): void {
    if (!this.isAction) {
      return;
    }
    const actionConfig = this._buttonConfig.button?.button_action || {};
    if (hasActions(actionConfig)) {
      const actionEl = this.shadowRoot?.getElementById('actionBtn') as HTMLElement;
      addActions(actionEl, actionConfig);
    }
  }

  private get isAction(): boolean {
    const buttonType = this._buttonConfig.button_type;
    return buttonType === 'action';
  }

  public isTemplate(key: TemplateKey) {
    const button = this._buttonConfig.button;
    const value = key === 'state_template' ? button.secondary.state_template : button[key];
    return hasTemplate(value);
  }

  private _getTemplateValue(key: TemplateKey) {
    return this._templateResults[key]?.result;
  }

  private _getValue(key: TemplateKey) {
    const button = this._buttonConfig.button;
    switch (key) {
      case 'state_template':
        const secondary = button.secondary;
        const state = secondary.state_template
          ? this._getTemplateValue('state_template') || secondary.state_template
          : secondary.attribute && secondary.entity
          ? this.hass.formatEntityAttributeValue(this.hass.states[secondary.entity], secondary.attribute)
          : secondary.entity && this.hass.states[secondary.entity]
          ? this.hass.formatEntityState(this.hass.states[secondary.entity])
          : '';
        return state;
      case 'notify':
        const notify = this._getTemplateValue('notify') || false;
        return notify;
      case 'color':
        const color = button.color ? this._getTemplateValue('color') || button.color : '';
        return color;
      case 'picture_template':
        const picture = button.picture_template
          ? this._getTemplateValue('picture_template') || button.picture_template
          : '';
        return picture;
      case 'notify_color':
        const notifyColor = button.notify_color
          ? this._getTemplateValue('notify_color') || button.notify_color
          : 'var(--error-color)';
        return notifyColor;
      case 'notify_icon':
        const notifyIcon = button.notify_icon
          ? this._getTemplateValue('notify_icon') || button.notify_icon
          : 'mdi:alert-circle';
        return notifyIcon;
    }
  }
  private async _tryConnect(): Promise<void> {
    // console.log('Trying to connect');
    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this.hass || !this.isTemplate(key)) {
      return;
    }
    const button = this._buttonConfig.button;

    const template = key === 'state_template' ? button.secondary.state_template : button[key];
    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [key]: result,
          };
        },
        {
          template: template ?? '',
          entity_ids: button.secondary.entity ? [button.secondary.entity] : undefined,
          variables: {
            config: button,
            user: this.hass.user!.name,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: template ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [key]: result,
      };
      this._unsubRenderTemplates.delete(key);
    }
  }
  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }
  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          --vic-notify-icon-color: var(--white-color);
        }

        #actionBtn {
          cursor: pointer;
        }
        .grid-item {
          display: flex;
          position: relative;
          padding: var(--vic-gutter-gap) var(--vic-card-padding);
          background: var(--secondary-background-color, var(--card-background-color, #fff));
          box-shadow: var(--ha-card-box-shadow);
          box-sizing: border-box;
          border-radius: var(--ha-card-border-radius, 12px);
          border-width: var(--ha-card-border-width, 1px);
          border-style: solid;
          border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
          transition: all 0.3s ease-out;
          opacity: 1;
          overflow: hidden;
          align-items: center;
          height: 100%;
        }

        .grid-item[transparent] {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .grid-item .click-container {
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: center;
          flex: 1 1 0%;
          min-width: 0px;
          box-sizing: border-box;
          pointer-events: none;
          gap: 1em;
        }

        .grid-item .click-container[vertical] {
          flex-direction: column;
          text-align: center;
          gap: 10px;
        }

        .grid-item .item-notify {
          position: absolute;
          top: 3px;
          right: -3px;
        }

        .grid-item .item-notify .notify-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          width: var(--vic-notify-size, 18px);
          height: var(--vic-notify-size, 18px);
          font-size: var(--vic-notify-size, 18px);
          border-radius: 50%;
          background-color: var(--vic-notify-color, var(--error-color));
          transition: background-color 280ms ease-in-out;
        }

        .notify-icon ha-icon {
          --mdc-icon-size: 12px;
          color: var(--vic-notify-icon-color, rgb(var(--rgb-white))) !important;
        }

        .grid-item .item-notify[hidden] {
          display: none;
        }

        .grid-item .item-icon {
          position: relative;
          padding: 6px;
          margin: -6px;
        }

        .item-icon .icon-background {
          position: relative;
          width: var(--vic-icon-size);
          height: var(--vic-icon-size);
          border-radius: var(--vic-icon-border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
        }

        .item-icon .icon-background::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background-color: var(--vic-icon-bg-color);
          opacity: var(--vic-icon-bg-opacity);
          transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
        }

        .icon-picture {
          width: 100%;
          height: 100%;
          border-radius: var(--vic-icon-border-radius);
        }

        .grid-item .item-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .grid-item .item-content .primary {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 1rem;
          font-weight: 500;
        }

        .grid-item .item-content .secondary {
          color: var(--secondary-text-color);
          text-transform: capitalize;
          letter-spacing: 0.5px;
          white-space: nowrap;
          font-weight: 400;
          font-size: 12px;
          line-height: 16px;
          text-overflow: ellipsis;
        }

        .primary.title-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          display: block;
          left: 0;
          top: 0;
        }

        .primary.title-wrap::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: -15px;
          width: 40%;
          height: 100%;
          background-image: linear-gradient(
            to left,
            transparent 0,
            var(--secondary-background-color, var(--card-background-color, #fff)) 100%
          );
        }

        .marquee {
          display: inline-block;
          animation: marquee 6s linear 1s infinite;
          overflow: visible !important;
          animation-iteration-count: 3;
          /* left: 100%; */
        }

        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }

          50% {
            transform: translateX(-50%);
          }

          100% {
            transform: translateX(0%);
          }
        }
      `,
      cardstyles,
    ];
  }

  protected render(): TemplateResult {
    const stateObj = this._entityStateObj;
    const { hideNotify } = this._card;
    const { icon, primary, secondary } = this._buttonConfig.button;
    const entity = secondary?.entity || '';
    const state = this._getValue('state_template');
    const notify = this._getValue('notify');
    const notifyIcon = this._getValue('notify_icon');
    const notifyColor = this._getValue('notify_color');
    const stateColor = this._stateColor;
    const color = this._getValue('color');
    const iconBackgroundColor = stateColor ? this._iconStyle.color : color || 'var(--disabled-text-color)';
    const iconColor = color ? color : 'var(--secondary-text-color)';

    const iconStyle = {
      '--vic-icon-bg-color': `${iconBackgroundColor}`,
      '--vic-icon-color': `${iconColor}`,
      '--vic-notify-color': `${notifyColor}`,
    };

    const picture = String(this._getValue('picture_template'));
    const isPictureUrl = strStartsWith(picture, 'http') || strStartsWith(picture, '/');

    let changedIcon: string;
    if (picture && !isPictureUrl) {
      changedIcon = picture;
    } else {
      changedIcon = icon;
    }
    const iconElement =
      this._stateColor && entity
        ? html`<state-badge
            .hass=${this.hass}
            .stateObj=${stateObj}
            .stateColor=${this._stateColor}
            .overrideIcon=${changedIcon}
            .color=${this._stateColor ? undefined : iconColor}
          ></state-badge>`
        : html`
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${stateObj}
              .icon=${changedIcon}
              style=${`color: ${iconColor};`}
            >
            </ha-state-icon>
          `;
    return html`
      <div
        class="grid-item"
        id="actionBtn"
        @click=${this._handleNavigate}
        style=${styleMap(iconStyle)}
        ?transparent=${this._card.gridConfig.transparent}
      >
        <ha-ripple></ha-ripple>
        <div class="click-container click-shrink" ?vertical=${this.layout === 'vertical'}>
          <div class="item-icon">
            <div class="icon-background">
              ${isPictureUrl ? html`<img class="icon-picture" src=${picture} />` : iconElement}
            </div>
            <div class="item-notify" ?hidden=${!notify || hideNotify}>
              <div class="notify-icon">
                <ha-icon icon=${notifyIcon}></ha-icon>
              </div>
            </div>
          </div>
          <div class="item-content">
            <span class="primary">${primary}</span>
            <span class="secondary">${state}</span>
          </div>
        </div>
      </div>
    `;
  }

  private _handleNavigate(event: Event): void {
    event.stopPropagation();
    if (this.isAction) return;
    forwardHaptic('light');
    this._card._handleClick(this._index);
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'vsc-button-single': VehicleButtonSingle;
  }
}
