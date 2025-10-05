import { css, CSSResultGroup, html, LitElement, nothing, TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import { COMPONENT } from '../../../constants/const';
import { ICON } from '../../../utils/mdi-icons';

type BadgeType = 'entity' | 'group';

@customElement(COMPONENT.INDICATOR_BADGE)
export class VscIndicatorBadge extends LitElement {
  @property({ type: String, reflect: true }) public type: BadgeType = 'entity';
  @property() public label?: string;
  @property({ attribute: false }) public buttonRole?: boolean = false;
  @property({ type: Boolean, reflect: true }) public active = false;
  @property({ type: Boolean, reflect: true }) public hidden = false;
  @property({ type: Boolean, attribute: 'icon-only' }) iconOnly = false;
  @property({ type: Boolean, attribute: 'col-reverse', reflect: true }) public colReverse = false;
  @property({ type: Boolean, attribute: 'row-reverse', reflect: true }) public rowReverse = false;

  @query('.badge', true) _badge!: HTMLElement;

  protected render(): TemplateResult {
    const label = this.label;

    return html`
      <div
        class=${classMap({
          badge: true,
          'icon-only': this.iconOnly,
          'row-reverse': this.rowReverse,
          'col-reverse': this.colReverse,
        })}
        role=${ifDefined(this.buttonRole ? 'button' : undefined)}
      >
        <ha-ripple .disabled=${!this.buttonRole || this.iconOnly}></ha-ripple>
        <slot name="icon"></slot>
        ${this.iconOnly
          ? nothing
          : html`<span class="info">
              ${label ? html`<span class="label">${label}</span>` : nothing}
              <span class="content"><slot></slot></span>
            </span>`}
        ${this.type !== 'group'
          ? nothing
          : html` <ha-svg-icon slot="icon" class="toggle-icon" .path=${ICON.CHEVRON_DOWN}></ha-svg-icon> `}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --badge-color: var(--secondary-text-color);
        -webkit-tap-highlight-color: transparent;
      }
      :host([hidden]) {
        display: none;
      }

      .badge {
        position: relative;
        --ha-ripple-color: var(--badge-color);
        --ha-ripple-hover-opacity: 0.04;
        --ha-ripple-pressed-opacity: 0.12;
        transition: box-shadow 180ms ease-in-out, border-color 180ms ease-in-out;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: var(--ha-badge-size, 36px);
        min-width: var(--ha-badge-size, 36px);
        padding: 0px 12px;
        box-sizing: border-box;
        width: auto;
        border-radius: var(--ha-badge-border-radius, calc(var(--ha-badge-size, 36px) / 2));
        /* border-radius: var(--ha-card-border-radius, 12px); */
        background: none;
        -webkit-backdrop-filter: var(--ha-card-backdrop-filter, none);
        backdrop-filter: var(--ha-card-backdrop-filter, none);
        border-width: 0;
        box-shadow: var(--ha-card-box-shadow, none);
        border-style: solid;
        border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      }
      .badge:focus-visible {
        --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
        --shadow-focus: 0 0 0 1px var(--badge-color);
        border-color: var(--badge-color);
        box-shadow: var(--shadow-default), var(--shadow-focus);
      }
      .badge.row-reverse {
        flex-direction: row-reverse;
      }

      [role='button'] {
        cursor: pointer;
      }
      [role='button']:focus {
        outline: none;
      }

      :host([type='group']) [role='button']:hover *,
      :host([type='group']) [role='button']:hover ::slotted([slot='icon']) {
        color: var(--primary-color) !important;
      }

      .info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding-inline-start: initial;
        text-align: center;
      }
      .badge.row-reverse .info {
        align-items: flex-end;
        padding-inline-start: initial;
        text-align: center;
      }
      .badge.col-reverse .info {
        flex-direction: column-reverse;
      }
      .label {
        font-size: calc(10px * 1);
        font-style: normal;
        font-weight: 500;
        line-height: 10px;
        letter-spacing: 0.1px;
        color: var(--secondary-text-color);
        text-align: start;
        overflow: hidden;
        white-space: nowrap;
      }
      .content {
        font-size: calc(14px * 1);
        font-style: normal;
        font-weight: 500;
        line-height: 1.2;
        letter-spacing: 0.1px;
        color: var(--primary-text-color);
        text-align: start;
        overflow: hidden;
        white-space: nowrap;
      }
      .content > .error {
        color: var(--error-color);
      }
      :host([active]) .content,
      :host([active]) .toggle-icon,
      :host([active]) ::slotted([slot='icon']) {
        color: var(--primary-color);
      }
      :host([active]) .badge {
        background-color: rgba(var(--rgb-primary-color), 0.1);
      }

      ::slotted([slot='icon']) {
        --mdc-icon-size: var(--badge-icon-size, 21px);
        color: var(--badge-color);
        line-height: 0;
        margin-left: -4px;
        margin-right: 0;
        margin-inline-start: -4px;
        margin-inline-end: 0;
      }

      ::slotted(img[slot='icon']) {
        width: var(--badge-icon-size, 21px);
        height: var(--badge-icon-size, 21px);
        border-radius: 50%;
        object-fit: cover;
        overflow: hidden;
        margin-left: -4px;
        margin-right: 0px;
        margin-inline: -4px 0px;
      }

      .badge.icon-only {
        padding: 0;
      }
      .badge.icon-only ::slotted([slot='icon']) {
        margin-left: 0;
        margin-right: 0;
        margin-inline-start: 0;
        margin-inline-end: 0;
      }
      .toggle-icon {
        width: 18px;
        height: 18px;
        color: var(--secondary-text-color);
        transition: transform 0.3s ease-in-out;
        margin-left: -4px;
        margin-inline-end: -4px;
        display: flex;
      }
      :host([active]) .toggle-icon {
        transform: rotate(180deg);
        transition: transform 0.3s ease;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-indicator-badge': VscIndicatorBadge;
  }
}
