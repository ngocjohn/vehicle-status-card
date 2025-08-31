import { LitElement, html, TemplateResult, CSSResultGroup, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { fireEvent } from '../../ha';
import { ICON } from '../mdi-icons';

declare global {
  interface HASSDomEvents {
    'go-back': undefined;
    'secondary-action': undefined;
    'primary-action': undefined;
  }
}

export const createSecondaryCodeLabel = (yamlMode: boolean): TemplateResult => {
  const icon = yamlMode ? ICON.LIST_BOX_OUTLINE : ICON.CODE_JSON;
  const label = yamlMode ? 'Show UI editor' : 'Edit YAML';
  return html`
    <ha-button size="small" variant="neutral" appearance="filled">
      <ha-svg-icon slot="end" .path=${icon}></ha-svg-icon>
      ${label}
    </ha-button>
  `;
};

@customElement('sub-editor-header')
export class SubEditorHeader extends LitElement {
  @property({ type: Boolean, attribute: 'hide-primary', reflect: true }) public hidePrimaryAction = false;
  @property({ type: Boolean, attribute: 'hide-secondary', reflect: true }) public hideSecondaryAction = false;
  @property({ attribute: false }) public secondaryAction?: TemplateResult;
  @property({ attribute: false }) public thirdAction?: TemplateResult;

  @property() public defaultAction?: string;
  @property() public primaryIcon?: string;
  @property() public _label?: string;
  @property() public secondary?: string;
  @property() public _secondaryLabel?: string;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <slot name="primary-action">
          ${this.hidePrimaryAction
            ? nothing
            : html`
                <div class="back-title">
                  <ha-icon-button
                    .path=${this.primaryIcon || ICON.CHEVRON_LEFT}
                    @click=${this._handlePrimaryAction}
                  ></ha-icon-button>
                  <slot name="title">
                    ${this._label
                      ? html` <div class="title">
                          <span class="primary">${this._label}</span>
                          ${this.secondary ? html`<span class="secondary">${this.secondary}</span>` : nothing}
                        </div>`
                      : nothing}
                  </slot>
                </div>
              `}
        </slot>
        <slot name="secondary-action">
          ${this.hideSecondaryAction
            ? nothing
            : html`
                ${this.thirdAction ? this.thirdAction : nothing}
                <span @click=${this._handleSecondaryAction}>
                  ${this.secondaryAction
                    ? this.secondaryAction
                    : html`
                        <ha-button size="small" variant="neutral" appearance="filled">
                          ${this._secondaryLabel}
                        </ha-button>
                      `}
                </span>
              `}
        </slot>
      </div>
    `;
  }

  private _handlePrimaryAction(): void {
    fireEvent(this, 'primary-action');
  }

  private _handleSecondaryAction(): void {
    fireEvent(this, 'secondary-action');
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        overflow: hidden;
        min-height: 42px;
        margin-bottom: auto;
        place-content: center;
      }
      :host([hide-primary]) .header {
        justify-content: flex-end;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-block-end: 8px;
      }
      .back-title {
        display: flex;
        align-items: center;
        margin-inline-end: auto;
      }
      ha-icon-button {
        --mdc-icon-button-size: 36px;
        margin-inline-end: 0.5em;
      }
      ::slotted([slot='primary-action']) {
        margin-inline-end: auto;
      }

      ::slotted([slot='secondary-action']) {
        flex-shrink: 0;
      }
      .title,
      ::slotted([slot='title']) {
        flex: 1;
        overflow-wrap: anywhere;
        /* line-height: 36px; */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
      }
      .primary {
        font-size: var(--ha-font-size-l);
        color: var(--primary-text-color);
        font-weight: 500;
        line-height: 1.2;
      }
      .secondary {
        display: block;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-m);
        line-height: 1.2;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-editor-header': SubEditorHeader;
  }
}
