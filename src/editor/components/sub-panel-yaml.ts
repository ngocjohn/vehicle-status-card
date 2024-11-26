/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent } from 'custom-card-helpers';
// Lit
import { LitElement, html, CSSResultGroup, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// local
import { HA as HomeAssistant, VehicleStatusCardConfig } from '../../types';
import { VehicleStatusCardEditor } from '../editor';

// styles
import editorcss from '../../css/editor.css';

@customElement('vsc-sub-panel-yaml')
export class SubPanelYaml extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: VehicleStatusCardConfig;
  @property({ attribute: false }) cardEditor!: VehicleStatusCardEditor;

  @property({ type: Object }) buttonConfig: any = {};
  @state() buttonIndex!: number;

  static get styles(): CSSResultGroup {
    return editorcss;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }

  protected render() {
    if (!this.hass || !this.config) {
      return nothing;
    }
    this.buttonConfig = this.config.button_card[this.buttonIndex];
    return html`
      <div class="card-config">
        <ha-yaml-editor
          .hass=${this.hass}
          .defaultValue=${this.buttonConfig}
          .copyClipboard=${true}
          @value-changed=${this._handleYamlChange}
        ></ha-yaml-editor>
      </div>
    `;
  }

  private _handleYamlChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const isValid = ev.detail.isValid;
    const newConfig = ev.detail.value;
    if (!this.config || !isValid) {
      return;
    }
    let buttonCardConfig = [...(this.config.button_card || [])];
    let buttonConfig = { ...buttonCardConfig[this.buttonIndex] };
    console.log('buttonConfig', buttonConfig);
    buttonConfig = { ...buttonConfig, ...newConfig };
    console.log('newConfig', newConfig);
    buttonCardConfig[this.buttonIndex] = buttonConfig;
    console.log('buttonCardConfig', buttonCardConfig);
    fireEvent(this, 'config-changed', { config: { ...this.config, button_card: buttonCardConfig } });
  }
}
