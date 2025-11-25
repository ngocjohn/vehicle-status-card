import { LitElement, html, css, TemplateResult, nothing, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import type { TireCardLayout } from '../types/config/card/tire-card';

import { TIRE_BG } from '../constants/img-const';
import { computeImageUrl, HomeAssistant } from '../ha';
import parseAspectRatio from '../ha/common/util/parse-aspect-ratio';
import { generateImageThumbnailUrl, getIdFromUrl } from '../ha/data/image_upload';

@customElement('custom-tire-card')
export class CustomTireCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public tireLayout!: TireCardLayout;
  @property({ type: Boolean, reflect: true, attribute: 'horizontal' }) public horizontal = false;

  connectedCallback(): void {
    super.connectedCallback();
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  private _getAspectRatio(input: string): string {
    const ratio = parseAspectRatio(input);
    // console.log('Parsed aspect ratio:', ratio);
    if (ratio && ratio.w > 0 && ratio.h > 0) {
      return `${ratio.w} / ${ratio.h}`;
    }
    return '1 / 1';
  }

  protected render(): TemplateResult {
    const layout = this.tireLayout;
    const cardStyles = this._computeBackgroundStyle(layout);

    const title = layout?.title ?? undefined;
    const hideRotationButton = layout?.hide_rotation_button ?? false;
    const isHorizontal = this.horizontal;
    return html`
      <div class="container" style=${styleMap(cardStyles)}>
        ${title ? html`<div class="title">${title}</div>` : nothing}
        ${!hideRotationButton
          ? html`<ha-icon
              @click=${() => {
                this.horizontal = !this.horizontal;
              }}
              ?horizontal=${isHorizontal}
              class="tyre-toggle-btn"
              icon="mdi:rotate-right-variant"
            ></ha-icon>`
          : nothing}
        <div class="tyre-wrapper" ?horizontal=${isHorizontal}>
          <div class="tyre-items-grid">
            <slot name="front_left"></slot>
            <slot name="front_right"></slot>
            <slot name="rear_left"></slot>
            <slot name="rear_right"></slot>
          </div>
        </div>
      </div>
    `;
  }

  private _computeBackgroundStyle(layout: TireCardLayout): Record<string, string> {
    const image_size = layout.image_size ?? 100;
    const value_size = layout.value_size ?? 100;
    const top = layout.top ?? 50;
    const left = layout.left ?? 50;
    const aspect_ratio = this._getAspectRatio(layout.aspect_ratio ?? '1/1');

    let background: string | undefined = TIRE_BG;
    if (layout.background_entity) {
      const bgState = this.hass.states[layout.background_entity];
      background = computeImageUrl(bgState as any);
    } else if (layout.background) {
      if (typeof layout.background === 'object' && layout.background.media_content_id) {
        const mediaId = getIdFromUrl(layout.background.media_content_id);
        background = generateImageThumbnailUrl(mediaId!, undefined, true);
      } else {
        background = layout.background as string;
      }
    }

    return {
      '--vic-tire-top': `${top}%`,
      '--vic-tire-left': `${left}%`,
      '--vic-tire-size': `${image_size}%`,
      '--vic-tire-value-size': `${value_size / 100}`,
      '--vic-tire-background': `url(${background})`,
      '--vic-tire-aspect-ratio': `${aspect_ratio}`,
    };
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        --vic-tire-top: 50%;
        --vic-tire-left: 50%;
        --vic-tire-size: 100%;
        --vic-tire-value-size: 1;
      }
      .container {
        position: relative;
        width: auto;
        height: auto;
        overflow: hidden;
        aspect-ratio: var(--vic-tire-aspect-ratio);
        transition: all 400ms ease-in-out;
        background: var(--ha-card-background-color, var(--secondary-background-color));
        box-shadow: var(--ha-card-box-shadow);
        box-sizing: border-box;
        border-radius: var(--ha-card-border-radius, 12px);
        border-width: var(--ha-card-border-width, 1px);
        border-style: solid;
        border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      }
      .title {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        font-size: var(--ha-card-header-font-size, 24px);
        z-index: 2;
        color: var(--ha-card-header-color, var(--primary-text-color));
        box-sizing: border-box;
        line-height: 2em;
        padding-inline-start: 12px;
      }
      .tyre-toggle-btn {
        position: absolute;
        top: var(--vic-card-padding, 12px);
        right: var(--vic-card-padding, 12px);
        z-index: 2;
        opacity: 0.5;
        cursor: pointer;
        transition: all 0.3s ease-in-out;
      }
      .tyre-toggle-btn:hover {
        opacity: 1;
      }
      .tyre-toggle-btn[horizontal] {
        transform: rotateY(-180deg);
      }
      .tyre-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        /* aspect-ratio: 1; */
        transition: all 0.5s ease-in-out;
      }
      .tyre-wrapper[horizontal] {
        transform: rotate(90deg);
      }
      .tyre-wrapper[horizontal] .tyre-items-grid ::slotted(*) {
        transform: rotate(-90deg);
        transition: transform 0.5s ease-in-out;
      }
      .tyre-wrapper::before {
        content: '';
        background-image: var(--vic-tire-background);
        position: absolute;
        width: var(--vic-tire-size, 100%);
        height: var(--vic-tire-size, 100%);
        z-index: 0;
        top: var(--vic-tire-top, 50%);
        left: var(--vic-tire-left, 50%);
        transform: translate(-50%, -50%);
        background-size: contain;
        background-repeat: no-repeat;
        overflow: hidden;
        filter: drop-shadow(2px 4px 1rem #000000d8);
      }

      .tyre-wrapper .tyre-items-grid {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: 1;
        display: grid;
        grid-template-areas:
          'front_left . front_right'
          '. . .'
          'rear_left . rear_right';
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: 1fr min-content 1fr;
        align-items: center;
        justify-items: center;
        gap: 0.5rem;
        /* text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3); */
        transform: scale(var(--vic-tire-value-size, 1));
        transition: transform 0.5s ease-in-out;
        color: var(--primary-text-color, white);
        user-select: none;
        pointer-events: none;
      }
      .tyre-wrapper .tyre-items-grid ::slotted([slot='front_left']) {
        grid-area: front_left;
      }
      .tyre-wrapper .tyre-items-grid ::slotted([slot='front_right']) {
        grid-area: front_right;
      }
      .tyre-wrapper .tyre-items-grid ::slotted([slot='rear_left']) {
        grid-area: rear_left;
      }
      .tyre-wrapper .tyre-items-grid ::slotted([slot='rear_right']) {
        grid-area: rear_right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-tire-card': CustomTireCard;
  }
}
