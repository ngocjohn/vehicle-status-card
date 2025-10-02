import type { TemplateResult } from 'lit';

import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('vsc-btn-badge')
export class VscBtnBadge extends LitElement {
  @property({ type: Boolean, reflect: true, attribute: 'text-badge' }) public isText = false;
  protected render(): TemplateResult {
    return html`<div class="badge"><slot></slot></div>`;
  }

  static styles = css`
    :host {
      --vsc-btn-badge-background-color: var(--primary-color);
      --vsc-btn-badge-color: var(--white-color);
      --mdc-icon-size: 12px;
    }
    :host([text-badge]) .badge {
      width: fit-content;
      padding-inline: 4px;
      font-size: 12px;
    }
    .badge {
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background-color: var(--vsc-btn-badge-background-color);
      transition: background-color 280ms ease-in-out;
    }
    .badge ::slotted(*) {
      color: var(--vsc-btn-badge-color);
    }
  `;
}
