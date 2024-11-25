// Lit
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
// Home Assistant
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
// Utils
import { HA as HomeAssistant, IndicatorGroupItemConfig } from '../../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../utils/ws-templates';

// CSS
import cardcss from '../../css/card.css';

const TEMPLATE_KEYS = ['state_template', 'icon_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-indicator-group-item')
export class VscIndicatorGroupItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) item!: IndicatorGroupItemConfig;

  @state() private _itemTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubItemRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [
      cardcss,
      css`
        .item {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          flex-direction: column;
          gap: initial;
          width: max-content;
        }

        .icon-state {
          display: flex;
          height: auto;
          align-items: flex-end;
          gap: 0.4rem;
        }

        .item-name {
          color: var(--secondary-text-color);
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
    if (this._unsubItemRenderTemplates.get(key) !== undefined || !this.hass || !this.isTemplate(this.item[key])) return;

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._itemTemplateResults = {
            ...this._itemTemplateResults,
            [key]: result,
          };
        },
        {
          template: this.item[key] ?? '',
        }
      );
      this._unsubItemRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      const result = {
        result: this.item[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._itemTemplateResults = {
        ...this._itemTemplateResults,
        [key]: result,
      };
      this._unsubItemRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._unsubscribeRenderTemplate(key);
    });
  }

  private async _unsubscribeRenderTemplate(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubItemRenderTemplates.get(key);
    if (!unsubRenderTemplate) return;

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
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
    const item = this.item;
    const name = item.name;
    const entity = item.entity;
    const icon = item.icon_template ? this._itemTemplateResults.icon_template?.result : item.icon ? item.icon : '';
    const state = item.state_template
      ? this._itemTemplateResults.state_template?.result
      : item.attribute
      ? this.hass.formatEntityAttributeValue(this.hass.states[entity], item.attribute)
      : this.hass.formatEntityState(this.hass.states[entity]);

    return html`
      <div class="item charge">
        <div class="icon-state">
          <ha-state-icon .hass=${this.hass} .stateObj=${this.hass.states[entity]} .icon=${icon}></ha-state-icon>
          <span>${state}</span>
        </div>
        <div class="item-name">
          <span>${name}</span>
        </div>
      </div>
    `;
  }
}
