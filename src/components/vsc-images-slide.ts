import { css, CSSResultGroup, html, nothing, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import Swiper from 'swiper';
import { Autoplay, Pagination, EffectFade, EffectCoverflow } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';
import { SwiperOptions } from 'swiper/types';

import { COMPONENT } from '../constants/const';
import { VehicleStatusCardConfig, ImageItem, ImagesSwipeConfig } from '../types/config';
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
    const hide_pagination = this.config.layout_config?.images_swipe?.hide_pagination;

    return html`
      <div class="swiper-container" style=${this._computeStyle()}>
        <div class="swiper-wrapper">
          ${images.map(
            (image, index) => html`
              <vsc-image-item class="swiper-slide" id="image-slide-${index}" .hass=${this.hass} ._imageConfig=${image}>
              </vsc-image-item>
            `
          )}
        </div>
        ${!hide_pagination ? html`<div class="swiper-pagination"></div>` : nothing}
      </div>
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

  private _computeStyle() {
    const slideConfig = this.config.layout_config?.images_swipe as ImagesSwipeConfig;
    const { height, width, hide_pagination } = slideConfig;

    let styleImages: Record<string, string> = {};
    if (height) {
      styleImages['--vic-images-slide-height'] = `${height}px`;
    }
    if (width) {
      styleImages['--vic-images-slide-width'] = `${width}px`;
    }
    if (hide_pagination || this.swiper?.isLocked) {
      styleImages['padding-bottom'] = '0';
    }
    if (this.parentElement?.previousElementSibling !== null) {
      styleImages['padding-top'] = 'var(--vic-card-padding)';
    }
    return styleMap(styleImages);
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
      unsafeCSS(swipercss),
      css`
        :host {
          --swiper-pagination-bottom: 0px;
          --swiper-theme-color: var(--primary-text-color);
        }

        .swiper-container {
          padding: 0 0 var(--vic-card-padding) 0;
          border: none !important;
          background: none !important;
          overflow: visible;
          width: 100%;
          height: 100%;
        }
        /* .swiper-wrapper {
					flex-direction: initial;
					flex-wrap: wrap;
				} */
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

        .swiper-pagination {
          /* margin-top: var(--swiper-pagination-bottom); */
          display: flex;
          justify-content: center;
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
