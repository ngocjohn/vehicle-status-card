import { LitElement, html, TemplateResult, PropertyValues, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { fireEvent, HomeAssistant } from '../../ha';

declare global {
  interface HASSDomEvents {
    'yaml-value-changed': { value: any };
    'yaml-editor-closed': undefined;
  }
}

@customElement('vsc-yaml-editor')
export class VscYamlEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public configDefault: any;
  @property({ type: Boolean, attribute: 'has-extra-actions' })
  public extraAction = false;

  @query('ha-yaml-editor', true) private _yamlEditor?: LitElement;

  static get styles() {
    return css`
      :host {
        display: block;
      }
      ha-yaml-editor > div.card-actions {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
    `;
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    await this.updateComplete;
    this._changeStyle();
  }
  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass) return nothing;

    return html` <ha-yaml-editor
      .hass=${this.hass}
      .defaultValue=${this.configDefault}
      .copyClipboard=${true}
      @value-changed=${this._onChange}
      .hasExtraActions=${this.extraAction}
    >
      ${this.extraAction
        ? html`<ha-button
            size="medium"
            variant="warning"
            appearance="plain"
            slot="extra-actions"
            @click=${this._closeEditor}
            >Close Editor</ha-button
          > `
        : nothing}
    </ha-yaml-editor>`;
  }

  private _onChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    if (isValid) {
      fireEvent(this, 'yaml-value-changed', value);
    }
  }

  private _closeEditor(): void {
    fireEvent(this, 'yaml-editor-closed', undefined);
  }

  private _changeStyle(): void {
    if (this._yamlEditor) {
      console.debug('Change style of ha-yaml-editor actions');
      // Change style of actions
      // Make space between actions and align center
      const actions = this._yamlEditor.shadowRoot?.querySelector('.card-actions') as HTMLElement;
      if (actions) {
        actions.style.display = 'flex';
        actions.style.justifyContent = 'space-between';
        actions.style.alignItems = 'center';
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-yaml-editor': VscYamlEditor;
  }
}
