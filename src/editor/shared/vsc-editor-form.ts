import { css, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';
import { BaseEditor } from '../base-editor';

@customElement('vsc-editor-form')
export class VscEditorForm extends BaseEditor {
  @property({ attribute: false }) data!: unknown;
  @property({ attribute: false }) schema!: unknown;
  @property() changed!: (ev: CustomEvent) => void;

  @query('#haForm') _haForm!: LitElement;

  protected async firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    await this.updateComplete;
    this._changeStyle();
  }

  protected render(): TemplateResult {
    return html`<ha-form
      id="haForm"
      .hass=${this._hass}
      .data=${this.data}
      .schema=${this.schema}
      .computeLabel=${this.computeLabel}
      .computeHelper=${this.computeHelper}
      @value-changed=${this.changed}
    ></ha-form>`;
  }

  private computeLabel = (schema: any): string | undefined => {
    if (schema.name === 'entity') {
      return undefined;
    }
    const label = schema.label || schema.name || schema.title || '';
    return capitalizeFirstLetter(label.trim());
  };

  private computeHelper = (schema: any): string | TemplateResult | undefined => {
    return schema.helper || undefined;
  };

  static get styles() {
    return css`
      #haForm {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        /* margin-block-end: 8px; */
      }
    `;
  }
  private _changeStyle(): void {
    if (this._haForm.shadowRoot) {
      const root = this._haForm.shadowRoot.querySelector('div.root');
      if (root) {
        const rootChildren = root.children;
        for (let i = 0; i < rootChildren.length; i++) {
          const isLast = i === rootChildren.length - 1;
          if (isLast) {
            break;
          }
          // add margin bottom to all child except the last one
          const child = rootChildren[i] as HTMLElement;
          child.style.marginBottom = '8px';
        }
      }
    }
  }
}
