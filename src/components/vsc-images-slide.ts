import { css, CSSResultGroup, html, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import Swiper from 'swiper';
import { Autoplay, Pagination, EffectFade, EffectCoverflow } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';
import { SwiperOptions } from 'swiper/types';

import { COMPONENT } from '../constants/const';
import cardstyles from '../css/card.css';
import { VehicleStatusCardConfig, ImageItem } from '../types/config';
import { BaseElement } from '../utils/base-element';
import './shared/vsc-image-item';

@customElement(COMPONENT.IMAGES_SLIDE)
export class ImagesSlide extends BaseElement {
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;

  @state() swiper: null | Swiper = null;
  @state() private _imagesItems: ImageItem[] = [];

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('config') && this.config.image_slides) {
      this._imagesItems = this.config.image_slides;
    }
  }

  protected firstUpdated(changeProperties: PropertyValues): void {
    super.firstUpdated(changeProperties);
    this.initSwiper();
  }

  protected render(): TemplateResult {
    if (!this._imagesItems.length) {
      return html``;
    }
    const images = this._imagesItems;

    const max_height = this.config.layout_config?.images_swipe?.max_height || 150;
    const max_width = this.config.layout_config?.images_swipe?.max_width || 450;
    const hide_pagination = this.config.layout_config?.images_swipe?.hide_pagination || false;

    const styleImages = {
      '--vic-images-slide-height': `${max_height}px`,
      '--vic-images-slide-width': `${max_width}px`,
    };

    return html`
      <section id="swiper" style=${styleMap(styleImages)}>
        <div class="swiper-container">
          <div class="swiper-wrapper">
            ${images.map(
              (img, index) => html`
                <div class="swiper-slide" id="image-slide-${index}">
                  <vsc-image-item .hass=${this.hass} ._store=${this._store} ._imageConfig=${img}></vsc-image-item>
                </div>
              `
            )}
          </div>
          <div class="swiper-pagination" ?hidden=${hide_pagination}></div>
        </div>
      </section>
    `;
  }

  private initSwiper(): void {
    // Destroy the existing Swiper instance if it exists
    const config = this.config.layout_config?.images_swipe || {};
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container') as HTMLElement;
    if (!swiperCon) return;
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;

    const swiperConfig = () => {
      const defaultConfig: SwiperOptions = {
        modules: [Pagination, Autoplay, EffectFade, EffectCoverflow],
        centeredSlides: true,
        grabCursor: true,
        keyboard: {
          enabled: true,
          onlyInViewport: true,
        },
        loop: config.loop || false,
        speed: config.speed || 500,
        pagination: {
          clickable: true,
          dynamicBullets: true,
          el: paginationEl,
        },
        roundLengths: true,
        slidesPerView: 1,
        spaceBetween: 12,
      };

      const effectConfig: Partial<Record<string, Partial<SwiperOptions>>> = {
        slide: {},
        fade: {
          effect: 'fade',
          fadeEffect: { crossFade: true },
        },
        coverflow: {
          effect: 'coverflow',
          coverflowEffect: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          },
        },
      };

      if (config.autoplay === true) {
        Object.assign(defaultConfig, {
          autoplay: {
            delay: config.delay || 5000,
            disableOnInteraction: false,
          },
        });
      }

      Object.assign(defaultConfig, effectConfig[config.effect || 'slide']);
      return defaultConfig;
    };

    this.swiper = new Swiper(swiperCon, swiperConfig());
  }

  public showImage(index: number): void {
    this.updateComplete.then(() => {
      const imgId = `image-slide-${index}`;
      const swiperSlides = this.shadowRoot?.querySelectorAll('.swiper-slide') as NodeListOf<HTMLElement>;
      if (!swiperSlides) return;
      let targetSlideIndex = -1;
      swiperSlides.forEach((slide, index) => {
        if (slide.id === imgId) {
          targetSlideIndex = index;
        }
      });

      if (this.swiper && targetSlideIndex > -1) {
        this.swiper.slideTo(targetSlideIndex);
      }
    });
  }

  static get styles(): CSSResultGroup {
    return [
      cardstyles,
      unsafeCSS(swipercss),
      css`
        :host {
          --swiper-pagination-bottom: -4px;
          --swiper-theme-color: var(--primary-text-color);
        }
        * [hidden] {
          display: none !important;
        }
        section {
          display: block;
          padding: 1rem 0;
        }
        .swiper-wrapper {
          display: flex;
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
          align-self: anchor-center;
        }
        .swiper-slide:active {
          scale: 1.02;
        }
        .swiper-slide > vsc-image-item {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
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

        .swiper-pagination {
          display: block;
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

declare global {
  interface HTMLElementTagNameMap {
    'vsc-images-slide': ImagesSlide;
  }
}
