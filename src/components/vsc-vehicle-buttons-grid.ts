import { forwardHaptic } from 'custom-card-helpers';
import { css, CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';

import cardstyles from '../css/card.css';
import swipercss from 'swiper/swiper-bundle.css';
import { ButtonCardEntity, HA as HomeAssistant, VehicleStatusCardConfig, ButtonConfig, ButtonEntity } from '../types';
import { getTemplateBoolean, getTemplateValue } from '../utils/ha-helper';
import { addActions } from '../utils/tap-action';
import { VehicleStatusCard } from '../vehicle-status-card';

export type CustomButtonItem = {
  notify: boolean;
  state: string;
  entity: string;
  color: string;
};

@customElement('vehicle-buttons-grid')
export class VehicleButtonsGrid extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) card!: VehicleStatusCard;
  @property({ type: Object }) config!: VehicleStatusCardConfig;
  @property({ type: Array }) buttons: ButtonCardEntity = [];

  @state() private _isButtonReady = false;
  @state() _secondaryInfo: CustomButtonItem[] = [];

  private swiper: null | Swiper = null;

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
  }

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
    this._fetchSecondaryInfo();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this.checkSecondaryChanged();
    }
  }

  private async _fetchSecondaryInfo(): Promise<void> {
    this._isButtonReady = false;
    // console.log('Custom Button Ready:', this._isButtonReady);

    const secondaryInfo: CustomButtonItem[] = [];

    for (const button of this.buttons) {
      const info = (await this._getSecondaryInfo(button.button)) as CustomButtonItem;
      secondaryInfo.push(info);
    }

    this._secondaryInfo = secondaryInfo;
    this._isButtonReady = true;

    // console.log('Custom Button Ready:', this._isButtonReady);
    if (this.useSwiper) {
      this.updateComplete.then(() => {
        this.initSwiper();
        this._setButtonActions();
      });
    } else {
      this._setButtonActions();
    }
  }
  private async _getSecondaryInfo(button: ButtonConfig): Promise<CustomButtonItem> {
    if (!button || !button.secondary) {
      return { notify: false, state: '', entity: '', color: '' };
    }

    const notify = button.notify ? await getTemplateBoolean(this.hass, button.notify) : false;

    const secondary = button.secondary[0];
    const entity = secondary.entity || '';

    const state = secondary.state_template
      ? await getTemplateValue(this.hass, secondary.state_template)
      : secondary.attribute && secondary.entity
        ? this.hass.formatEntityAttributeValue(this.hass.states[secondary.entity], secondary.attribute)
        : secondary.entity && this.hass.states[secondary.entity]
          ? this.hass.formatEntityState(this.hass.states[secondary.entity])
          : '';

    const color = button.color ? await getTemplateValue(this.hass, button.color) : '';
    return { notify, state, entity, color };
  }

  private async checkSecondaryChanged(): Promise<void> {
    let isChanged = false;
    const changedIndexes: number[] = [];

    // Ensure _secondaryInfo is an array before iterating
    if (!Array.isArray(this._secondaryInfo)) {
      console.error('_secondaryInfo is not an array');
      return;
    }

    for (const info of this._secondaryInfo) {
      const index = this._secondaryInfo.indexOf(info);
      const oldState = this._secondaryInfo[index].state;
      const oldNotify = this._secondaryInfo[index].notify;
      const oldColor = this._secondaryInfo[index].color;
      const { state, notify, color } = (await this._getSecondaryInfo(this.buttons[index].button)) as CustomButtonItem;
      if (oldState !== state || oldNotify !== notify || oldColor !== color) {
        isChanged = true;
        changedIndexes.push(index);
      }
    }

    if (isChanged) {
      // console.log('Secondary info changed:', isChanged, changedIndexes);
      const newSecondaryInfo = [...this._secondaryInfo]; // Spread to copy the existing array
      await Promise.all(
        changedIndexes.map(async (index) => {
          const { state, notify, entity, color } = (await this._getSecondaryInfo(
            this.buttons[index].button
          )) as CustomButtonItem;
          newSecondaryInfo[index] = { state, notify, entity, color };
        })
      );
      this._secondaryInfo = newSecondaryInfo;
      this.requestUpdate();
    }
  }

  private get useSwiper(): boolean {
    return this.config.layout_config?.button_grid?.swipe || false;
  }

  private get hideNotify(): boolean {
    return this.config.layout_config?.hide?.button_notify || false;
  }

  protected render(): TemplateResult {
    if (!this._isButtonReady) {
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
    const button = this.buttons[buttonIndex]; // Array of button objects
    const { icon, primary } = button.button;
    const { notify, state, entity, color } = this._secondaryInfo[buttonIndex];

    return html`
      <div
        id="${`button-id-${buttonIndex}`}"
        class="grid-item click-shrink"
        @click=${() => this._handleClick(buttonIndex)}
      >
        <div class="click-container" id="${`button-action-${buttonIndex}`}">
          <div class="item-icon">
            <div class="icon-background">
              <ha-state-icon
                .hass=${this.hass}
                .stateObj=${entity ? this.hass.states[entity] : undefined}
                .icon=${icon}
                style=${color ? `color: ${color}` : ''}
              ></ha-state-icon>
            </div>
            ${!hideNotify
              ? html`
                  <div class="item-notify" ?hidden=${!notify}>
                    <ha-icon icon="mdi:alert-circle"></ha-icon>
                  </div>
                `
              : nothing}
          </div>
          <div class="item-content">
            <div class="primary">
              <span>${primary}</span>
            </div>
            <span class="secondary">${state}</span>
          </div>
        </div>
      </div>
    `;
  }

  private _handleClick(index: number): void {
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
      const btnElt = this.shadowRoot?.getElementById(btnId);

      if (btnElt && buttonType === 'action' && buttonAction) {
        addActions(btnElt, buttonAction);
        // console.log('Button action set for', btnId, 'with action:', buttonAction);
      } else {
        btnElt?.addEventListener('click', () => this._handleClick(index));
      }
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
