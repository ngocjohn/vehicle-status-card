import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { html, css, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { RenderTemplateResult, hasTemplate, subscribeRenderTemplate } from '../../ha/data/ws-templates';
import { TireAdditionalEntityConfig, TireEntityConfig, TireTemplateEntities } from '../../types/config';
import { BaseElement } from '../../utils/base-element';

const TEMPLATE_KEYS = ['color'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-tire-item')
export class VscTireItem extends BaseElement {
  @property({ type: String }) public configKey!: keyof TireTemplateEntities;
  @property({ attribute: false }) public _tireItem!: TireEntityConfig;

  @state() protected _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() protected _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  constructor() {
    super();
    this._templateResults = {};
    this._unsubRenderTemplates = new Map();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private async _tryConnect(): Promise<void> {
    if (!this._tireItem) {
      return;
    }

    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this._hass || !hasTemplate(this._tireItem[key])) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this._hass.connection,
        (result) => {
          this._templateResults = { ...this._templateResults, [key]: result };
        },
        {
          template: this._tireItem[key] ?? '',
          variables: {
            user: this.hass.user!.name,
            config: this._tireItem,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
      const result = {
        result: this._tireItem[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = { ...this._templateResults, [key]: result };
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

  private _getTemplateResult(key: TemplateKey): string | undefined {
    return this._templateResults[key]?.result || this._tireItem?.[key] || undefined;
  }

  private getValue(type: 'state' | 'name' | 'color'): string {
    const config = this._tireItem;
    const entity = config?.entity || '';
    const stateObj = this._hass?.states[entity];

    switch (type) {
      case 'state':
        if (!stateObj) {
          return 'N/A';
        }
        const state = config?.attribute
          ? this._hass?.formatEntityAttributeValue(stateObj, config.attribute)
          : this.hass?.formatEntityState(stateObj);
        return state || 'N/A';
      case 'name':
        return config?.name || this.configKey.replace(/_/g, ' ');
      case 'color':
        return this._getTemplateResult('color') || '';
    }
  }

  protected render(): TemplateResult {
    const state = this.getValue('state');
    const name = this.getValue('name');
    const color = this.getValue('color') || 'var(--primary-text-color)';
    const additionalEntities = this._tireItem?.additional_entities || [];
    return html`
      <div class="tire-container">
        <div class="tire-value" style=${`color: ${color};`}>${state}</div>
        ${additionalEntities.length > 0
          ? additionalEntities.map((entityConfig) => this._renderAdditionalEntity(entityConfig))
          : nothing}
        <div class="tire-name">${name}</div>
      </div>
    `;
  }

  private _renderAdditionalEntity(entityConfig: TireAdditionalEntityConfig): TemplateResult {
    const entityStateObj = this._hass.states[entityConfig.entity];
    return html`
      <div class="tire-additional-content">
        ${entityConfig.prefix ?? ''}
        ${!entityStateObj
          ? 'N/A'
          : html`
              <vsc-state-display .stateObj=${entityStateObj} .hass=${this._hass} .content=${entityConfig.state_content}>
              </vsc-state-display>
            `}
        ${entityConfig.suffix ?? ''}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        .tire-container {
          width: inherit;
          height: inherit;
          display: flex;
          flex-direction: column;
          justify-content: center;
          /* gap: 0.5rem; */
          /* text-shadow: rgba(255, 255, 255, 0.3) 0px 1px 0px; */
          transition: 400ms cubic-bezier(0.3, 0, 0.8, 0.15);
          align-items: anchor-center;
        }

        .tire-value {
          color: var(--primary-text-color);
          font-size: 1.5rem;
          margin: 0;
          white-space: nowrap;
          line-height: 1.2;
        }
        .tire-additional-content {
          color: var(--secondary-text-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          gap: 4px;
        }

        .tire-name {
          color: var(--secondary-text-color);
          margin: 0;
          text-transform: uppercase;
          white-space: nowrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-tire-item': VscTireItem;
  }
}
