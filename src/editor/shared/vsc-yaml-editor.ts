import { LitElement, html, TemplateResult, PropertyValues, css, nothing, CSSResultGroup } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { fireEvent } from '../../ha';
import { BaseEditor } from '../base-editor';

declare global {
  interface HASSDomEvents {
    'yaml-value-changed': { value: any };
    'yaml-editor-closed': undefined;
  }
}

const YAML_ACTION_STYLE = css`
  .card-actions {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
  }
`.toString();

@customElement('vsc-yaml-editor')
export class VscYamlEditor extends BaseEditor {
  @property({ attribute: false }) public configDefault: any;
  @property({ type: Boolean, attribute: 'has-extra-actions' })
  public extraAction = false;
  @property() _yamlChanged!: (ev: CustomEvent) => void;

  @query('ha-yaml-editor', true) private _yamlEditor?: LitElement;

  protected async firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    await this.updateComplete;
    this._changeStyle();
  }
  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._hass) {
      return nothing;
    }
    return html` <ha-yaml-editor
      .hass=${this._hass}
      .defaultValue=${this.configDefault}
      .copyClipboard=${true}
      @value-changed=${this._yamlChanged || this._onChange}
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
    fireEvent(this, 'yaml-editor-closed');
  }

  private _changeStyle(): void {
    if (this._yamlEditor) {
      console.debug('Change style of ha-yaml-editor actions');
      this._stylesManager.addStyle([YAML_ACTION_STYLE], this._yamlEditor.shadowRoot!);
    }
  }
  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --code-mirror-max-height: 400px;
      }
      ha-yaml-editor div.card-actions {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
    `;
  }
}
