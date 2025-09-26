import { css, CSSResultGroup, html, nothing, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
// swiper
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

import { COMPONENT } from '../constants/const';
import { BaseButtonCardItemConfig } from '../types/config/card/button-card';
import { SECTION } from '../types/section';
import { BaseElement } from '../utils/base-element';

@customElement(COMPONENT.BUTTONS_GROUP)
export class VscButtonsGroup extends BaseElement {
  constructor() {
    super(SECTION.BUTTONS);
  }
  @state() private buttons: BaseButtonCardItemConfig[] = [];

  @state() private swiper?: Swiper;
  @state() private useSwiper!: boolean;

  @state() private _cardCurrentSwipeIndex?: number;
  @state() activeSlideIndex: number = 0;

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_store') && this._store) {
      this.useSwiper = this._store.gridConfig.swipe!;
      this.buttons = this._store.visibleButtons as BaseButtonCardItemConfig[];
    }
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (this.useSwiper) {
      this._initSwiper();
    }
  }
  protected render(): TemplateResult {
    const buttons = this.buttons;
    const { rows, columns } = this._store.gridConfig;
    const total = this.useSwiper ? rows! * columns! : buttons.length;

    return html`
      <div
        class=${classMap({
          'buttons-group': true,
          'swiper-container': this.useSwiper,
        })}
        style=${this._computeStyle()}
      >
        <div class="swiper-wrapper">
          ${Array.from({ length: Math.ceil(buttons.length / total) }, (_, slideIndex) => {
            const start = slideIndex * total;
            const end = start + total;

            return html`
              <div class="swiper-slide">
                <div class="grid-container" data-slide-index=${slideIndex}>
                  ${buttons.slice(start, end).map((button, index) => {
                    const realIndex = start + index;
                    return this._renderButton(button, realIndex);
                  })}
                </div>
              </div>
            `;
          })}
        </div>
        ${this.useSwiper ? html`<div class="swiper-pagination"></div>` : nothing}
      </div>
    `;
  }

  private _renderButton(button: BaseButtonCardItemConfig, index: number): TemplateResult {
    const btnCfg = button as BaseButtonCardItemConfig;
    const contentText = btnCfg.name ?? btnCfg.entity ?? '';
    return html`
      <div class="button-item" data-index=${index}>
        <div>Button ${index + 1}</div>
        <div>${contentText}</div>
      </div>
    `;
  }

  private _computeStyle() {
    const { columns } = this._store.gridConfig;
    const minWidth = `calc((100% / ${columns}) - 8px)`;
    const gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}, 1fr))`;
    const paddingBottom = this.swiper?.isLocked || !this.useSwiper ? '0' : 'initial';
    let marginTop: string | null = null;
    if (this.parentElement?.previousElementSibling !== null) {
      marginTop = 'var(--vic-card-padding)';
    }

    return styleMap({
      '--vsc-btn-template-columns': gridTemplateColumns,
      paddingBottom,
      marginTop,
    });
  }

  private _initSwiper(): void {
    console.debug('Init swiper');
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;

    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      // grabCursor: true,
      loop: false,
      modules: [Pagination],
      pagination: {
        clickable: true,
        el: paginationEl,
      },
      roundLengths: true,
      slidesPerView: 'auto',
      spaceBetween: 12,
      speed: 500,
      edgeSwipeDetection: true,
    });
    this.swiper?.on('slideChange', () => {
      this.activeSlideIndex = this.swiper?.activeIndex ?? 0;
    });
    if (
      this.swiper &&
      this._cardCurrentSwipeIndex !== undefined &&
      this._cardCurrentSwipeIndex !== this.activeSlideIndex
    ) {
      this.swiper.slideTo(this._cardCurrentSwipeIndex, 0, false);
    }
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      unsafeCSS(swipercss),
      css`
        :host {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
        }
        .buttons-group {
          padding: 0 0 var(--vic-card-padding) 0;
          border: none !important;
          background: none !important;
          overflow: visible;
        }
        .swiper-container {
          width: 100%;
          height: 100%;
        }

        /* .swiper-wrapper {
					flex-direction: initial;
					flex-wrap: wrap;
				} */

        .swiper-slide {
          height: 100%;
          width: 100%;
        }
        .swiper-pagination {
          margin-top: var(--swiper-pagination-bottom);
          display: block;
        }
        .swiper-pagination-bullet {
          background-color: var(--swiper-theme-color);
          transition: all 0.3s ease-in-out !important;
        }
        .swiper-pagination-bullet-active {
          opacity: 0.7;
        }
        .button-item {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--divider-color);
          border-radius: inherit;
          width: 100%;
          /* height: 100%; */
          justify-content: center;
          white-space: nowrap;
          box-sizing: content-box;
        }
        .grid-container {
          grid-template-columns: var(--vsc-btn-template-columns);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-buttons-group': VscButtonsGroup;
  }
}
