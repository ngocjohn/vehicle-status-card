import { CSSResultGroup, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import cardstyles from '../css/card.css';
import * as SensorUtils from '../ha/data/sensor';
import { Store } from './store';

export class BaseElement extends LitElement {
  @property({ attribute: false }) protected _store!: Store;

  protected _sensorUtils = SensorUtils;

  constructor() {
    super();
  }

  static get styles(): CSSResultGroup {
    return [cardstyles];
  }
}
