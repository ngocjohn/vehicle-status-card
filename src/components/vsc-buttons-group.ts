import { css, CSSResultGroup, html, nothing, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, queryAll, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
// swiper
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

import { VscButtonCardItem } from '../components/shared/button/vsc-button-card-item';
import { COMPONENT } from '../constants/const';
import { BaseButtonCardItemConfig } from '../types/config/card/button-card';
import { SECTION } from '../types/section';
import '../components/shared/button/vsc-button-card-item';
import { BaseElement } from '../utils/base-element';

@customElement(COMPONENT.BUTTONS_GROUP)
export class VscButtonsGroup extends BaseElement {
  constructor() {
    super(SECTION.BUTTONS);
  }
  @state() private buttons: BaseButtonCardItemConfig[] = [];

  @state() private swiper?: Swiper;
  @state() private useSwiper!: boolean;

  @state() private _cardCurrentSwipeIndex?: number;
  @state() activeSlideIndex: number = 0;

  @queryAll(COMPONENT.BUTTON_CARD_ITEM) _buttonItems!: NodeListOf<VscButtonCardItem>;

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('_store') && this._store) {
      this.useSwiper = this._store.gridConfig.swipe || false;
      this.buttons = this._store.visibleButtons as BaseButtonCardItemConfig[];
    }
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (this.useSwiper) {
      this._initSwiper();
    }
    this._setUpButtonAnimation();
  }

  private _setUpButtonAnimation(): void {
    if (this._store.card._hasAnimated || this._store.card.isEditorPreview || !this.shadowRoot) return;
    this._store.card._hasAnimated = true;

    const runAnimation = () => {
      const buttons = this.shadowRoot?.querySelectorAll('vsc-button-card-item');
      if (!buttons || buttons.length === 0) return;

      buttons.forEach((btn: VscButtonCardItem) => {
        requestAnimationFrame(() => {
          btn._zoomInEffect();
        });
      });
      observer.disconnect();
    };

    const observer = new MutationObserver(() => {
      const buttons = this.shadowRoot?.querySelectorAll('vsc-button-card-item') as NodeListOf<HTMLElement>;

      if (buttons && buttons.length > 0) {
        requestAnimationFrame(() => runAnimation());
      }
    });

    observer.observe(this.shadowRoot, { childList: true, subtree: true });

    // Fallback in case MutationObserver doesn't trigger
    requestAnimationFrame(() => runAnimation());
  }

  protected render(): TemplateResult {
    const buttons = this.buttons;
    const { rows, columns } = this._store.gridConfig;
    const useSwiper = this.useSwiper;
    const total = this.useSwiper ? rows! * columns! : buttons.length;

    return html`
      <div
        class=${classMap({
          'buttons-group': true,
          'swiper-container': useSwiper,
        })}
        style=${this._computeStyle()}
      >
        <div class="swiper-wrapper">
          ${Array.from({ length: Math.ceil(buttons.length / total) }, (_, slideIndex) => {
            const start = slideIndex * total;
            const end = start + total;

            return html`
              <div class="swiper-slide">
                <div class="grid-container" data-slide-index=${slideIndex}>
                  ${buttons.slice(start, end).map((button, index) => {
                    const realIndex = start + index;
                    return this._renderButton(button, realIndex, slideIndex);
                  })}
                </div>
              </div>
            `;
          })}
        </div>
        ${this.useSwiper ? html`<div class="swiper-pagination"></div>` : nothing}
      </div>
    `;
  }

  private _renderButton(button: BaseButtonCardItemConfig, index: number, slideIndex: number): TemplateResult {
    return html`
      <vsc-button-card-item
        ._hass=${this._hass}
        ._store=${this._store}
        ._btnConfig=${button}
        .itemIndex=${index}
        .slideIndex=${slideIndex}
        @click-index=${this._handleClickIndex.bind(this)}
      ></vsc-button-card-item>
    `;
  }

  _handleClickIndex(ev: Event): void {
    ev.stopPropagation();
    const index = (ev.target as any).itemIndex;
    // console.debug('Button index clicked:', index);
    setTimeout(() => {
      this._store.card._currentSwipeIndex = this.activeSlideIndex;
      this._store.card._activeCardIndex = index;
    }, 50);
  }

  private _computeStyle() {
    const { columns } = this._store.gridConfig;
    // const minWidth = `calc((100% / ${columns}) - 8px)`;
    // const gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}, 1fr))`;
    const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    const paddingBottom = this.swiper?.isLocked || !this.useSwiper ? '0' : undefined;
    let marginTop: string | null = null;
    if (this.parentElement?.previousElementSibling !== null) {
      marginTop = 'var(--vic-card-padding)';
    }

    return styleMap({
      '--vsc-btn-template-columns': gridTemplateColumns,
      paddingBottom,
      marginTop,
    });
  }

  private _initSwiper(): void {
    if (!this.useSwiper) return;
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;

    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      // grabCursor: true,
      loop: false,
      modules: [Pagination],
      pagination: {
        clickable: true,
        el: paginationEl,
      },
      roundLengths: true,
      slidesPerView: 'auto',
      spaceBetween: 12,
      speed: 500,
      edgeSwipeDetection: true,
    });
    this.swiper?.on('slideChange', () => {
      this.activeSlideIndex = this.swiper?.activeIndex ?? 0;
    });
    if (
      this.swiper &&
      this._cardCurrentSwipeIndex !== undefined &&
      this._cardCurrentSwipeIndex !== this.activeSlideIndex
    ) {
      this.swiper.slideTo(this._cardCurrentSwipeIndex, 0, false);
    }
  }

  public highlightButton = (index: number | null): void => {
    this.updateComplete.then(() => {
      const buttonEls = this._buttonItems;

      if (index === null) {
        buttonEls.forEach((btn) => (btn.dimmedInEditor = false));
        return;
      }
      const buttonEl = buttonEls[index];
      if (!buttonEl) {
        return;
      }
      if (this.useSwiper && this.swiper) {
        const slideIndex = (buttonEl as any).slideIndex;
        if (slideIndex !== -1) {
          // console.debug('Highlight to slide index', slideIndex);
          this.swiper.slideTo(slideIndex, 0);
        }
      }
      buttonEls.forEach((btn, idx) => {
        btn.dimmedInEditor = idx !== index;
      });
    });
  };

  public peekButton = (index: number, keep: boolean = false): void => {
    this.updateComplete.then(() => {
      const buttonEls = this._buttonItems;
      const buttonEl = buttonEls[index];
      if (!buttonEl) {
        return;
      }
      buttonEl.dimmedInEditor = false;
      if (this.swiper) {
        const slideIndex = (buttonEl as any).slideIndex;
        if (slideIndex !== -1) {
          // console.debug('Peek to slide index', slideIndex);
          this.swiper.slideTo(slideIndex, 0);
        }
      }
      this._peekBtn(buttonEl, keep);
    });
  };

  private _peekBtn(buttonEl: VscButtonCardItem, keep: boolean = false): void {
    if (!buttonEl) return;

    const filtredBtns = Array.from(this._buttonItems).filter((btn) => btn !== buttonEl);
    const haCard = buttonEl._haCard;
    filtredBtns.forEach((btn) => (btn.dimmedInEditor = true));
    buttonEl._toggleHighlight();
    if (keep) return;
    haCard!.addEventListener('animationend', () => {
      filtredBtns.forEach((btn) => (btn.dimmedInEditor = false));
    });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      unsafeCSS(swipercss),
      css`
        :host {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
        }

        .buttons-group {
          padding: 0 0 var(--vic-card-padding) 0;
          border: none !important;
          background: none !important;
          overflow: visible;
        }
        .swiper-container {
          width: 100%;
          height: 100%;
        }
        .swiper-slide {
          width: 100%;
          height: auto;
        }

        /* .swiper-wrapper {
					flex-direction: initial;
					flex-wrap: wrap;
				} */
        .swiper-pagination {
          margin-top: var(--swiper-pagination-bottom);
          display: block;
        }
        .swiper-pagination-bullet {
          background-color: var(--swiper-theme-color);
          transition: all 0.3s ease-in-out !important;
        }
        .swiper-pagination-bullet-active {
          opacity: 0.7;
        }
        .button-item {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--divider-color);
          border-radius: inherit;
          width: 100%;
          /* height: 100%; */
          justify-content: center;
          white-space: nowrap;
          box-sizing: content-box;
        }
        .grid-container {
          grid-template-columns: var(--vsc-btn-template-columns);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-buttons-group': VscButtonsGroup;
  }
}
