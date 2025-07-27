import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// Local
import { RenderTemplateResult, subscribeRenderTemplate, fireEvent } from '../../ha';
import { computeEntityName } from '../../ha';
import { CardItemConfig } from '../../types/config';
import { BaseElement } from '../../utils/base-element';

const TEMPLATE_KEY = ['state_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEY)[number];

type TemplateResults = Partial<Record<TemplateKey, RenderTemplateResult | undefined>>;

@customElement('vsc-default-card-item')
export class VehicleDefaultCardItem extends BaseElement {
  @property({ attribute: false }) private defaultCardItem!: CardItemConfig;
  @property({ attribute: false, type: Boolean }) private stateColor = false;

  @state() private _templateResults?: TemplateResults;
  @state() private _unsubRenderTemplate: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .data-row {
          display: flex;
          justify-content: space-between;
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
          width: 24px;
          height: 24px;
          cursor: pointer;
        }
      `,
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
  }

  private isTemplate(key: TemplateKey) {
    const value = this.defaultCardItem?.[key];
    return value?.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEY.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (
      this._unsubRenderTemplate.get(key) !== undefined ||
      !this.hass ||
      !this.defaultCardItem ||
      !this.isTemplate(key)
    ) {
      return;
    }

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
      this._templateResults = {
        ...this._templateResults,
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

  protected render() {
    if (!this.defaultCardItem || !this.hass) {
      return nothing;
    }

    const item = this.defaultCardItem;

    const entity = item.entity;
    const name =
      item.name ||
      computeEntityName(this.hass.states[entity], this.hass) ||
      this.hass.formatEntityAttributeValue(this.hass.states[entity], 'friendly_name');
    const icon = item.icon;

    // Fallback to default state if template state isn't available yet
    const state = item.state_template
      ? this._templateResults?.state_template?.result
      : item.attribute && item.entity
      ? this.hass.formatEntityAttributeValue(this.hass.states[entity], item.attribute)
      : this.hass.formatEntityState(this.hass.states[entity]);

    return html`
      <div class="data-row">
        <div>
          <state-badge
            class="data-icon"
            .hass=${this.hass}
            @click=${() => this._toggleMoreInfo(entity)}
            .stateObj=${this.hass.states[entity]}
            .overrideIcon=${icon}
            .stateColor=${this.stateColor}
            style=${!this.stateColor ? `color: var(--secondary-text-color);` : ''}
          ></state-badge>

          <span>${name}</span>
        </div>
        <div class="data-value-unit" @click=${() => this._toggleMoreInfo(entity)}>
          <span>${state}</span>
        </div>
      </div>
    `;
  }

  private _toggleMoreInfo(entity: string): void {
    fireEvent(this, 'hass-more-info', {
      entityId: entity,
    });
  }
}
