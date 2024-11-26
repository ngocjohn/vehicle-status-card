import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property } from 'lit/decorators';
// swiper
import Swiper from 'swiper';
import { Pagination, Grid } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

// utils
import { forwardHaptic } from 'custom-card-helpers';
import { chunk } from 'es-toolkit';
// local
import cardstyles from '../css/card.css';
import { ButtonCardEntity, ButtonCardEntityItem, HA as HomeAssistant, VehicleStatusCardConfig } from '../types';
import { VehicleStatusCard } from '../vehicle-status-card';
import './shared/vsc-button-single';

@customElement('vehicle-buttons-grid')
export class VehicleButtonsGrid extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) card!: VehicleStatusCard;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;
  @property({ type: Array }) buttons: ButtonCardEntity = [];

  private swiper?: Swiper;

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
    if (this.useSwiper) {
      this.initSwiper();
    }
  }

  private get gridConfig(): { rows: number; columns: number } {
    return {
      rows: this.config.layout_config?.button_grid?.rows || 2,
      columns: this.config.layout_config?.button_grid?.columns || 2,
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
      <div id="button-swiper">
        ${this.useSwiper
          ? this._renderSwiper()
          : html`<div class="grid-container" style=${this._computeGridColumns()}>
              ${this.buttons.map((button, index) => this._renderButton(button, index))}
            </div>`}
      </div>
    `;
  }

  private _chunkButtons(): ButtonCardEntityItem[][] {
    const total = this.gridConfig.rows * this.gridConfig.columns;
    const buttons = [...this.buttons];
    const newButtons = buttons.map((button, index) => {
      return { ...button, index };
    });
    return chunk(newButtons, total);
  }

  private _renderSwiper(): TemplateResult {
    const total = this.gridConfig.rows * this.gridConfig.columns;
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
    ></vsc-button-single>`;
  }

  _handleClick(index: number): void {
    forwardHaptic('light');
    setTimeout(() => {
      this.card._activeCardIndex = index;
    }, 150);
  }

  private initSwiper(): void {
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    // console.log('swiper status init start');
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;

    this.swiper = new Swiper(swiperCon as HTMLElement, {
      grabCursor: false,
      loop: false,
      modules: [Pagination, Grid],
      pagination: {
        clickable: true,
        el: paginationEl,
      },
      roundLengths: true,
      slidesPerView: 'auto',
      spaceBetween: 12,
      speed: 500,
    });
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
    const minWidth = `calc((100% - 24px) / ${columns})`;
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
