import { forwardHaptic } from 'custom-card-helpers';
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

import cardstyles from '../css/card.css';
import { ButtonCardEntity, HA as HomeAssistant, VehicleStatusCardConfig, ButtonConfig, ButtonEntity } from '../types';
import { addActions } from '../utils/tap-action';
import { RenderTemplateResult, subscribeRenderTemplate } from '../utils/ws-templates';
import { VehicleStatusCard } from '../vehicle-status-card';

const TEMPLATE_KEYS = ['state_template', 'notify', 'color'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

@customElement('vehicle-buttons-grid')
export class VehicleButtonsGrid extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) card!: VehicleStatusCard;
  @property({ attribute: false }) config!: VehicleStatusCardConfig;
  @property({ type: Array }) buttons: ButtonCardEntity = [];

  @state() private _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};

  @state() private _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();
  private swiper: null | Swiper = null;

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  public isTemplate(button: ButtonConfig, key: TemplateKey) {
    const testTemplates = {
      state_template: button.secondary[0].state_template,
      notify: button.notify,
      color: button.color,
    };
    const value = testTemplates[key];
    return value?.includes('{');
  }

  private getValue(button: ButtonConfig, key: TemplateKey) {
    const testTemplates = {
      state_template: button.secondary[0].state_template,
      notify: button.notify,
      color: button.color,
    };
    return this.isTemplate(button, key) ? this._templateResults[key]?.result?.toString() : testTemplates[key];
  }

  private async _tryConnect(): Promise<void> {
    // console.log('Trying to connect');
    for (const button of this.buttons) {
      TEMPLATE_KEYS.forEach((key) => {
        this._tryConnectKey(button.button, key);
      });
    }
  }

  private async _tryConnectKey(button: ButtonConfig, key: TemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this.hass || !this.isTemplate(button, key)) {
      return;
    }
    const testTemplates = {
      state_template: button.secondary[0].state_template,
      notify: button.notify,
      color: button.color,
    };

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [key]: result,
          };
        },
        {
          template: testTemplates[key] ?? '',
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (_err) {
      const result = {
        result: testTemplates[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [key]: result,
      };
      this._unsubRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  protected async firstUpdated(changeProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changeProperties);
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (this.useSwiper) {
      this.updateComplete.then(() => {
        this.initSwiper();
        this._setButtonActions();
      });
    } else {
      this._setButtonActions();
    }
  }

  private _getTemplateValue(button: ButtonConfig, key: TemplateKey) {
    switch (key) {
      case 'state_template':
        const secondary = button.secondary[0];
        const state = secondary.state_template
          ? this.getValue(button, 'state_template') || ''
          : secondary.attribute && secondary.entity
          ? this.hass.formatEntityAttributeValue(this.hass.states[secondary.entity], secondary.attribute)
          : secondary.entity && this.hass.states[secondary.entity]
          ? this.hass.formatEntityState(this.hass.states[secondary.entity])
          : '';
        return state;
      case 'notify':
        const notify = button.notify ? this.getValue(button, 'notify') === 'true' : false;
        return notify;
      case 'color':
        const color = button.color ? this.getValue(button, 'color') || '' : '';
        return color;
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
    const button = this.buttons[buttonIndex]; // Array of button objects
    const { icon, primary } = button.button;
    // const { notify, state, entity, color } = this._secondaryInfo[buttonIndex];
    const notify = this._getTemplateValue(button.button, 'notify');
    const state = this._getTemplateValue(button.button, 'state_template');
    const entity = button.button.secondary[0].entity || '';
    const color = this._getTemplateValue(button.button, 'color');

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
