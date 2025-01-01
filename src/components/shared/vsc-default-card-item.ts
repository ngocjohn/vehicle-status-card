import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// Styles
import cardstyles from '../../css/card.css';
// Local
import { CardItemConfig, HomeAssistant } from '../../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../types';
import { VehicleStatusCard } from '../../vehicle-status-card';

const TEMPLATE_KEY = ['state_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEY)[number];

@customElement('vsc-default-card-item')
export class VehicleDefaultCardItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public _card!: VehicleStatusCard;
  @property({ attribute: false }) public defaultCardItem!: CardItemConfig;
  @property({ type: Boolean }) lastItem = false;

  @state() private _defaultCardItemsTemplate: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubRenderTemplate: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [
      css`
        .data-row {
          display: flex;
          justify-content: space-between;
          padding: var(--vic-gutter-gap);
          border-bottom: 1px solid #444;
          overflow: hidden;
        }

        .data-row .data-value-unit {
          cursor: pointer;
          text-align: end;
          white-space: nowrap;
        }

        .data-row .data-label {
          height: auto;
          display: inline-block;
          align-items: flex-end;
          margin-inline-start: 8px;
          text-transform: none;
        }

        .data-row div {
          display: flex;
          align-items: center;
          gap: var(--vic-gutter-gap);
        }

        .data-icon {
          color: var(--secondary-text-color);
        }
        .data-row[last-item] {
          border-bottom: none;
          padding-bottom: 0;
        }
      `,
      cardstyles,
    ];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    this._tryDisconnect();
    super.disconnectedCallback();
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
  }

  private isTemplate(key: TemplateKey): boolean {
    const value = this.defaultCardItem[key];
    return value?.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEY.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubRenderTemplate.get(key) !== undefined || !this.hass || !this.isTemplate(key)) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._defaultCardItemsTemplate = {
            ...this._defaultCardItemsTemplate,
            [key]: result,
          };
        },
        {
          template: this.defaultCardItem[key] ?? '',
          variables: {
            entity: this.defaultCardItem.entity,
            config: this.defaultCardItem,
            user: this.hass.user!.name,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplate.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: this.defaultCardItem[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._defaultCardItemsTemplate = {
        ...this._defaultCardItemsTemplate,
        [key]: result,
      };
      this._unsubRenderTemplate.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEY.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplate.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplate.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  protected render(): TemplateResult {
    if (!this.defaultCardItem) {
      return html``;
    }

    const item = this.defaultCardItem;

    const name = item.name || this.hass.states[item.entity].attributes.friendly_name;
    const entity = item.entity;
    const icon = item.icon;

    // Fallback to default state if template state isn't available yet
    const state = item.state_template
      ? this._defaultCardItemsTemplate.state_template?.result || item.state_template
      : item.attribute && item.entity
      ? this.hass.formatEntityAttributeValue(this.hass.states[entity], item.attribute)
      : this.hass.formatEntityState(this.hass.states[entity]);

    return html`
      <div class="data-row" ?last-item=${this.lastItem}>
        <div>
          <ha-state-icon
            class="data-icon"
            @click=${() => this._card.toggleMoreInfo(entity)}
            .hass=${this.hass}
            .icon=${icon}
            .stateObj=${this.hass.states[entity]}
          ></ha-state-icon>
          <span>${name}</span>
        </div>
        <div class="data-value-unit" @click=${() => this._card.toggleMoreInfo(entity)}>
          <span>${state}</span>
        </div>
      </div>
    `;
  }
}
