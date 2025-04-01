import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';
import Swiper from 'swiper';
import { Autoplay, Pagination, EffectFade, EffectCoverflow } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';
import { SwiperOptions } from 'swiper/types';

import cardstyles from '../css/card.css';
import { HomeAssistant, ImageConfig, VehicleStatusCardConfig } from '../types';
import { computeImageUrl, ImageEntity } from '../types/ha-frontend/data/image';

@customElement('images-slide')
export class ImagesSlide extends LitElement {
  @property({ attribute: false }) private hass!: HomeAssistant;
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;
  @state() swiper: null | Swiper = null;
  @state() private _images: ImageConfig[] = [];

  protected firstUpdated(changeProperties: PropertyValues): void {
    super.firstUpdated(changeProperties);
    this._handleImageConfig();
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (_changedProperties.has('config') && this.config.image_entities && this.config.image_entities.length) {
      return true;
    }
    if (_changedProperties.has('hass') && this.config.image_entities && this.config.image_entities.length) {
      return this._hasImageEntitiesChanged(_changedProperties);
    }
    return true;
  }

  private _hasImageEntitiesChanged(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    const imageEntities = this.config.image_entities!;
    let hasChanged = false;
    if (oldHass) {
      imageEntities.forEach((entity) => {
        if (oldHass.states[entity] !== this.hass.states[entity]) {
          hasChanged = true;
        }
      });
    }
    if (hasChanged) {
      this._handleImageConfig();
    }
    return hasChanged;
  }

  private _handleImageConfig(): void {
    let imagesArray: ImageConfig[] = [];

    const configImages = (this.config.images as ImageConfig[]) || [];
    const imageEntities = this.config.image_entities || [];
    if (configImages.length) {
      imagesArray = [...configImages];
    }
    if (imageEntities.length) {
      imageEntities.forEach((entity) => {
        const entityObj = this.hass.states[entity];
        if (entityObj) {
          const imageObj = entityObj as ImageEntity;
          const imageUrl = computeImageUrl(imageObj);
          imagesArray.push({
            url: imageUrl,
            title: entityObj.attributes.friendly_name || entityObj.entity_id,
          });
        }
      });
    }

    this._images = imagesArray;
    this.updateComplete.then(() => {
      this.initSwiper();
    });
  }

  protected render(): TemplateResult {
    if (!this._images.length) {
      return html``;
    }
    const images = this._images;
    const max_height = this.config.layout_config?.images_swipe?.max_height || 150;
    const max_width = this.config.layout_config?.images_swipe?.max_width || 450;

    const styleImages = {
      '--vic-images-slide-height': `${max_height}px`,
      '--vic-images-slide-width': `${max_width}px`,
    };

    return html`
      <section id="swiper" style=${styleMap(styleImages)}>
        <div class="swiper-container">
          <div class="swiper-wrapper">
            ${images.map(
              (image, index) => html`
                <div class="swiper-slide" id="image-slide-${index}">
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
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
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
