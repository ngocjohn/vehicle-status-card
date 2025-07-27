// Home Assistant
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
// Lit
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

// CSS
import cardcss from '../../css/card.css';
// Utils
import { hasTemplate, HomeAssistant, RenderTemplateResult, subscribeRenderTemplate } from '../../ha';
import { hasItemAction, IndicatorItemConfig } from '../../types/config';
import { addActions } from '../../utils/lovelace/tap-action';

const TEMPLATE_KEYS = ['state_template', 'icon_template', 'color'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-indicator-group-item')
export class VscIndicatorGroupItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) item!: IndicatorItemConfig;

  @state() private _itemTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubItemRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [
      cardcss,
      css`
        .item {
          display: flex;
          align-items: center;
          flex-flow: column wrap;
          gap: initial;
          width: max-content;
          height: 100%;
          justify-content: space-between;
        }

        .icon-state {
          display: flex;
          height: auto;
          align-items: center;
          gap: 0.4rem;
        }
        .icon-state span {
          line-height: 100%;
          /* text-shadow: 0px 2px rgba(0, 0, 0, 0.4); */
        }
        .icon-state > state-badge {
          --mdc-icon-size: 20px !important;
          max-width: 24px;
          max-height: 24px;
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

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
    this._setEventListeners();
  }

  public _setEventListeners(): void {
    const actionConfig = this.item.action_config ?? {};
    if (hasItemAction(actionConfig)) {
      const config = { ...actionConfig, entity: this.item.entity };
      const actionEl = this.shadowRoot?.getElementById('group-item-action') as HTMLElement;
      addActions(actionEl, config);
    }
  }

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubItemRenderTemplates.get(key) !== undefined || !this.hass || !hasTemplate(this.item[key])) return;

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
          variables: {
            config: this.item,
            user: this.hass.user!.name,
          },
          strict: true,
        }
      );
      this._unsubItemRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
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
      : this.hass.states[entity] !== undefined
      ? this.hass.formatEntityState(this.hass.states[entity])
      : '';
    const color = item.color ? this._itemTemplateResults.color?.result || item.color : 'var(--secondary-text-color)';
    const stateColor = item.state_color ?? false;

    return html`
      <div class="item charge" id="group-item-action">
        <div class="icon-state">
          <state-badge
            .hass=${this.hass}
            .stateObj=${this.hass.states[entity]}
            .stateColor=${stateColor}
            .overrideIcon=${icon}
            style=${!stateColor ? `color: ${color}` : ''}
          ></state-badge>
          <span>${state}</span>
        </div>
        <div class="item-name">
          <span>${name}</span>
        </div>
      </div>
    `;
  }
}
