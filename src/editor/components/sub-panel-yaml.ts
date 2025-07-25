import { LitElement, html, CSSResultGroup, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

// styles
import editorcss from '../../css/editor.css';
import { HomeAssistant } from '../../ha';
// local

@customElement('vsc-sub-panel-yaml')
export class SubPanelYaml extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
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
    const config = ev.detail;
    const detail = {
      ...config,
      key: this.configKey,
      index: this.configIndex,
    };
    // Dispatch a custom event with the updated configuration

    const event = new CustomEvent('yaml-config-changed', {
      detail,
      composed: true,
      bubbles: true,
    });

    this.dispatchEvent(event);
  }

  private _closeEditor(): void {
    // Dispatch a custom event to close the editor
    const event = new CustomEvent('close-editor', {
      composed: true,
      bubbles: true,
    });
    this.dispatchEvent(event);
  }
}
