// External
import { forwardHaptic } from 'custom-card-helpers';
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

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

  @state() private _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};

  @state() private _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    this._setEventListeners();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this._tryConnect();
    }
  }

  private _setEventListeners(): void {
    if (!this.isAction) {
      return;
    }
    const actionConfig = this._buttonConfig.button.button_action;
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

  private getValue(key: TemplateKey) {
    return this._templateResults[key]?.result;
  }

  private _getTemplateValue(key: TemplateKey) {
    const button = this._buttonConfig.button;
    switch (key) {
      case 'state_template':
        const secondary = button.secondary;
        const state = secondary.state_template
          ? this.getValue('state_template') || secondary.state_template
          : secondary.attribute && secondary.entity
          ? this.hass.formatEntityAttributeValue(this.hass.states[secondary.entity], secondary.attribute)
          : secondary.entity && this.hass.states[secondary.entity]
          ? this.hass.formatEntityState(this.hass.states[secondary.entity])
          : '';
        return state;
      case 'notify':
        const notify = this.getValue('notify') || false;
        return notify;
      case 'color':
        const color = button.color ? this.getValue('color') || button.color : '';
        return color;
      case 'picture_template':
        const picture = button.picture_template ? this.getValue('picture_template') || button.picture_template : '';
        return picture;
      case 'notify_color':
        const notifyColor = button.notify_color
          ? this.getValue('notify_color') || button.notify_color
          : 'var(--error-color)';
        return notifyColor;
      case 'notify_icon':
        const notifyIcon = button.notify_icon ? this.getValue('notify_icon') || button.notify_icon : 'mdi:alert-circle';
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
      cardstyles,
      css`
        #actionBtn {
          cursor: pointer;
        }
      `,
    ];
  }

  protected render(): TemplateResult {
    const { hideNotify } = this._card;
    const { icon, primary, secondary } = this._buttonConfig.button;
    const entity = secondary.entity || '';
    const state = this._getTemplateValue('state_template');
    const color = this._getTemplateValue('color') || 'var(--secondary-text-color)';
    const notify = this._getTemplateValue('notify');
    const notifyColor = this._getTemplateValue('notify_color');
    const notifyIcon = this._getTemplateValue('notify_icon');
    const iconBackground = color ? color : 'var(--disabled-text-color)';
    const picture = String(this._getTemplateValue('picture_template'));
    const isPictureUrl = strStartsWith(picture, 'http') || strStartsWith(picture, '/');

    let changedIcon: string;
    if (picture && !isPictureUrl) {
      changedIcon = picture;
    } else {
      changedIcon = icon;
    }

    // const index = this._index;
    return html`
      <div class="grid-item" id="actionBtn" @click=${this._handleNavigate}>
        <ha-ripple></ha-ripple>
        <div class="click-container click-shrink" ?vertical=${this.layout === 'vertical'}>
          <div class="item-icon">
            <div class="icon-background" style=${`--vic-icon-bg-color: ${iconBackground}`}>
              ${isPictureUrl
                ? html`<img class="icon-picture" src=${picture} />`
                : html` <ha-state-icon
                    .hass=${this.hass}
                    .stateObj=${entity ? this.hass.states[entity] : undefined}
                    .icon=${changedIcon}
                    style=${color ? `color: ${color}` : ''}
                  ></ha-state-icon>`}
            </div>
            <div class="item-notify" ?hidden=${!notify || hideNotify} style=${`--vic-notify-color: ${notifyColor}`}>
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
