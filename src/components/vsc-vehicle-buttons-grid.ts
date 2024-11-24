import { forwardHaptic } from 'custom-card-helpers';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

import cardstyles from '../css/card.css';
import { ButtonCardEntity, HA as HomeAssistant, VehicleStatusCardConfig, ButtonEntity } from '../types';
import { addActions } from '../utils/tap-action';
import { VehicleStatusCard } from '../vehicle-status-card';
import './vsc-button-single';

@customElement('vehicle-buttons-grid')
export class VehicleButtonsGrid extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) card!: VehicleStatusCard;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;
  @property({ type: Array }) buttons: ButtonCardEntity = [];

  private swiper?: Swiper;

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
  }
  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);

    if (this.useSwiper) {
      this.updateComplete.then(() => {
        this.initSwiper();
        this._setButtonActions();
      });
    } else {
      this._setButtonActions();
    }
  }

  private get useSwiper(): boolean {
    return this.config.layout_config?.button_grid?.swipe || false;
  }

  private get hideNotify(): boolean {
    return this.config.layout_config?.hide?.button_notify || false;
  }

  protected render(): TemplateResult {
    if (!this.buttons || this.buttons.length === 0) {
      return html``;
    }
    const baseButtons = this.buttons.map((button, index) => ({
      ...button.button, // Spread original button properties
      buttonIndex: index, // Add a buttonIndex property to each button
    }));
    return html`
      <ha-card id="button-swiper">
        ${this.useSwiper
          ? html`
              <div class="swiper-container">
                <div class="swiper-wrapper">${this._buttonGridGroup(baseButtons, this.hideNotify)}</div>
                <div class="swiper-pagination"></div>
              </div>
            `
          : html`
              <div class="grid-container">
                ${baseButtons.map((button) => this._renderButton(button.buttonIndex, this.hideNotify))}
              </div>
            `}
      </ha-card>
    `;
  }

  private _buttonGridGroup(buttons: ButtonEntity[], hideNotify: boolean): TemplateResult {
    const rowSize = this.config.layout_config?.button_grid?.rows || 2;
    const chunkedButtons = this._chunkArray(buttons, rowSize * 2);

    const slides = chunkedButtons.map((buttonsGroup) => {
      const buttons = html`
        <div class="grid-container">
          ${buttonsGroup.map((button) => this._renderButton(button.buttonIndex, hideNotify))}
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

  private _renderButton(buttonIndex: number, hideNotify: boolean): TemplateResult {
    const button = this.buttons[buttonIndex]; // Array of

    return html`<vsc-button-single
      .hass=${this.hass}
      ._card=${this as any}
      ._buttonConfig=${button.button}
      .hideNotify=${hideNotify}
      .buttonIndex=${buttonIndex}
    ></vsc-button-single>`;
  }

  _handleClick(index: number): void {
    forwardHaptic('light');
    setTimeout(() => {
      const button = this.buttons[index];
      const buttonType = button?.button_type;
      if (buttonType === 'default') {
        this.card._activeCardIndex = index;
      }
    }, 150);
  }

  private _setButtonActions = (): void => {
    for (const [index, button] of this.buttons.entries()) {
      const buttonType = button.button_type;
      const buttonAction = button.button.button_action;
      const btnId = `button-action-${index}`;
      const singleButtons = this.shadowRoot?.querySelectorAll('vsc-button-single') as NodeListOf<HTMLElement>;
      singleButtons.forEach((single) => {
        const btnElt = single.shadowRoot?.getElementById(btnId) as HTMLElement;
        if (btnElt && buttonType === 'action' && buttonAction) {
          addActions(btnElt, buttonAction);
          console.log('Button action set for', btnId, 'with action:', buttonAction);
        } else {
          btnElt?.addEventListener('click', () => this._handleClick(index));
          console.log('default button action set for', btnId);
        }
      });
    }
  };

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

  public showButton = (index: number): void => {
    this.updateComplete.then(() => {
      const btnId = `button-id-${index}`;
      const gridBtns = this.shadowRoot?.querySelectorAll('.grid-item') as NodeListOf<HTMLElement>;
      const btnElt = this.shadowRoot?.getElementById(btnId) as HTMLElement;

      if (!btnElt) return;

      const highlightButton = () => {
        const filteredBtns = Array.from(gridBtns).filter((btn) => btn.id !== btnId);

        filteredBtns.forEach((btn) => (btn.style.opacity = '0.2'));
        btnElt.classList.add('redGlows');

        setTimeout(() => {
          filteredBtns.forEach((btn) => (btn.style.opacity = ''));
          btnElt.classList.remove('redGlows');
        }, 3000);
      };

      if (this.swiper) {
        const swiperSlides = this.shadowRoot?.querySelectorAll('.swiper-slide') as NodeListOf<HTMLElement>;
        const targetSlideIndex = Array.from(swiperSlides).findIndex((slide) => slide.contains(btnElt));

        if (targetSlideIndex !== -1) {
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

        .swiper-container,
        .swiper-wrapper {
          display: flex;
        }
        .swiper-slide,
        .swiper-pagination {
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
