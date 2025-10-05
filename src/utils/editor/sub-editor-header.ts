import { LitElement, html, TemplateResult, CSSResultGroup, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { BaseEditor } from '../../editor/base-editor';
import { fireEvent } from '../../ha';
import { ICON } from '../mdi-icons';

declare global {
  interface HASSDomEvents {
    'go-back': undefined;
    'secondary-action': undefined;
    'primary-action': undefined;
    'third-action': undefined;
    'left-btn': undefined;
  }
}

const PrimaryActionTypes = ['back', 'close'] as const;
type PrimaryActionTypes = (typeof PrimaryActionTypes)[number];

const PRIMARY_ICON: Record<PrimaryActionTypes | string, string> = {
  back: ICON.CHEVRON_LEFT,
  close: ICON.CLOSE,
};

export const createSecondaryCodeLabel = (yamlMode: boolean): TemplateResult => {
  // const label = yamlMode ? 'Close code editor' : 'Edit YAML';
  const variant = yamlMode ? 'warning' : 'neutral';
  const icon = yamlMode ? 'mdi:table-edit' : 'mdi:code-json';
  return html`
    <ha-button size="small" variant=${variant} appearance="filled"><ha-icon .icon=${icon}></ha-icon></ha-button>
  `;
};

export const createThirdActionBtn = (previewActive: boolean): TemplateResult => {
  const label = previewActive ? 'CLOSE PREVIEW' : 'PREVIEW';
  const variant = previewActive ? 'warning' : 'neutral';
  return html` <ha-button size="small" variant=${variant} appearance="plain"> ${label} </ha-button> `;
};

export const createAddBtnLabel = (label = 'Add'): TemplateResult => {
  return html`
    <ha-button size="small" appearance="filled">
      <ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon>
      ${label}
    </ha-button>
  `;
};

@customElement('sub-editor-header')
export class SubEditorHeader extends LitElement {
  @property({ type: Boolean, attribute: 'hide-primary', reflect: true }) public hidePrimaryAction = false;
  @property({ type: Boolean, attribute: 'hide-secondary', reflect: true }) public hideSecondaryAction = false;
  @property({ type: Boolean, attribute: 'left-btn', reflect: true }) public leftBtn = false;
  @property({ type: Boolean, attribute: 'hide-primary-icon', reflect: true }) public hidePrimaryIcon = false;

  @property({ attribute: false }) public secondaryAction?: TemplateResult;
  @property({ attribute: false }) public thirdAction?: TemplateResult;
  @property({ attribute: false }) public extraActions?: TemplateResult;

  @property({ attribute: false }) public primaryIcon: string | PrimaryActionTypes = 'back';

  @property() public defaultAction?: string;
  @property() public _label?: string;
  @property() public secondary?: string;
  @property() public _secondaryLabel?: string;
  @property() public _addBtnLabel?: string;
  protected render(): TemplateResult {
    const primaryIcon = PRIMARY_ICON[this.primaryIcon] || this.primaryIcon;
    return html`
      <div class="header">
        <div class="primary-action">
          <slot name="primary-action">
            ${this.leftBtn
              ? html`<span @click=${this._handleLeftBtn}> ${createAddBtnLabel(this._addBtnLabel)} </span>`
              : nothing}
            ${this.hidePrimaryAction
              ? nothing
              : html`
                  <div class="back-title">
                    ${this.hidePrimaryIcon
                      ? nothing
                      : html`
                          <ha-icon-button .path=${primaryIcon} @click=${this._handlePrimaryAction}></ha-icon-button>
                        `}

                    <slot name="title">
                      ${this._label || this.secondary
                        ? html`<div class="title">
                            ${this._label ? html`<span class="primary">${this._label}</span>` : nothing}
                            ${this.secondary ? html`<span class="secondary">${this.secondary}</span>` : nothing}
                          </div>`
                        : nothing}
                    </slot>
                  </div>
                `}
          </slot>
        </div>
        <div class="secondary-action">
          <slot name="secondary-action">
            ${this.extraActions ? this.extraActions : nothing}
            ${this.hideSecondaryAction
              ? nothing
              : html`
                  ${this.thirdAction
                    ? html` <span @click=${this._handleThirdAction}> ${this.thirdAction} </span> `
                    : nothing}
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
      </div>
    `;
  }

  private _handlePrimaryAction(): void {
    fireEvent(this, 'primary-action');
  }

  private _handleSecondaryAction(): void {
    fireEvent(this, 'secondary-action');
  }
  private _handleThirdAction(): void {
    fireEvent(this, 'third-action');
  }

  private _handleLeftBtn(): void {
    fireEvent(this, 'left-btn');
  }

  static get styles(): CSSResultGroup {
    return [
      BaseEditor.styles,
      css`
        :host {
          display: block;
          overflow: hidden;
          min-height: 42px;
          margin-bottom: auto;
          place-content: center;
        }
        /* :host([hide-primary]):not([left-btn]) .header {
          justify-content: flex-end;
        } */

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-block-end: 8px;
        }
        .primary-action,
        .secondary-action {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .primary-action {
          flex: auto;
          margin-inline-end: auto;
        }

        .secondary-action {
          max-width: fit-content;
          justify-content: flex-end;
          flex: 0 1 auto;
          flex-wrap: wrap;
        }
        .back-title {
          display: flex;
          align-items: center;
          margin-inline-end: auto;
        }
        .back-title > ha-icon-button {
          color: var(--secondary-text-color);
        }

        ha-icon-button {
          --mdc-icon-button-size: 36px;
          margin-inline-end: 0.5em;
        }
        ::slotted([slot='primary-action']) {
          margin-inline-end: auto;
        }

        ::slotted([slot='secondary-action']) {
          margin-inline-start: auto;
        }

        ha-icon-button[active],
        ha-icon-button:hover {
          color: var(--primary-color);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-editor-header': SubEditorHeader;
  }
}
