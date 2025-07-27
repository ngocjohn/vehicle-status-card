import { CSSResultGroup, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import cardstyles from '../css/card.css';
import { HomeAssistant } from '../ha';
import { VehicleStatusCardConfig } from '../types/config';

export class BaseElement extends LitElement {
  private _hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: VehicleStatusCardConfig;

  @property({ attribute: false })
  get hass(): HomeAssistant {
    return this._hass;
  }

  set hass(value: HomeAssistant) {
    this._hass = value;
    // Optional: trigger effects, like re-render or reactivity
  }

  static get styles(): CSSResultGroup {
    return [cardstyles];
  }
}
