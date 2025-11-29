import { LitElement, html, css, TemplateResult, nothing, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import type { TireCardLayout } from '../types/config/card/tire-card';

import { TIRE_BG } from '../constants/img-const';
import { computeImageUrl, HomeAssistant } from '../ha';
import parseAspectRatio from '../ha/common/util/parse-aspect-ratio';
import { generateImageThumbnailUrl, getIdFromUrl } from '../ha/data/image_upload';
import { LovelaceElement } from '../ha/panels/lovelace/elements/types';

const DEFAULT_BG_URL = `:host {
  --vic-tire-background: url(${TIRE_BG});
}`;
@customElement('custom-tire-card')
export class CustomTireCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public tireLayout!: TireCardLayout;
  @property({ type: Boolean, reflect: true, attribute: 'horizontal' }) public horizontal = false;
  @property({ attribute: false }) _elements?: LovelaceElement[];
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
          <div class="tyre-background"><img /></div>
          <div class="tyre-items-grid">
            <slot name="grid-item"></slot>
          </div>
          ${this._elements}
        </div>
      </div>
    `;
  }

  private _computeBackgroundStyle(layout: TireCardLayout) {
    const styles: Record<string, string> = {};
    const sizes = {
      image_size: layout.image_size ?? 100,
      top: layout.top ?? 50,
      left: layout.left ?? 50,
      value_size: (layout.value_size || 100) / 100,
      aspect_ratio: this._getAspectRatio(layout.aspect_ratio ?? '1/1'),
    };

    Object.entries(sizes).forEach(([key, value]) => {
      if (value !== undefined) {
        styles[`--vic-tire-${key.replace('_', '-')}`] = ['aspect_ratio', 'value_size'].includes(key)
          ? `${value}`
          : `${value}%`;
      }
    });

    const hasBg = Boolean(layout.background || layout.background_entity);
    if (hasBg) {
      let background: string | undefined = '';
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
      styles['--vic-tire-background'] = `url(${background})`;
    }
    return styles;
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(DEFAULT_BG_URL),
      css`
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
          --vic-tire-top: 50%;
          --vic-tire-left: 50%;
          --vic-tire-image-size: 100%;
          --vic-tire-value-size: 1;
          --vic-tire-aspect-ratio: 1 / 1;
        }
        :host([single]) .container {
          background: var(--ha-card-background, var(--card-background-color, #fff)) !important;
          box-shadow: var(--ha-card-box-shadow);
        }
        :host([debug]) .tyre-items-grid ::slotted(.element),
        :host([debug]) .tyre-background,
        :host([debug]) .element {
          outline: 1px solid red;
        }
        .container {
          position: relative;
          width: inherit;
          height: auto;
          overflow: hidden;
          aspect-ratio: var(--vic-tire-aspect-ratio);
          transition: all 400ms ease-in-out;
          background: var(--ha-card-background, var(--secondary-background-color));
          box-shadow: none;
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
        .tyre-background {
          position: absolute;
          width: var(--vic-tire-image-size, 100%);
          height: var(--vic-tire-image-size, 100%);
          z-index: 0;
          top: var(--vic-tire-top, 50%);
          left: var(--vic-tire-left, 50%);
          transform: translate(-50%, -50%);
          overflow: hidden;
          filter: drop-shadow(2px 4px 1rem var(--clear-background-color, var(--secondary-background-color, #000000d8)));
        }
        .tyre-background img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          content: var(--vic-tire-background);
        }

        .tyre-wrapper[horizontal] {
          rotate: 90deg;
        }
        .tyre-wrapper[horizontal] .tyre-items-grid ::slotted(*),
        .tyre-wrapper[horizontal] .element {
          rotate: -90deg;
        }
        .tyre-items-grid ::slotted(.element),
        .tyre-wrapper .element {
          position: absolute;
          transform: translate(-50%, -50%);
        }
        .tyre-items-grid ::slotted(*),
        .tyre-wrapper .element {
          transition: all 0.5s ease-in-out;
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
          transition: all 0.5s ease-in-out;
          color: var(--primary-text-color, white);
          user-select: none;
          pointer-events: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-tire-card': CustomTireCard;
  }
}
