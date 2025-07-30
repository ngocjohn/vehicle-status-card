import { css, CSSResultGroup, html, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
// swiper
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

import './shared/vsc-button-single';
import { COMPONENT } from '../constants/const';
import { HomeAssistant } from '../ha';
import { ButtonCardConfig } from '../types/config';
import { BaseElement } from '../utils/base-element';

@customElement(COMPONENT.BUTTONS_GRID)
export class VehicleButtonsGrid extends BaseElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  // @property({ attribute: false }) private buttons!: ButtonCardConfig[];

  @state() private buttons!: ButtonCardConfig[];
  @state() private useSwiper!: boolean;

  @state() swiper?: Swiper;
  @state() private _cardCurrentSwipeIndex?: number;
  @state() public activeSlideIndex: number = 0;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.useSwiper) {
      this.initSwiper();
    }
    this._setUpButtonAnimation();
  }

  private _setUpButtonAnimation(): void {
    if (this._store.card.isEditorPreview) return;
    if (!this.shadowRoot) return;

    const runAnimation = () => {
      const gridItems = this.shadowRoot?.querySelectorAll('vsc-button-single') as NodeListOf<HTMLElement>;
      if (!gridItems || gridItems.length === 0) return;

      gridItems.forEach((grid, index) => {
        // Defer to ensure shadow DOM is ready
        requestAnimationFrame(() => {
          const gridItem = grid.shadowRoot?.querySelector('.grid-item') as HTMLElement;
          if (gridItem) {
            gridItem.style.animationDelay = `${index * 50}ms`;
            gridItem.classList.add('zoom-in');
            gridItem.addEventListener(
              'animationend',
              () => {
                gridItem.classList.remove('zoom-in');
              },
              { once: true }
            );
          }
        });
      });

      observer.disconnect();
    };

    const observer = new MutationObserver(() => {
      const buttons = this.shadowRoot?.querySelectorAll('vsc-button-single') as NodeListOf<HTMLElement>;
      if (buttons && buttons.length > 0) {
        requestAnimationFrame(() => runAnimation());
      }
    });

    observer.observe(this.shadowRoot, {
      childList: true,
      subtree: true,
    });

    // Initial fallback
    requestAnimationFrame(() => runAnimation());
  }

  // private get gridConfig(): LayoutConfig['button_grid'] {
  //   const button_grid = this.config.layout_config?.button_grid;
  //   return {
  //     rows: button_grid?.rows ?? 2,
  //     columns: button_grid?.columns ?? 2,
  //     button_layout: button_grid?.button_layout ?? 'horizontal',
  //     swipe: button_grid?.swipe ?? false,
  //     transparent: button_grid?.transparent ?? false,
  //     hide_notify_badge: button_grid?.hide_notify_badge ?? false,
  //   };
  // }

  protected render(): TemplateResult {
    this.useSwiper = this._store.gridConfig.swipe!;
    this.buttons = this._store.visibleButtons;
    return html`
      <div id="button-swiper" style=${this.computeBaseStyles()}>
        ${this.useSwiper
          ? this._renderSwiper()
          : html`<div class="grid-container" style=${this._computeGridColumns()}>
              ${this.buttons.map((button, index) => this._renderButton(button, index))}
            </div>`}
      </div>
    `;
  }

  private computeBaseStyles() {
    const buttonOrder = this._store.sectionOrderMap.get('buttons');
    const isSomeElementPrev = buttonOrder !== undefined && buttonOrder !== 0;
    // If mini map is previous section, add padding to top
    const bottomPadding = !this.useSwiper || this.swiper?.slides.length === 1 ? '0' : 'var(--vic-card-padding)';
    return styleMap({
      marginTop: isSomeElementPrev ? 'var(--vic-card-padding)' : 'unset',
      padding: `0 0 ${bottomPadding} 0`,
    });
  }

  private _renderSwiper(): TemplateResult {
    const { rows, columns } = this._store.gridConfig;
    const total = rows! * columns!;
    const buttons = this.buttons;

    return html`
      <div class="swiper-container">
        <div class="swiper-wrapper">
          ${Array.from({ length: Math.ceil(buttons.length / total) }, (_, slideIndex) => {
            const start = slideIndex * total;
            const end = start + total;

            return html`
              <div class="swiper-slide">
                <div class="grid-container" style=${this._computeGridColumns()}>
                  ${buttons.slice(start, end).map((button, index) => {
                    const realIndex = start + index;
                    return this._renderButton(button, realIndex);
                  })}
                </div>
              </div>
            `;
          })}
        </div>
        <div class="swiper-pagination"></div>
      </div>
    `;
  }

  private _renderButton(button: ButtonCardConfig, index: number): TemplateResult {
    const { hide_notify_badge, transparent, button_layout } = this._store.gridConfig;
    return html`<vsc-button-single
      id=${`button-id-${index}`}
      data-index=${index}
      .hass=${this.hass}
      ._buttonConfig=${button}
      .hideNotify=${hide_notify_badge}
      ?transparent=${transparent}
      ?vertical=${button_layout === 'vertical'}
      @click-index=${this._handleClick}
    ></vsc-button-single>`;
  }

  _handleClick(ev: Event): void {
    ev.stopPropagation();
    const index = (ev.target as any).dataset.index;
    console.log('Button clicked at index:', index);
    setTimeout(() => {
      this._store.card._currentSwipeIndex = this.activeSlideIndex;
      this._store.card._activeCardIndex = index;
    }, 50);
  }

  private initSwiper(): void {
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    // console.log('swiper status init start');
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;

    this.swiper = new Swiper(swiperCon as HTMLElement, {
      grabCursor: true,
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

  public showButton = (index: number): void => {
    this.updateComplete.then(() => {
      const btnId = `button-id-${index}`;
      const gridBtns = this.shadowRoot?.querySelectorAll('vsc-button-single') as NodeListOf<HTMLElement>;
      const btnElt = Array.from(gridBtns).find((btn) => btn.id === btnId);

      if (!btnElt) return;

      const highlightButton = () => {
        const filteredBtns = Array.from(gridBtns).filter((btn) => btn.id !== btnId);
        const gridItem = btnElt.shadowRoot?.querySelector('.grid-item') as HTMLElement;
        filteredBtns.forEach((btn) => (btn.style.opacity = '0.2'));
        gridItem.classList.add('redGlows');

        setTimeout(() => {
          filteredBtns.forEach((btn) => (btn.style.opacity = ''));
          gridItem.classList.remove('redGlows');
        }, 3000);
      };

      if (this.swiper) {
        const targetSlide = btnElt.closest('.swiper-slide') as HTMLElement;
        const targetSlideIndex = Array.from(targetSlide.parentElement?.children || []).indexOf(targetSlide);

        if (targetSlideIndex !== -1) {
          console.log('swiper slide to', targetSlideIndex);
          this.swiper?.slideTo(targetSlideIndex);
          setTimeout(highlightButton, 500);
        }
      } else {
        setTimeout(highlightButton, 500);
      }
    });
  };

  private _computeGridColumns() {
    const { columns } = this._store.gridConfig;
    const minWidth = `calc((100% / ${columns}) - 8px)`;
    return styleMap({
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      unsafeCSS(swipercss),
      css`
        #button-swiper {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-buttons-grid': VehicleButtonsGrid;
  }
}
