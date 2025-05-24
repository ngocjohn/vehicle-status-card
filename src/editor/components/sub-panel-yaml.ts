import { LitElement, html, CSSResultGroup, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// styles
import editorcss from '../../css/editor.css';
// local
import { HomeAssistant, VehicleStatusCardConfig } from '../../types';
import { VehicleStatusCardEditor } from '../editor';

@customElement('vsc-sub-panel-yaml')
export class SubPanelYaml extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: VehicleStatusCardConfig;
  @property({ attribute: false }) cardEditor!: VehicleStatusCardEditor;
  @property({ attribute: false }) configDefault: any;
  @state() configIndex?: number;
  @state() configKey?: string;

  @property({ attribute: 'has-extra-actions', type: Boolean })
  public extraAction = false;

  public static get styles(): CSSResultGroup {
    return [editorcss];
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="card-config">
        <ha-yaml-editor
          .hass=${this.hass}
          .defaultValue=${this.configDefault}
          .copyClipboard=${true}
          @value-changed=${this._onChange}
          .hasExtraActions=${this.extraAction}
          .configValue=${'button_card'}
        >
          ${this.extraAction
            ? html`<ha-button style="float: inline-end;" slot="extra-actions" @click=${this._closeEditor}
                >Close Editor</ha-button
              >`
            : nothing}
        </ha-yaml-editor>
      </div>
    `;
  }

  private _onChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const detail = ev.detail;
    const event = new CustomEvent('yaml-config-changed', {
      detail: {
        ...detail,
        key: this.configKey,
        index: this.configIndex,
      },
      composed: true,
      bubbles: true,
    });

    this.dispatchEvent(event);
  }

  private _closeEditor(): void {
    const event = new CustomEvent('close-editor');
    this.dispatchEvent(event);
  }
}
