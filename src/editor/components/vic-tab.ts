import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import type { TemplateResult } from 'lit';

@customElement('vic-tab')
export class VicTab extends LitElement {
  @property({ type: Boolean, reflect: true }) public active = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property() public name?: string;

  protected render(): TemplateResult {
    return html`
      <div
        tabindex="0"
        role="tab"
        aria-selected=${this.active}
        aria-label=${ifDefined(this.name)}
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}
      >
        ${this.narrow ? html`<slot name="icon"></slot>` : ''}
        <span class="name">${this.name}</span>
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _handleClick(): void {
    this.dispatchEvent(new CustomEvent('tab-activated', { bubbles: true, composed: true }));
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      this._handleClick();
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex: 0 0 auto;
    }
    div {
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      text-align: center;
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 49px;
      cursor: pointer;
      position: relative;
      outline: none;
    }

    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      text-transform: uppercase;
    }

    :host([active]) {
      color: var(--primary-color);
    }

    :host(:not([narrow])[active]) div {
      border-bottom: 2px solid var(--primary-color);
    }

    :host([narrow]) {
      min-width: 0;
      display: flex;
      justify-content: center;
      overflow: hidden;
    }

    :host([narrow]) div {
      padding: 0 4px;
    }

    div:focus-visible:before {
      position: absolute;
      display: block;
      content: '';
      inset: 0;
      background-color: var(--secondary-text-color);
      opacity: 0.08;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    'vic-tab': VicTab;
  }
}
