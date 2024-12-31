// External
import { forwardHaptic } from 'custom-card-helpers';
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import tinycolor from 'tinycolor2';
// local
import { ButtonCardEntityItem, HomeAssistant } from '../../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../types';
import { addActions } from '../../utils';
import { VehicleButtonsGrid } from '../vsc-vehicle-buttons-grid';
// styles
import cardstyles from '../../css/card.css';

const TEMPLATE_KEYS = ['state_template', 'notify', 'color', 'picture_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

const COLOR_AlPHA = '.2';

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
    } else {
      actionEl?.addEventListener('click', (event) => {
        // Ensure clicks on child elements like "secondary" trigger this event
        this._handleNavigate(event);
      });
    }
  }

  public isTemplate(key: TemplateKey) {
    const button = this._buttonConfig.button;
    const templateMap = {
      state_template: button.secondary.state_template,
      notify: button.notify,
      color: button.color,
      picture_template: button.picture_template,
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
      case 'picture_template':
        const picture = button.picture_template ? this.getValue('picture_template') || button.picture_template : '';
        return picture;
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
      picture_template: button.picture_template,
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

  private _setColorAlpha(color: string): string {
    const colorObj = tinycolor(color);
    return colorObj.setAlpha(COLOR_AlPHA).toRgbString();
  }

  private _getBackgroundColors(): string {
    const cssColor = getComputedStyle(this).getPropertyValue('--primary-text-color');
    const rgbaColor = this._setColorAlpha(cssColor);
    return rgbaColor;
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
    const color = this._getTemplateValue('color');
    const notify = this._getTemplateValue('notify');
    const iconBackground = color ? this._setColorAlpha(color) : this._getBackgroundColors();
    const picture = this._getTemplateValue('picture_template');
    const index = this._index;
    return html`
      <div class="grid-item" id="actionBtn" style="animation-delay: ${index * 50}ms">
        <ha-ripple></ha-ripple>
        <div class="click-container click-shrink">
          <div class="item-icon">
            <div class="icon-background" style=${`background-color: ${iconBackground}`}>
              ${picture
                ? html`<img class="icon-picture" src=${picture} />`
                : html` <ha-state-icon
                    .hass=${this.hass}
                    .stateObj=${entity ? this.hass.states[entity] : undefined}
                    .icon=${icon}
                    style=${color ? `color: ${color}` : ''}
                  ></ha-state-icon>`}
            </div>
            <div class="item-notify" ?hidden=${!notify || hideNotify}>
              <ha-icon icon="mdi:alert-circle"></ha-icon>
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
    forwardHaptic('light');
    event.stopPropagation();
    this._card._handleClick(this._index);
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'vsc-button-single': VehicleButtonSingle;
  }
}
