import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators';

// Local
import { HA as HomeAssistant } from '../types';
import { VehicleStatusCard } from '../vehicle-status-card';

// Styles
import cardstyles from '../css/card.css';
import { RenderTemplateResult, subscribeRenderTemplate } from '../utils/ws-templates';

type DefaultCardItem = {
  name: string;
  entity: string;
  icon: string;
  state: string;
};

@customElement('vsc-default-card')
export class VehicleDefaultCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public _card!: VehicleStatusCard;
  @property({ attribute: false }) public defaultCardItem: DefaultCardItem | null = null;

  @state() private _defaultCardItemsTemplate: Record<'state', RenderTemplateResult | undefined> = { state: undefined };
  @state() private _unsubRenderTemplate: Map<'state', Promise<UnsubscribeFunc>> = new Map();

  static get styles(): CSSResultGroup {
    return cardstyles;
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // console.log('defaultcarditem', this.defaultCardItem);
    this._tryConnect();
  }
  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('defaultCardItem') && this.defaultCardItem) {
      // Disconnect the old subscription before subscribing to the new one
      this._tryDisconnect().then(() => {
        if (this.defaultCardItem) {
          this._tryConnect();
        }
      });
    }
  }

  private isTemplate(state: string): boolean {
    return state.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    if (!this.defaultCardItem) {
      return;
    }
    const state = this.defaultCardItem.state;
    if (!this.isTemplate(state)) {
      return;
    }

    try {
      // Subscribe to the template and listen for updates
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          // Update the state and trigger re-render
          this._defaultCardItemsTemplate = {
            ...this._defaultCardItemsTemplate,
            state: result,
          };
        },
        { template: state }
      );

      this._unsubRenderTemplate.set('state', sub);
      await sub; // Ensure subscription completes
    } catch (e) {
      // Fallback for errors
      this._defaultCardItemsTemplate.state = {
        result: state,
        listeners: { all: false, domains: [], entities: [], time: false },
      };
      this._unsubRenderTemplate.delete('state');
    }
  }

  private async _tryDisconnect(): Promise<void> {
    const unsub = this._unsubRenderTemplate.get('state');
    if (unsub) {
      await unsub.then((unsubFunc) => unsubFunc());
      this._unsubRenderTemplate.delete('state');
    }
  }

  protected render(): TemplateResult {
    if (!this.defaultCardItem) {
      return html``;
    }
    const name = this.defaultCardItem.name;
    const entity = this.defaultCardItem.entity;
    const icon = this.defaultCardItem.icon;

    // Fallback to default state if template state isn't available yet
    const state = !this.isTemplate(this.defaultCardItem.state)
      ? this.defaultCardItem.state
      : this._defaultCardItemsTemplate.state?.result;

    return html`
      <div class="data-row">
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
