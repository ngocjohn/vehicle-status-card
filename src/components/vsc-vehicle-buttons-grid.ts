import { forwardHaptic } from 'custom-card-helpers';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators';
import Swiper from 'swiper';
import { Pagination, Grid } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

import cardstyles from '../css/card.css';
import { ButtonCardEntity, HA as HomeAssistant, VehicleStatusCardConfig } from '../types';
import { VehicleStatusCard } from '../vehicle-status-card';
import './vsc-button-single';

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
          : html`<div class="grid-container">
              ${this.buttons.map((button, index) => this._renderButton(button, index))}
            </div>`}
      </div>
    `;
  }

  private _renderSwiper(): TemplateResult {
    const buttons = this.buttons;
    return html`
      <div class="swiper-container">
        <div class="swiper-wrapper">
          ${buttons.map((button, index) => {
            return html` <div class="swiper-slide">${this._renderButton(button, index)}</div>`;
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
    const rows = this.config.layout_config?.button_grid?.rows || 2;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      grabCursor: true,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      loop: false,
      modules: [Pagination, Grid],
      pagination: {
        clickable: true,
        el: paginationEl,
      },
      roundLengths: true,
      slidesPerView: 2,
      grid: {
        fill: 'row',
        rows: rows,
      },
      spaceBetween: 10,
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

        if (targetSlideIndex !== this.swiper.activeIndex) {
          console.log('swiper slide to', targetSlideIndex);
          this.swiper?.slideTo(targetSlideIndex);
          setTimeout(highlightButton, 500);
        }
      } else {
        setTimeout(highlightButton, 500);
      }
    });
  };

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
          height: auto;
          overflow: hidden;
        }
        .swiper-wrapper {
          flex-direction: unset;
          flex-wrap: wrap;
        }

        .swiper-slide {
          height: 100% !important;
          width: 100%;
          display: block;
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
