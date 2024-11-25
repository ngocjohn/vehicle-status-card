// Lit
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
// Home Assistant
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
// Utils
import { HA as HomeAssistant, IndicatorConfig } from '../../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../utils/ws-templates';

// CSS
import cardcss from '../../css/card.css';

const TEMPLATE_KEYS = ['state_template', 'icon_template', 'color', 'visibility'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-indicator-single')
export class VscIndicatorSingle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) indicator!: IndicatorConfig;

  @state() private _singleTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubSingleRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [
      cardcss,
      css`
        .item {
          display: flex;
          gap: 0.4rem;
        }
        .item ha-icon {
          margin-bottom: 3px;
        }
      `,
    ];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private isTemplate(value: string | undefined): boolean {
    if (!value || typeof value !== 'string') return false;
    return value.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (
      this._unsubSingleRenderTemplates.get(key) !== undefined ||
      !this.hass ||
      !this.isTemplate(this.indicator[key])
    ) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._singleTemplateResults = { ...this._singleTemplateResults, [key]: result };
        },
        { template: this.indicator[key] ?? '' }
      );
      this._unsubSingleRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      const result = {
        result: this.indicator[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._singleTemplateResults = { ...this._singleTemplateResults, [key]: result };
      this._unsubSingleRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubSingleRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubSingleRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has('hass') && this.hass) {
      this._tryConnect();
    }
    return true;
  }

  protected render(): TemplateResult {
    const indicator = this.indicator;
    const entity = indicator.entity;
    const icon = indicator.icon_template
      ? this._singleTemplateResults.icon_template?.result
      : indicator.icon
      ? indicator.icon
      : '';
    const state = indicator.state_template
      ? this._singleTemplateResults.state_template?.result
      : indicator.attribute
      ? this.hass.formatEntityAttributeValue(this.hass.states[entity], indicator.attribute)
      : this.hass.formatEntityState(this.hass.states[entity]);
    const visibility = indicator.visibility ? this._singleTemplateResults.visibility?.result : true;
    const color = indicator.color ? this._singleTemplateResults.color?.result : '';

    return html`
      <div class="item" ?hidden=${Boolean(visibility) === false}>
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${entity ? this.hass.states[entity] : undefined}
          .icon=${icon}
          style=${color ? `color: ${color}` : ''}
        ></ha-state-icon>
        <div><span>${state}</span></div>
      </div>
    `;
  }
}
