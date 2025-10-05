import { css, CSSResultGroup, html, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import Swiper from 'swiper';
import { Autoplay, Pagination, EffectFade, EffectCoverflow } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';
import { SwiperOptions } from 'swiper/types';

import { COMPONENT } from '../constants/const';
import { VehicleStatusCardConfig, ImageItem } from '../types/config';
import { SECTION } from '../types/section';
import './shared/vsc-image-item';
import { BaseElement } from '../utils/base-element';

@customElement(COMPONENT.IMAGES_SLIDE)
export class ImagesSlide extends BaseElement {
  constructor() {
    super(SECTION.IMAGES);
  }
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;
  @state() private _images: ImageItem[] = [];

  @state() swiper: null | Swiper = null;

  protected firstUpdated(changeProperties: PropertyValues): void {
    super.firstUpdated(changeProperties);
    this.initSwiper();
  }

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (!this.config) {
      return;
    }

    if (changedProperties.has('config') && this.config.images) {
      this._images = this.config.images as ImageItem[];
    }
  }

  protected render(): TemplateResult {
    if (!this._images.length) {
      return html``;
    }
    const images = this._images;
    let styleImages: Record<string, string> = {};
    const { height, width, hide_pagination } = this.config.layout_config?.images_swipe || {};
    if (height) {
      styleImages['--vic-images-slide-height'] = `${height}px`;
    }
    if (width) {
      styleImages['--vic-images-slide-width'] = `${width}px`;
    }

    return html`
      <section id="swiper" style=${styleMap(styleImages)}>
        <div class="swiper-container">
          <div class="swiper-wrapper">
            ${images.map(
              (image, index) => html`
                <vsc-image-item
                  class="swiper-slide"
                  id="image-slide-${index}"
                  .hass=${this.hass}
                  ._imageConfig=${image}
                >
                </vsc-image-item>
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
        slidesPerView: 'auto',
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
      super.styles,
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
          padding: 1em 0px 8px;
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
          width: var(--vic-images-slide-width, 100%);
          height: var(--vic-images-slide-height, 100%);
          align-self: anchor-center;
        }
        .swiper-slide:active {
          scale: 1.02;
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
