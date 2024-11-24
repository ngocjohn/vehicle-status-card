import { UnsubscribeFunc } from 'home-assistant-js-websocket';
// Lit
import { CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// local
import { ButtonCardEntityItem, HA as HomeAssistant } from '../types';
// styles
import cardstyles from '../css/card.css';
import { addActions } from '../utils';
import { RenderTemplateResult, subscribeRenderTemplate } from '../utils/ws-templates';
import { VehicleButtonsGrid } from './vsc-vehicle-buttons-grid';

const TEMPLATE_KEYS = ['state_template', 'notify', 'color'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-button-single')
export class VehicleButtonSingle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) _card!: VehicleButtonsGrid;
  @property({ attribute: false }) _buttonConfig!: ButtonCardEntityItem;
  @property({ attribute: false }) _index!: number;

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
    const buttonType = this._buttonConfig.button_type;
    const actionConfig = this._buttonConfig.button.button_action;
    const actionEl = this.shadowRoot?.getElementById('actionBtn');

    if (actionEl && buttonType === 'action' && actionConfig) {
      addActions(actionEl, actionConfig);
      console.log('Action added', this._index, actionEl, actionConfig);
    } else {
      actionEl?.addEventListener('click', this._handleNavigate.bind(this));
      console.log('Action not added', this._index, buttonType);
    }
  }

  public isTemplate(key: TemplateKey) {
    const button = this._buttonConfig.button;
    const templateMap = {
      state_template: button.secondary.state_template,
      notify: button.notify,
      color: button.color,
    };
    const value = templateMap[key];
    return value?.includes('{');
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
    const buttonOptions = {
      state_template: button.secondary.state_template,
      notify: button.notify,
      color: button.color,
    };
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
          template: buttonOptions[key] ?? '',
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (_err) {
      const result = {
        result: buttonOptions[key] ?? '',
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
    return cardstyles;
  }

  protected render(): TemplateResult {
    const { hideNotify } = this._card;
    const { icon, primary, secondary } = this._buttonConfig.button;
    const entity = secondary.entity || '';
    const state = this._getTemplateValue('state_template') || unsafeHTML('&nbsp;');
    const color = this._getTemplateValue('color');
    const notify = this._getTemplateValue('notify');

    return html`
      <div
        class="grid-item click-shrink"
      >
        <div class="click-container" id="actionBtn"">
          <div class="item-icon">
            <div class="icon-background">
              <ha-state-icon
                .hass=${this.hass}
                .stateObj=${entity ? this.hass.states[entity] : undefined}
                .icon=${icon}
                style=${color ? `color: ${color}` : ''}
              ></ha-state-icon>
            </div>
            ${
              !hideNotify
                ? html`
                    <div class="item-notify" ?hidden=${!notify}>
                      <ha-icon icon="mdi:alert-circle"></ha-icon>
                    </div>
                  `
                : nothing
            }
          </div>
          <div class="item-content">
            <div class="primary">
              <span>${primary}</span>
            </div>
            <span class="secondary">${state}</span>
          </div>
        </div>
      </div>
    `;
  }

  private _handleNavigate(): void {
    this._card._handleClick(this._index);
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'vsc-button-single': VehicleButtonSingle;
  }
}
