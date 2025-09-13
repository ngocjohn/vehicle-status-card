import { CSSResultGroup, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import cardstyles from '../css/card.css';
import { HomeAssistant } from '../ha/types';
import { Store } from './store';

export class BaseElement extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) protected _store!: Store;

  constructor() {
    super();
  }
  connectedCallback(): void {
    super.connectedCallback();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._store && !this._store.hass) {
      this._store.hass = hass;
    }
  }
  get hass(): HomeAssistant {
    return this._hass;
  }

  static get styles(): CSSResultGroup {
    return [cardstyles];
  }
}
