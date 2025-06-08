// utils
import { chunk } from 'es-toolkit';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';
// swiper
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

// local
import cardstyles from '../css/card.css';
import { ButtonCardEntity, HomeAssistant, LayoutConfig, VehicleStatusCardConfig } from '../types';
import { VehicleStatusCard } from '../vehicle-status-card';
import './shared/vsc-button-single';

@customElement('vehicle-buttons-grid')
export class VehicleButtonsGrid extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) card!: VehicleStatusCard;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;
  @property({ type: Array }) buttons: ButtonCardEntity = [];

  @state() swiper?: Swiper;
  @state() private _cardCurrentSwipeIndex?: number;
  @state() public activeSlideIndex: number = 0;

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
    if (this.useSwiper) {
      this.initSwiper();
    }
    this._setUpButtonAnimation();
  }

  private _setUpButtonAnimation(): void {
    if (this.card.isEditorPreview) return;
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

  public get gridConfig(): LayoutConfig['button_grid'] {
    return {
      rows: this.config.layout_config?.button_grid?.rows ?? 2,
      columns: this.config.layout_config?.button_grid?.columns ?? 2,
      button_layout: this.config.layout_config?.button_grid?.button_layout ?? 'horizontal',
      swipe: this.config.layout_config?.button_grid?.swipe ?? false,
      transparent: this.config.layout_config?.button_grid?.transparent ?? false,
    };
  }

  private get useSwiper(): boolean {
    return this.config.layout_config?.button_grid?.swipe || false;
  }

  public get hideNotify(): boolean {
    return this.config.layout_config?.hide?.button_notify || false;
  }

  protected render(): TemplateResult {
    if (!this.buttons || this.buttons.length === 0) {
      return html``;
    }

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
    const order = this.config.layout_config?.section_order || [];
    const isMiniMapPrev = order.indexOf('buttons') - order.indexOf('mini_map') === 1;
    return styleMap({
      marginTop: !isMiniMapPrev ? 'var(--vic-card-padding)' : 'unset',
    });
  }

  private _renderSwiper(): TemplateResult {
    const total = this.gridConfig.rows! * this.gridConfig.columns!;
    const buttons = [...this.buttons];
    const newButtons = buttons.map((button, index) => {
      return { ...button, index };
    });
    const chunked = chunk(newButtons, total);

    return html`
      <div class="swiper-container">
        <div class="swiper-wrapper">
          ${chunked.map((buttonGroup: any) => {
            return html`
              <div class="swiper-slide">
                <div class="grid-container" style=${this._computeGridColumns()}>
                  ${buttonGroup.map((button: any) => {
                    return this._renderButton(button, button.index);
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

  private _renderButton(button: any, index: number): TemplateResult {
    return html`<vsc-button-single
      id=${`button-id-${index}`}
      .hass=${this.hass}
      ._card=${this as any}
      ._buttonConfig=${button}
      ._index=${index}
      .layout=${this.gridConfig.button_layout}
    ></vsc-button-single>`;
  }

  _handleClick(index: number): void {
    setTimeout(() => {
      this.card._currentSwipeIndex = this.activeSlideIndex;
      this.card._activeCardIndex = index;
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
    const { columns } = this.gridConfig;
    const minWidth = `calc((100% / ${columns}) - 8px)`;
    return styleMap({
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    });
  }

  static get styles(): CSSResultGroup {
    return [
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
      cardstyles,
    ];
  }
}
