import { LitElement, css, html, TemplateResult, PropertyValues, nothing, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators';
import { Pagination } from 'swiper/modules';

import Swiper from 'swiper';

import {
  ButtonEntity,
  VehicleStatusCardConfig,
  ButtonCardEntity,
  HomeAssistantExtended as HomeAssistant,
} from '../types';
import cardstyles from '../css/card.css';
import swipercss from '../css/swiper-bundle.css';

@customElement('vehicle-buttons-grid')
export class VehicleButtonsGrid extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) component?: any;
  @property({ type: Object }) config!: VehicleStatusCardConfig;
  @property({ type: Array }) buttons: ButtonCardEntity = [];

  @property() swiper: Swiper | null = null;

  static get styles(): CSSResultGroup {
    return [
      swipercss,
      css`
        #button-swiper {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
          padding-bottom: 12px;
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

  protected firstUpdated(changeProperties: PropertyValues): void {
    super.firstUpdated(changeProperties);
    this.updateComplete.then(() => {
      this.initSwiper();
    });
  }

  private initSwiper(): void {
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      modules: [Pagination],
      centeredSlides: true,
      grabCursor: true,
      speed: 500,
      roundLengths: true,
      spaceBetween: 12,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      loop: false,
      slidesPerView: 1,
      pagination: {
        el: paginationEl,
        clickable: true,
      },
    });
  }

  private _chunkArray(arr: ButtonEntity[], chunkSize: number): ButtonEntity[][] {
    const result: ButtonEntity[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  private _buttonGridGroup(buttons: ButtonEntity[], hideNotify: boolean): TemplateResult {
    const rowSize = this.config.layout_config?.button_grid?.rows || 2;
    const chunkedButtons = this._chunkArray(buttons, rowSize * 2);

    const slides = chunkedButtons.map((buttonsGroup) => {
      const buttons = html`
        <div class="grid-container">
          ${buttonsGroup.map((button) => {
            const { primary, secondary, icon, notify, buttonIndex } = button;
            return html`
              <div
                id="${`button-id-${buttonIndex}`}"
                class="grid-item click-shrink"
                @click=${() => (this.component._activeCardIndex = buttonIndex)}
              >
                <div class="item-icon">
                  <div class="icon-background"><ha-icon .icon="${icon}"></ha-icon></div>
                  ${!hideNotify
                    ? html`
                        <div class="item-notify ${notify ? '' : 'hidden'}">
                          <ha-icon icon="mdi:alert-circle"></ha-icon>
                        </div>
                      `
                    : nothing}
                </div>
                <div class="item-content">
                  <div class="primary">
                    <span class="title">${primary}</span>
                  </div>
                  <span class="secondary">${secondary}</span>
                </div>
              </div>
            `;
          })}
        </div>
      `;
      return html`<div class="swiper-slide">${buttons}</div>`;
    });
    return html`${slides}`;
  }

  protected render(): TemplateResult {
    const useSwiper = this.config.layout_config?.button_grid?.swipe || false;
    const hideNotify = this.config.layout_config?.hide?.button_notify || false;
    const baseButtons = this.buttons.map((button, index) => ({
      ...button.button, // Spread original button properties
      buttonIndex: index, // Add a buttonIndex property to each button
    }));

    return html`
      <section id="button-swiper">
        ${useSwiper
          ? html`
              <div class="swiper-container">
                <div class="swiper-wrapper">${this._buttonGridGroup(baseButtons, hideNotify)}</div>
                <div class="swiper-pagination"></div>
              </div>
            `
          : html`
              <div class="grid-container">
                ${baseButtons.map((button, index) => {
                  const { primary, secondary, icon, notify } = button;
                  return html`
                    <div
                      id="${`button-id-${index}`}"
                      class="grid-item click-shrink"
                      @click=${() => (this.component._activeCardIndex = index)}
                    >
                      <div class="item-icon">
                        <div class="icon-background"><ha-icon .icon="${icon}"></ha-icon></div>
                        ${!hideNotify
                          ? html`
                              <div class="item-notify ${notify ? '' : 'hidden'}">
                                <ha-icon icon="mdi:alert-circle"></ha-icon>
                              </div>
                            `
                          : nothing}
                      </div>
                      <div class="item-content">
                        <div class="primary">
                          <span class="title">${primary}</span>
                        </div>
                        <span class="secondary">${secondary}</span>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}
      </section>
    `;
  }

  public showButton(index: number): void {
    this.updateComplete.then(() => {
      const btnId = `button-id-${index}`;
      const gridBtns = this.shadowRoot?.querySelectorAll('.grid-item') as NodeListOf<HTMLElement>;
      const btnElt = this.shadowRoot?.getElementById(btnId) as HTMLElement;

      if (!btnElt) return;
      if (this.swiper) {
        const swiperSlides = this.shadowRoot?.querySelectorAll('.swiper-slide') as NodeListOf<HTMLElement>;
        let targetSlideIndex = -1;

        swiperSlides.forEach((slide, index) => {
          if (slide.contains(btnElt)) {
            targetSlideIndex = index;
          }
        });

        if (targetSlideIndex !== -1) {
          this.swiper?.slideTo(targetSlideIndex);

          // Wait until the slide transition completes
          setTimeout(() => {
            const filteredBtns = Array.from(gridBtns).filter((btn) => btn.id !== btnId);

            filteredBtns.forEach((btn) => {
              btn.style.opacity = '0.2';
            });

            btnElt.classList.add('redGlows');
            setTimeout(() => {
              filteredBtns.forEach((btn) => {
                btn.style.opacity = '';
              });
              btnElt.classList.remove('redGlows');
            }, 3000);
          }, 500);
        }
      } else {
        setTimeout(() => {
          const filteredBtns = Array.from(gridBtns).filter((btn) => btn.id !== btnId);

          filteredBtns.forEach((btn) => {
            btn.style.opacity = '0.2';
          });

          btnElt.classList.add('redGlows');
          setTimeout(() => {
            filteredBtns.forEach((btn) => {
              btn.style.opacity = '';
            });
            btnElt.classList.remove('redGlows');
          }, 3000);
        }, 500);
      }
    });
  }
}
