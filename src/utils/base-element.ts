import { CSSResultGroup, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import cardstyles from '../css/card.css';
import { Store } from './store';

export class BaseElement extends LitElement {
  @property({ attribute: false }) protected _store!: Store;

  constructor() {
    super();
  }

  static get styles(): CSSResultGroup {
    return [cardstyles];
  }
}
