import { html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { fireEvent, HomeAssistant, LovelaceCard, LovelaceCardConfig } from '../../ha';
import { createThing } from '../../ha/panels/lovelace/create-thing';

let helpers = (window as any).cardHelpers;
const helperPromise = new Promise<void>(async (resolve) => {
  if (helpers) resolve();
  if ((window as any).loadCardHelpers) {
    helpers = await (window as any).loadCardHelpers();
    (window as any).cardHelpers = helpers;
    resolve();
  }
});

@customElement('vsc-custom-card-element')
export class VscCustomCardElement extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config?: LovelaceCardConfig;

  @state() private _element?: LovelaceCard;

  connectedCallback(): void {
    super.connectedCallback();
    console.debug('custom-card', this._config?.type);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._element && this._config && this.hass) {
      const element = this._createCard(this._config);
      if (element) {
        element.hass = this.hass;
        this._element = element;
      }
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (this._element && this.hass && _changedProperties.has('hass')) {
      this._element.hass = this.hass;
    }
  }

  private _createCard(config: any): any {
    if (helpers) {
      console.debug('helpers available, using helpers to create card');
      return helpers.createCardElement(config);
    } else {
      const element = createThing(config);
      helperPromise.then(() => {
        fireEvent(this, 'll-rebuild', {});
      });
      return element;
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) {
      return nothing;
    }

    return html`${this._element}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-custom-card-element': VscCustomCardElement;
  }
}
