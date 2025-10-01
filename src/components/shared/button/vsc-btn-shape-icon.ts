import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

@customElement('vsc-btn-shape-icon')
export class VscBtnShapeIcon extends LitElement {
  @property({ type: String }) public imageSrc?: string;
  @property({ type: Boolean }) public disabled?: boolean;
  @property({ type: Boolean, reflect: true }) public interactive = false;

  protected render(): TemplateResult {
    if (this.imageSrc) {
      return html`
        <div class="shape-icon">
          <img alt="" src=${this.imageSrc} />
        </div>
        <slot></slot>
      `;
    }
    return html`
      <div
        class=${classMap({
          'shape-icon': true,
          background: true,
          disabled: Boolean(this.disabled),
        })}
      >
        <slot name="icon"></slot>
      </div>
      <slot></slot>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        position: relative;
        user-select: none;
        transition: transform 180ms ease-in-out;
      }

      :host([interactive]:active) {
        transform: scale(1.2);
      }

      :host([interactive]:hover) {
        --shape-icon-opacity: var(--shape-hover-opacity);
        cursor: pointer;
      }

      .shape-icon {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--icon-size);
        height: var(--icon-size);
        font-size: var(--icon-size);
        border-radius: var(--icon-border-radius);
        overflow: hidden;
        transition: box-shadow 180ms ease-in-out;
      }

      :host([interactive]:focus-visible) .shape-icon {
        box-shadow: 0 0 0 2px var(--icon-color);
      }

      .shape-icon.background::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--shape-color);
        transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
        opacity: var(--shape-icon-opacity);
      }

      .shape-icon ::slotted([slot='icon']) {
        display: flex;
        color: var(--icon-color);
        transition: color 180ms ease-in-out;
        pointer-events: none;
        display: flex;
        line-height: 0;
        --mdc-icon-size: var(--icon-symbol-size);
      }

      .shape-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `;
  }
}
