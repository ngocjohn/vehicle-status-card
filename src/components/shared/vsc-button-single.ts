// External
import { HassEntity, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import hash from 'object-hash/dist/object_hash.js';

import { RenderTemplateResult, subscribeRenderTemplate, hasTemplate, forwardHaptic, HomeAssistant } from '../../ha';
import { hasItemAction } from '../../types/config';
import { ButtonCardConfig, BUTTON_TEMPLATE_KEYS, ButtonTemplateKey } from '../../types/config/card/button';
import { strStartsWith } from '../../utils';
import { BaseElement } from '../../utils/base-element';
import { CacheManager } from '../../utils/cache-manager';
import { addActions } from '../../utils/lovelace/tap-action';

const templateCache = new CacheManager<TemplateResults>(1000);

type TemplateResults = Partial<Record<ButtonTemplateKey, RenderTemplateResult | undefined>>;

@customElement('vsc-button-single')
export class VehicleButtonSingle extends BaseElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _buttonConfig!: ButtonCardConfig;
  @property({ attribute: false }) public hideNotify!: boolean;
  @property({ attribute: 'transparent', type: Boolean, reflect: true }) public transparent!: boolean;

  @property({ attribute: 'vertical', type: Boolean, reflect: true }) public vertical!: boolean;
  @property({ attribute: false }) _entityStateObj?: HassEntity;

  @state() private _templateResults?: TemplateResults;
  @state() private _unsubRenderTemplates: Map<ButtonTemplateKey, Promise<UnsubscribeFunc>> = new Map();
  @state() private _iconStyle: Record<string, string | undefined> = {};

  @state() private _stateBadgeEl?: any;

  constructor() {
    super();
    this.hideNotify = false;
    this.transparent = false;
    this.vertical = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._tryDisconnect();

    if (this._buttonConfig && this._templateResults) {
      const key = this._computeCacheKey();
      templateCache.set(key, this._templateResults);
      // console.debug(`Cached template results for key: ${key}`);
    }
  }

  private _computeCacheKey() {
    // console.debug('Computing cache key for button config');
    return hash(this._buttonConfig);
  }

  private get _stateColor(): boolean {
    if (!this._entityStateObj || !this._buttonConfig.button.secondary.entity) {
      return false;
    }
    return this._buttonConfig.button.state_color || false;
  }

  protected async willUpdate(changedProperties: PropertyValues): Promise<void> {
    super.willUpdate(changedProperties);
    if (changedProperties.has('_buttonConfig') && this._buttonConfig) {
      const button = this._buttonConfig.button;
      if (button.secondary && button.secondary.entity) {
        this._entityStateObj = this.hass.states[button.secondary.entity];
      }
    }

    if (!this._templateResults) {
      const key = this._computeCacheKey();
      if (templateCache.has(key)) {
        this._templateResults = templateCache.get(key)!;
      } else {
        this._templateResults = {};
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

  protected async updated(changedProperties: PropertyValues): Promise<void> {
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
      // If the state object has changed and the icon
      // log the change to console
      if (oldEntitObj && JSON.stringify(oldEntitObj) !== JSON.stringify(newEntityObj)) {
        console.log(
          'Entity state object changed:',
          oldEntitObj,
          JSON.stringify(oldEntitObj) !== JSON.stringify(newEntityObj)
        );
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

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (_changedProperties.has('hass') || _changedProperties.has('_buttonConfig')) {
      this._tryConnect();
    }
    if (_changedProperties.has('_entityStateObj') && this._entityStateObj) {
      return true;
    }

    return true;
  }

  private _setEventListeners(): void {
    if (!this.isAction) {
      return;
    }
    const actionConfig = this._buttonConfig?.button_action || {};
    if (hasItemAction(actionConfig)) {
      const actionEl = this.shadowRoot?.getElementById('actionBtn') as HTMLElement;
      addActions(actionEl, actionConfig);
    }
  }

  private get isAction(): boolean {
    const buttonType = this._buttonConfig.button_type;
    return buttonType === 'action';
  }

  public isTemplate(key: ButtonTemplateKey) {
    const button = this._buttonConfig.button;
    const value = key === 'state_template' ? button.secondary.state_template : button[key];
    return hasTemplate(value);
  }

  private _getTemplateValue(key: ButtonTemplateKey) {
    return this._templateResults?.[key]?.result;
  }

  private _getValue(key: ButtonTemplateKey) {
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
    BUTTON_TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: ButtonTemplateKey): Promise<void> {
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
          variables: {
            config: this._buttonConfig,
            user: this.hass.user!.name,
            entity: button.secondary.entity,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (_err) {
      console.warn(`Error while subscribing to render template for key ${key}`, _err);
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
    BUTTON_TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }
  private async _tryDisconnectKey(key: ButtonTemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplates.get(key);

    if (!unsubRenderTemplate) {
      // console.debug(`No unsubscribe function found for key: ${key}`);
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;

      unsub();
      this._unsubRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // the connection was closed or the template was not found. Ignore this error
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          --vic-notify-icon-color: var(--white-color);
        }
        :host([vertical]) .click-container {
          flex-direction: column;
          text-align: center;
          gap: 10px;
        }
        :host([transparent]) .grid-item {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
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

        /* .grid-item[transparent] {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        } */

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

        /* .grid-item .click-container[vertical] {
          flex-direction: column;
          text-align: center;
          gap: 10px;
        } */

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
          width: 100%;
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
        .redGlows {
          animation: redGlow 1s infinite;
          animation-iteration-count: 5;
        }

        @keyframes redGlow {
          0% {
            box-shadow: 0 0 10px 0 rgba(255, 0, 0, 0.5);
          }

          50% {
            box-shadow: 0 0 20px 0 rgba(255, 0, 0, 0.5);
          }

          100% {
            box-shadow: 0 0 10px 0 rgba(255, 0, 0, 0.5);
          }
        }
      `,
    ];
  }

  protected render(): TemplateResult {
    const { primary, secondary } = this._buttonConfig.button;
    const icon = this._buttonConfig.button.icon || '';
    const entity = secondary?.entity || '';
    this._entityStateObj = this.hass.states[entity];
    const stateObj = this._entityStateObj;
    const hideNotify = this.hideNotify;

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
      <div class="grid-item" id="actionBtn" @click=${this._handleNavigate} style=${styleMap(iconStyle)}>
        <ha-ripple></ha-ripple>
        <div class="click-container click-shrink">
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
    this.dispatchEvent(new CustomEvent('click-index', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-button-single': VehicleButtonSingle;
  }
}
