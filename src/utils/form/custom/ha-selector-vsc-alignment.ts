import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { fireEvent, HomeAssistant } from '../../../ha';
import '../../editor/alignment-selector';

export interface VscAlignmentSelector {
  vsc_alignment: {};
}

@customElement('ha-selector-vsc_alignment')
export class HaVscAlignmentSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public selector!: VscAlignmentSelector;

  @property() public value?: string;
  @property() public label?: string;

  protected render() {
    return html`
      <vsc-alignment-selector
        .hass=${this.hass}
        .label=${this.label}
        .value=${this.value}
        @value-changed=${this._valueChanged}
      ></vsc-alignment-selector>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, 'value-changed', { value: ev.detail.value || undefined });
  }
}
