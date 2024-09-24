import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import Swiper from 'swiper';
import { Autoplay, Pagination } from 'swiper/modules';

import cardstyles from '../css/card.css';
import swipercss from '../css/swiper-bundle.css';
import { ImageConfig } from '../types';

@customElement('images-slide')
export class ImagesSlide extends LitElement {
  @property({ type: Array }) images: Array<ImageConfig> = [];

  @state() swiper: null | Swiper = null;

  protected firstUpdated(changeProperties: PropertyValues): void {
    super.firstUpdated(changeProperties);
    this.updateComplete.then(() => {
      this.initSwiper();
    });
  }

  protected render(): TemplateResult {
    const images = this.images || [];
    return html`
      <section id="swiper">
        <div class="swiper-container">
          <div class="swiper-wrapper">
            ${images.map(
              (image) => html`
                <div class="swiper-slide">
                  <img src="${image.url}" />
                </div>
              `
            )}
          </div>
          <div class="swiper-pagination"></div>
        </div>
      </section>
    `;
  }

  private initSwiper(): void {
    // Destroy the existing Swiper instance if it exists

    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      centeredSlides: true,
      grabCursor: true,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      loop: true,
      modules: [Pagination, Autoplay],
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

  static get styles(): CSSResultGroup {
    return [
      cardstyles,
      swipercss,
      css`
        :host {
          --swiper-pagination-bottom: 0px;
          --swiper-theme-color: var(--primary-text-color);
        }
        section {
          display: block;
          padding: 1rem 0;
        }
        .swiper-container {
          width: 100%;
          height: 100%;
          display: block;
        }
        .swiper-slide {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        .swiper-slide:active {
          scale: 1.02;
        }
        .swiper-slide img {
          width: 100%;
          height: 100%;
          object-fit: scale-down;
          max-height: var(--vic-images-slide-height, 150px);
          max-width: var(--vic-images-slide-width, 450px);
        }
        .swiper-slide .image-index {
          position: absolute;
          bottom: 0;
          left: var(--vic-card-padding);
          padding: var(--vic-gutter-gap);
          background-color: var(--swiper-theme-color);
          color: var(--primary-background-color);
          font-size: 1rem;
          font-weight: bold;
          z-index: 1;
        }

        .swiper-pagination-bullet {
          background-color: var(--swiper-theme-color);
          transition: all 0.3s ease-in-out !important;
        }
        .swiper-pagination-bullet-active {
          width: 18px !important;
          border-radius: 1rem !important;
          opacity: 0.7;
        }
      `,
    ];
  }
}
