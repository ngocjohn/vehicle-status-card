/* eslint-disable @typescript-eslint/no-explicit-any */
import { css, CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';

import cardstyles from '../css/card.css';
import swipercss from '../css/swiper-bundle.css';
import {
  ButtonCardEntity,
  ButtonEntity,
  HomeAssistantExtended as HomeAssistant,
  VehicleStatusCardConfig,
} from '../types';
import { addActions } from '../utils/tap-action';

@customElement('vehicle-buttons-grid')
export class VehicleButtonsGrid extends LitElement {
  @property({ type: Array }) buttons: ButtonCardEntity = [];
  @property({ type: Object }) component?: any;
  @property({ type: Object }) config!: VehicleStatusCardConfig;
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() swiper: null | Swiper = null;

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
  }

  protected firstUpdated(changeProperties: PropertyValues): void {
    super.firstUpdated(changeProperties);

    this.updateComplete.then(() => {
      this.initSwiper();
    });
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
                  const { icon, notify, primary, secondary } = button;
                  return html`
                    <div
                      id="${`button-id-${index}`}"
                      class="grid-item click-shrink"
                      @click=${() => this._handleClick(index)}
                    >
                      <div class="item-icon">
                        <div class="icon-background">
                          <ha-icon id="${`button-action-${index}`}" .icon="${icon}"></ha-icon>
                        </div>
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

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has('buttons')) {
      this._setButtonActions();
    }
  }

  private _buttonGridGroup(buttons: ButtonEntity[], hideNotify: boolean): TemplateResult {
    const rowSize = this.config.layout_config?.button_grid?.rows || 2;
    const chunkedButtons = this._chunkArray(buttons, rowSize * 2);

    const slides = chunkedButtons.map((buttonsGroup) => {
      const buttons = html`
        <div class="grid-container">
          ${buttonsGroup.map((button) => {
            const { buttonIndex, icon, notify, primary, secondary } = button;
            return html`
              <div
                id="${`button-id-${buttonIndex}`}"
                class="grid-item click-shrink"
                @click=${() => this._handleClick(buttonIndex)}
              >
                <div class="item-icon">
                  <div class="icon-background">
                    <ha-icon .icon="${icon}" id="${`button-action-${buttonIndex}`}"></ha-icon>
                  </div>
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

  private _chunkArray(arr: ButtonEntity[], chunkSize: number): ButtonEntity[][] {
    const result: ButtonEntity[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  private _handleClick(index: number): void {
    const button = this.buttons[index];
    const buttonType = button.button_type;

    if (buttonType === 'default') {
      // Handle default button behavior, e.g., toggle the card or show content
      this.component._activeCardIndex = index;
    } else {
      // For non-default buttons, we rely on the action handlers set in addActions
    }
  }

  private _setButtonActions(): void {
    this.updateComplete.then(() => {
      const baseButtons = this.buttons.map((button) => button.button);

      baseButtons.forEach((button, index) => {
        const btnId = `button-action-${index}`;
        const btnElt = this.shadowRoot?.getElementById(btnId);

        // Only add actions if button_type is not 'default'
        if (this.buttons[index].button_type !== 'default' && btnElt) {
          addActions(btnElt, button.button_action);
          // console.log('Button action added:', button.button_action);
        } else {
          btnElt?.addEventListener('click', () => this._handleClick(index));
          // console.log('Default button action added:', index);
        }
      });
    });
  }

  private initSwiper(): void {
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    // console.log('swiper status init start');
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      centeredSlides: true,
      grabCursor: true,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      loop: false,
      modules: [Pagination],
      pagination: {
        clickable: true,
        el: paginationEl,
      },
      roundLengths: true,
      slidesPerView: 1,
      spaceBetween: 12,
      speed: 500,
    });
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
}
