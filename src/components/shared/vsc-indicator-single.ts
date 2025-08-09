// Home Assistant
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
// Lit
import { css, CSSResultGroup, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

// Utils
import { hasTemplate, HomeAssistant, RenderTemplateResult, subscribeRenderTemplate } from '../../ha';
import { hasItemAction, IndicatorItemConfig } from '../../types/config';
import { addActions } from '../../utils';
import { BaseElement } from '../../utils/base-element';

const TEMPLATE_KEYS = ['state_template', 'icon_template', 'color', 'visibility'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vsc-indicator-single')
export class VscIndicatorSingle extends BaseElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) private indicator!: IndicatorItemConfig;

  @state() _visibility: boolean = true;
  @state() private _singleTemplateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubSingleRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        /* .item {
          display: flex;
          gap: 0.4rem;
          align-items: flex-end;
        } */
        .item {
          display: flex;
          align-items: center;
          gap: initial;
          width: max-content;
          height: 100%;
          justify-content: space-between;
          line-height: 100%;
        }
        .item state-badge {
          margin-inline-end: 0.5em;
          height: 24px;
          width: 24px;
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

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubSingleRenderTemplates.get(key) !== undefined || !this.hass || !hasTemplate(this.indicator[key])) {
      return;
    }

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._singleTemplateResults = { ...this._singleTemplateResults, [key]: result };
        },
        {
          template: this.indicator[key] ?? '',
          entity_ids: this.indicator.entity ? [this.indicator.entity] : undefined,
          variables: {
            user: this.hass.user!.name,
            config: this.indicator,
          },
          strict: true,
        }
      );
      this._unsubSingleRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error while rendering template', e);
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

  private _setEventListeners(): void {
    const actionConfig = this.indicator.action_config ?? {};
    if (hasItemAction(actionConfig)) {
      const config = { ...actionConfig, entity: this.indicator.entity };
      const actionEl = this.shadowRoot?.getElementById('single-action') as HTMLElement;
      addActions(actionEl, config);
    }
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
    const color = indicator.color
      ? this._singleTemplateResults.color?.result || indicator.color
      : 'var(--secondary-text-color)';
    this._visibility = Boolean(visibility);
    const stateColor = indicator.state_color ? true : false;
    return html`
      <div class="item" ?hidden=${Boolean(visibility) === false} id="single-action">
        <state-badge
          .hass=${this.hass}
          .stateObj=${this.hass.states[entity]}
          .stateColor=${stateColor}
          .overrideIcon=${icon}
          style=${!stateColor ? `color: ${color}` : ''}
        ></state-badge>
        <span>${state}</span>
      </div>
    `;
  }
}
