import { html, css, CSSResultGroup, TemplateResult, PropertyValues, nothing } from 'lit';
import { customElement, property, query, queryAll, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import '../components/shared/vsc-indicator-item';
import { styleMap } from 'lit/directives/style-map.js';

import { VscIndicatorItem } from '../components/shared/vsc-indicator-item';
import { COMPONENT } from '../constants/const';
import { getGroupEntities, GroupEntity, isGroupEntity } from '../ha/data/group';
import {
  IndicatorRowGroupConfig,
  IndicatorRowConfig,
  IndicatorRowItem,
  IndicatorEntityConfig,
  GlobalAppearanceConfig,
} from '../types/config/card/row-indicators';
import { BaseElement } from '../utils/base-element';
import { ensureEntityConfig } from '../utils/editor/migrate-indicator';
import { ICON } from '../utils/mdi-icons';

type Alignment = 'default' | 'start' | 'center' | 'end' | 'justify';
const ALIGNS: Record<Alignment, string> = {
  default: 'space-evenly',
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  justify: 'space-between',
};

@customElement(COMPONENT.INDICATOR_ROW)
export class VscIndicatorRow extends BaseElement {
  @property({ attribute: false }) private rowConfig!: IndicatorRowConfig;
  @property({ type: Boolean, reflect: true }) private active = false;
  @property({ type: Number, attribute: 'row-index', reflect: true }) public rowIndex?: number;
  @property({ type: Number, attribute: 'item-index', reflect: true }) public itemIndex?: number | null = null;
  @property({ type: Boolean, reflect: true, attribute: 'editor-dimmed' }) public dimmedInEditor = false;

  @state() _selectedGroupId: number | null = null;
  @state() private _rowItems?: IndicatorRowItem[];

  @queryAll(COMPONENT.INDICATOR_ITEM) _itemEls!: NodeListOf<VscIndicatorItem>;
  @query('.indi-group-item', true) private _groupItemEl!: HTMLElement;
  @query('.indicator-row-container') private _rowEl!: HTMLElement;

  @state() private _showLeftArrow = false;
  @state() private _showRightArrow = false;

  @state() private _resizeObs?: ResizeObserver;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.rowConfig.no_wrap && this._rowEl) {
      // console.debug('Binding row events with connectedCallback');
      this._bindRowEvents();
      this._updateArrows();
    }
  }
  disconnectedCallback(): void {
    this._unbindRowEvents();
    super.disconnectedCallback();
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
    // Initialize or fetch any necessary data here
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for DOM
    if (this.rowConfig.no_wrap && this._rowEl) {
      this._bindRowEvents();
      this._updateArrows();
    }
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('rowConfig')) {
      this._rowItems = this.rowConfig.row_items;
    }
    if (_changedProperties.has('_selectedGroupId')) {
      this.active = this._selectedGroupId !== null;
    }
  }

  private _bindRowEvents(): void {
    const el = this._rowEl;
    if (!el) return;

    el.removeEventListener('scroll', this._onRowScroll); // avoid dupes
    el.addEventListener('scroll', this._onRowScroll, { passive: true });

    // Watch size changes (container or children)
    this._resizeObs?.disconnect();
    this._resizeObs = new ResizeObserver(() => this._updateArrows());
    this._resizeObs.observe(el);
    // Also observe children, since widths affect overflow
    Array.from(el.children).forEach((c) => this._resizeObs?.observe(c as Element));
  }

  private _unbindRowEvents(): void {
    const el = this._rowEl;
    if (el) el.removeEventListener('scroll', this._onRowScroll);
    this._resizeObs?.disconnect();
    this._resizeObs = undefined;
  }

  private _isRTL(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  private _onRowScroll = () => this._updateArrows();

  // Normalize scrollLeft values across RTL implementations
  private _getScrollLeft(el: HTMLElement): number {
    const raw = el.scrollLeft;
    if (!this._isRTL()) return raw;
    const max = el.scrollWidth - el.clientWidth;
    return raw < 0 ? -raw : max - raw;
  }

  private _updateArrows(): void {
    const el = this._rowEl;
    if (!el || !this.rowConfig.no_wrap) {
      this._showLeftArrow = false;
      this._showRightArrow = false;
      return;
    }

    const client = el.clientWidth;
    const scrollW = el.scrollWidth;

    // If content fits, within padding, hide both arrows
    if (scrollW <= client + 10) {
      this._showLeftArrow = false;
      this._showRightArrow = false;
      el.classList.add('no-arrow');
      return;
    }

    const left = this._getScrollLeft(el);

    // tiny epsilon to avoid flicker due to subpixel rounding
    const EPS = 1;

    const showLeft = left > EPS;
    const showRight = left + client < scrollW - EPS;

    if (this._showLeftArrow !== showLeft) this._showLeftArrow = showLeft;
    if (this._showRightArrow !== showRight) this._showRightArrow = showRight;
  }

  protected render(): TemplateResult {
    const rowItems = this._rowItems || [];
    const active = this.active;
    const noWrap = this.rowConfig.no_wrap;

    const alignment = this.rowConfig.alignment || 'default';
    const align = ALIGNS[alignment as Alignment] || ALIGNS.default;
    const globalAppearance = {
      ...this.rowConfig,
    } as GlobalAppearanceConfig;
    const groupActive = this._selectedGroupId !== null;
    const showLeftArrow = this._showLeftArrow;
    const showRightArrow = this._showRightArrow;

    let style: Record<string, string> = {};

    if (noWrap) {
      const overlayFade = this._computeOverlayFade(showLeftArrow, showRightArrow);
      style['--vsc-arrow-fade'] = overlayFade;
    } else {
      style['justifyContent'] = align;
    }

    // Set CSS variable for fade overlay, if showing either arrow left or right
    return html`
      <div class="row-wrapper">
        ${noWrap
          ? html`
              <div class="arrow-icon left" ?disabled=${groupActive} ?no-arrow=${!showLeftArrow}>
                <ha-svg-icon .path=${ICON.CHEVRON_LEFT} @click=${() => this._handleScroll(-1)}></ha-svg-icon>
              </div>
            `
          : nothing}
        <div class="indicator-row-container" ?active=${active} ?no-wrap=${noWrap} style=${styleMap(style)}>
          ${repeat(
            rowItems,
            (item: IndicatorRowItem) => item.type,
            (item: IndicatorRowItem, index: number) => {
              const active = this._selectedGroupId === index;
              const disabled = !active && this._selectedGroupId !== null;
              return html`
                <vsc-indicator-item
                  ._hass=${this._hass}
                  ._config=${item}
                  ._store=${this._store}
                  .itemIndex=${index}
                  .globalAppearance=${globalAppearance}
                  .active=${active}
                  ?disabled=${disabled}
                  data-index=${index}
                  data-type=${item.type}
                  @group-toggle=${this._toggleGroupIndicator}
                ></vsc-indicator-item>
              `;
            }
          )}
        </div>
        ${noWrap
          ? html`
              <div class="arrow-icon right" ?disabled=${groupActive} ?no-arrow=${!showRightArrow}>
                <ha-svg-icon .path=${ICON.CHEVRON_RIGHT} @click=${() => this._handleScroll(1)}></ha-svg-icon>
              </div>
            `
          : nothing}
      </div>
      <div class="indi-group-item">${this.renderGroupItem()}</div>
    `;
  }

  private renderGroupItem(): TemplateResult {
    if (this._selectedGroupId === null) return html``;
    const rowItems = this._rowItems || [];
    const activeIndex = this._selectedGroupId;

    const subItems: IndicatorEntityConfig[] = [];

    const config = rowItems[activeIndex] as IndicatorRowGroupConfig;
    const ignore_group_members = config.ignore_group_members ?? false;
    const exclude_entities = new Set(config.exclude_entities || []);
    const items = config.items || [];
    if (!ignore_group_members && config.entity && isGroupEntity(this.hass.states[config.entity])) {
      const stateObj = this.hass.states[config.entity] as GroupEntity;
      const groupEntities =
        getGroupEntities(stateObj)
          ?.filter((e) => !exclude_entities.has(e))
          .filter((e) => !items.map((i) => i.entity || i).includes(e)) || [];

      subItems.push(...ensureEntityConfig(groupEntities));
    }
    subItems.push(...ensureEntityConfig(items as (IndicatorEntityConfig | string)[]));

    return html`${subItems.map((item) => {
      return html`
        <vsc-indicator-item .hass=${this.hass} ._config=${item} ._store=${this._store}></vsc-indicator-item>
      `;
    })}`;
  }

  private _play(el: HTMLElement, cls: 'slideIn' | 'slideOut'): Promise<void> {
    return new Promise((resolve) => {
      el.classList.remove('slideIn', 'slideOut');

      // Apply attribute for the direction so keyframes start correctly
      if (cls === 'slideIn') el.setAttribute('active', '');
      // Force reflow so the animation picks up the "from" state
      void el.offsetHeight;

      el.classList.add(cls);
      el.addEventListener(
        'animationend',
        () => {
          el.classList.remove(cls);
          if (cls === 'slideOut') el.removeAttribute('active');
          resolve();
        },
        { once: true }
      );
    });
  }

  public async _toggleGroupIndicator(arg: CustomEvent | number | null): Promise<void> {
    let newIndex: number | null = null;

    if (arg === null) {
      // explicit close
      newIndex = null;
    } else if (typeof arg === 'number') {
      newIndex = arg;
      if (this.rowConfig.row_items[newIndex].type !== 'group') {
        // Not a group, ignore
        return;
      }
    } else {
      arg.stopPropagation();
      const { index, type } = arg.detail;
      // console.debug('Toggling group indicator', { index, type });
      if (type !== 'group' || index === undefined || isNaN(Number(index))) {
        // Not a group, ignore
        return;
      }
      newIndex = Number(index);
    }

    const el = this._groupItemEl;
    if (!el) return;

    const wasOpen = this._selectedGroupId !== null;
    const isSame = this._selectedGroupId === newIndex;

    // If something is open, animate it closed first
    if (wasOpen) {
      await this._play(el, 'slideOut');
      this._selectedGroupId = null;
      await this.updateComplete; // wait for DOM refresh
    }

    // If same index requested or explicit close (null), stop here
    if (isSame || newIndex === null) return;

    // Otherwise open the requested index
    this._selectedGroupId = newIndex;
    await this.updateComplete;
    await this._play(el, 'slideIn');
  }

  private _handleScroll(dir: number): void {
    const el = this._rowEl;
    if (!el) return;

    const current = this._getScrollLeft(el);
    const delta = Math.floor(el.clientWidth * 0.8) * (dir > 0 ? 1 : -1);
    const target = current + delta;

    if (!this._isRTL()) {
      el.scrollTo({ left: target, behavior: 'auto' });
    } else {
      const max = el.scrollWidth - el.clientWidth;
      // If browser uses negative, set negative; otherwise mirror from the right
      const usesNegative = el.scrollLeft < 0;
      const value = usesNegative ? -target : max - target;
      el.scrollTo({ left: value, behavior: 'auto' });
    }
    requestAnimationFrame(() => this._updateArrows());
  }

  public _resetItemsDimmed(): void {
    this._itemEls.forEach((item) => {
      item.dimmedInEditor = false;
    });
  }
  private _computeOverlayFade(showLeft: boolean, showRight: boolean): string {
    if (showLeft) {
      return 'linear-gradient(to right, transparent 0%, var(--card-background-color) 5%, transparent 20%)';
    } else if (showRight) {
      return 'linear-gradient(to left, var(--card-background-color) 0%, transparent 15%)';
    } else {
      return 'transparent';
    }
  }
  static get styles(): CSSResultGroup {
    return [
      css`
        :host([editor-dimmed]) {
          opacity: 0.3;
          /* transition: opacity 0.3s ease-in-out; */
        }
        :host(.disabled) {
          opacity: 0.2;
          transition: opacity 0.3s ease-in-out;
        }

        :host(.peek) {
          border-block: inset 1px var(--accent-color);
          transition: border-block 0.3s ease-in-out;
        }

        .row-wrapper {
          position: relative;
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .indicator-row-container {
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 100%;
          /* height: 100%; */
          justify-content: space-evenly;
          flex-wrap: wrap;
        }
        .indicator-row-container[no-wrap] {
          flex-wrap: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
          box-sizing: border-box;
          flex: 1 0 auto;
          max-width: calc(100% - 18px); /* leave space for arrows */
          justify-content: revert;
          margin-inline: auto;
        }
        .indicator-row-container[no-wrap].no-arrow {
          max-width: 100%;
        }

        .indicator-row-container[no-wrap]::-webkit-scrollbar {
          display: none;
        }
        .indicator-row-container[no-wrap] {
          scrollbar-width: none;
        }
        .indicator-row-container[no-wrap] > * {
          flex: 1 1 auto;
          min-width: max-content;
        }
        .indicator-row-container[no-wrap] > * {
          scroll-snap-align: center;
        }
        .indicator-row-container[no-wrap]::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          /* background: linear-gradient(to left, var(--card-background-color) 0%, transparent 20%); */
          background: var(--vsc-arrow-fade, transparent);
        }

        .arrow-icon {
          --mdc-icon-size: 18px;
          color: var(--secondary-text-color);
          /* background: rgba(var(--rgb-primary-background-color), 0.8); */
          /* border-radius: 50%; */
          opacity: 0.8;
          transition: opacity 0.3s ease-in-out;
          pointer-events: auto;
          cursor: pointer;
          flex: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          /* padding: 2px; */
        }
        .arrow-icon[no-arrow] {
          opacity: 0;
          pointer-events: none;
          cursor: default;
          max-width: 0;
          overflow: hidden;
          padding: 0;
        }
        .arrow-icon[disabled] {
          opacity: 0.3;
          pointer-events: none;
          cursor: default;
        }
        .arrow-icon:hover {
          color: var(--primary-color);
          opacity: 1;
        }

        .arrow-icon.right {
          margin-right: -4px;
          margin-inline-end: -4px;
        }
        .arrow-icon.left {
          margin-left: -4px;
          margin-inline-start: -4px;
        }

        .indi-group-item {
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          display: flex;
          border-radius: 8px;
          background: rgba(var(--rgb-secondary-background-color), 0.4);
          justify-content: space-evenly;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
        }

        .indi-group-item[active] {
          max-height: 500px;
          opacity: 1;
          margin-top: 8px;
        }

        /* during animations, disable transitions and keep final frame */
        .indi-group-item.slideIn,
        .indi-group-item.slideOut {
          transition: none;
          animation-fill-mode: both;
        }

        .indi-group-item.slideIn {
          animation: slide-in 400ms ease-in-out;
        }
        .indi-group-item.slideOut {
          animation: slide-out 400ms ease-in-out;
        }

        @keyframes slide-in {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: 500px;
            opacity: 1;
          }
        }
        @keyframes slide-out {
          from {
            max-height: 500px;
            opacity: 1;
          }
          to {
            max-height: 0;
            opacity: 0;
          }
        }
        vsc-indicator-item[disabled] {
          opacity: 0.7;
          transition: opacity 0.3s ease-in-out;
        }
        vsc-indicator-item[disabled]:hover {
          opacity: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-indicator-row': VscIndicatorRow;
  }
}
