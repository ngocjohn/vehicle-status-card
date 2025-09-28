import { CSSResultGroup, TemplateResult, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { CARD_VERSION } from '../../constants/const';
import { BaseEditor } from '../../editor/base-editor';
import { CONFIG_TYPES, ELEMENT } from '../../editor/editor-const';
import { fireEvent } from '../../ha/common/dom/fire_event';
import { SectionOrder } from '../../types/config';
import { stopPropagation } from '../helpers-dom';
import { ICON } from '../mdi-icons';
import { _renderActionItem, CONFIG_AREA_ACTIONS } from './create-actions-menu';

type OptionConfig = {
  name: string;
  description?: string;
  doc?: string;
  subpanels?: Record<string, any>;
};

const DEFAULT = {
  name: CONFIG_TYPES.name,
  description: CONFIG_TYPES.description,
} as const;

const OptionKeys = Object.keys(CONFIG_TYPES.options) as Array<keyof typeof CONFIG_TYPES.options>;

type MenuSelectParams = {
  value?: string;
};

declare global {
  interface HASSDomEvents {
    'menu-value-changed': MenuSelectParams;
    'show-help': MenuSelectParams;
  }
}

@customElement('vsc-menu-element')
export class MenuElement extends BaseEditor {
  @property() public value?: string;
  @state() private _open = false;
  @query(ELEMENT.HA_BUTTON_MENU) _buttonMenu!: Element;

  protected render(): TemplateResult {
    const options = CONFIG_TYPES.options;
    const value = this.value;
    const isDefault = !value || value === 'default';
    const selected = options[value as keyof typeof options] as OptionConfig | undefined;
    const menuIcon = this._open ? 'mdi:close' : 'mdi:menu';

    return html`
      <div class="config-menu-wrapper">
        <div class="left-icons">
          ${!isDefault
            ? html`
                <div class="menu-icon click-shrink" @click=${() => this._handleItemClick('default')}>
                  <div class="menu-icon-inner"><ha-icon icon="mdi:home"></ha-icon></div>
                </div>
              `
            : nothing}

          <ha-button-menu
            .fullWidth=${true}
            .fixed=${true}
            .activatable=${true}
            .naturalMenuWidth=${true}
            @closed=${(ev: Event) => {
              ev.stopPropagation();
              this._open = false;
            }}
            @opened=${(ev: Event) => {
              ev.stopPropagation();
              this._open = true;
            }}
            @action=${this._handleItemClick}
          >
            <div id="menu-trigger" class="menu-icon click-shrink" slot="trigger">
              <div class="menu-icon-inner"><ha-icon .icon=${menuIcon}></ha-icon></div>
            </div>

            ${Object.entries(options).map(
              ([key, o]) => html`
                <ha-list-item .value=${key} .activated=${this.value === key}> ${o.name} </ha-list-item>
              `
            )}
          </ha-button-menu>
        </div>
        <div class="menu-wrapper">
          <div class="menu-content-wrapper">
            <div class="menu-label">
              ${isDefault
                ? html`
                    <span class="primary">${DEFAULT.name}</span>
                    <span class="secondary">${DEFAULT.description}</span>
                  `
                : html`<span class="primary">${selected?.name}</span>`}
            </div>

            ${isDefault || value === 'layout_config' ? nothing : this._renderSectionItem(value as SectionOrder)}
          </div>
        </div>
      </div>

      ${isDefault ? this._renderOptionsContent() : nothing}
    `;
  }

  private _renderSectionItem(section: SectionOrder): TemplateResult {
    const { total, indexInOrder } = this._getSectionInfo(section);
    // const docLink = CONFIG_TYPES.options[section]?.doc;
    const isHidden = indexInOrder === -1 || total <= 1;
    return html`
      <div class="menu-info-icon-wrapper">
        <div class="move-sec">
          <ha-icon-button
            ?hidden=${isHidden}
            .path=${ICON.MINUS}
            .disabled=${indexInOrder === 0}
            @click=${this._moveSectionUp.bind(this, section)}
          ></ha-icon-button>

          <ha-icon-button
            class="add-btn"
            @click=${() => this.openLayoutConfigModal(section)}
            .path=${isHidden ? ICON.PLUS : ''}
          >
            <div class="position-badge">${indexInOrder + 1}</div>
          </ha-icon-button>
          <ha-icon-button
            ?hidden=${isHidden}
            .path=${ICON.PLUS}
            .disabled=${indexInOrder === total - 1}
            @click=${this._moveSectionDown.bind(this, section)}
          ></ha-icon-button>
        </div>
        <div class="move-sec">
          <ha-button-menu
            .fixed=${true}
            .naturalMenuWidth=${true}
            .corner=${'BOTTOM_END'}
            .menuCorner=${'END'}
            @closed=${stopPropagation}
            @opened=${stopPropagation}
          >
            <ha-icon-button slot="trigger" .label=${'Options & Help'} .path=${ICON.DOTS_VERTICAL}></ha-icon-button>
            ${CONFIG_AREA_ACTIONS.map((item) => {
              return _renderActionItem({ item, onClick: this._handleAreaMenuAction });
            })}
          </ha-button-menu>
        </div>
      </div>
    `;
  }

  private _handleAreaMenuAction(ev: Event): void {
    const action = (ev.currentTarget as any).action;
    switch (action) {
      case 'show-area':
        this._handleHelpClick();
        break;
      case 'open-doc':
        const section = this.value || 'default';
        const docLink = CONFIG_TYPES.options[section]?.doc;
        if (docLink) {
          window.open(docLink, '_blank', 'noopener');
        }
        break;
      default:
        console.warn('Unknown action: ', action);
    }
  }
  private _moveSectionUp(section: SectionOrder) {
    this._moveSection(section, 'up');
  }
  private _moveSectionDown(section: SectionOrder) {
    this._moveSection(section, 'down');
  }

  private _renderOptionsContent(): TemplateResult {
    return html`<div class="tip-content">
        ${Object.entries(CONFIG_TYPES.options).map(
          ([key, { description, name }]) =>
            html`<div class="tip-item" @click="${() => this._handleItemClick(key)}" role="button" tabindex="0">
              <div class="tip-title">
                ${name}
                ${key === 'indicators' && this._legacyIndicator ? html`<span>New Config Format!</span>` : nothing}
              </div>
              <span>${description}</span>
            </div>`
        )}
      </div>
      <div class="version-footer">Version: ${CARD_VERSION}</div> `;
  }

  private _handleItemClick(event: CustomEvent | string): void {
    const selectedValue = typeof event === 'string' ? event : OptionKeys[event.detail.index];
    const value = selectedValue !== 'default' ? selectedValue : '';
    fireEvent(this, 'menu-value-changed', { value });
  }

  private _handleHelpClick() {
    console.debug('Help clicked: ', this.value);
    const value = this.value || 'default';
    this._dispatchEditorEvent('toggle-helper', value);
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin-bottom: var(--vic-gutter-gap);
        }
        .config-menu-wrapper {
          display: flex;
          align-items: center;
          height: 42px;
          margin-inline: 4px 8px;
          /* padding-block-end: 8px; */
        }
        .config-menu-wrapper .left-icons {
          display: inline-flex;
        }

        .config-menu-wrapper .menu-wrapper {
          display: inline-flex;
          width: 100%;
          height: 100%;
          position: relative;
        }

        .config-menu-wrapper .menu-info-icon-wrapper {
          display: inline-flex;
          /* gap: var(--vic-card-padding); */
          height: 100%;
          align-items: center;
          flex: 0;
        }
        .menu-info-icon-wrapper > .move-sec {
          display: flex;
          --mdc-icon-button-size: 36px;
          --mdc-icon-size: 18px;
          align-items: center;
        }
        ha-icon-button {
          color: var(--primary-text-color);
          /* width: 36px; */
          /* padding: 0; */
          margin: 0;
          /* --mdc-icon-size: 20px; */
          display: flex;
          height: 36px;
          align-items: center;
          align-content: stretch;
          justify-content: center;
        }

        ha-icon-button[disabled] {
          color: var(--disabled-text-color);
        }
        .menu-content-wrapper .menu-info-icon,
        .config-menu-wrapper .menu-icon {
          width: 36px;
          height: 36px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          cursor: pointer;
          color: var(--secondary-text-color);
          padding-inline-end: var(--vic-card-padding);
          /* transition: color 400ms cubic-bezier(0.075, 0.82, 0.165, 1); */
          pointer-events: auto;
        }
        .config-menu-wrapper .menu-icon.active,
        .config-menu-wrapper .menu-icon:hover {
          color: var(--primary-color);
        }

        .config-menu-wrapper .menu-icon-inner {
          position: relative;
          width: var(--vic-icon-size);
          height: var(--vic-icon-size);
          font-size: var(--vic-icon-size);
          border-radius: var(--vic-icon-border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--vic-icon-shape-color);
          transition-property: background-color, box-shadow;
          transition-duration: 280ms;
          transition-timing-function: ease-out;
        }

        .config-menu-wrapper .menu-content-wrapper {
          display: flex;
          justify-content: space-between;
          width: 100%;
          align-items: center;
          height: auto;
        }

        .menu-content-wrapper .menu-info-icon {
          padding-inline-end: 0;
        }

        .menu-content-wrapper .menu-info-icon:hover {
          color: var(--primary-color);
          background-color: rgba(var(--rgb-secondary-text-color), 0.1);
          transition: all 200ms ease-in-out;
        }

        ha-icon-button.add-btn {
          background-color: var(--app-header-edit-background-color, #455a64);
          border-radius: 50%;
          height: 24px;
          width: 24px;
        }
        .menu-content-wrapper .position-badge {
          display: block;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          line-height: var(--ha-line-height-normal);
          box-sizing: border-box;
          font-weight: var(--ha-font-weight-medium);
          text-align: center;
          font-size: var(--ha-font-size-m);
          background-color: var(--app-header-edit-background-color, #455a64);
          color: var(--app-header-edit-text-color, white);
          &:hover {
            background-color: var(--primary-color);
            color: white;
          }
        }

        .menu-content-wrapper.hidden {
          max-width: 0px;
          overflow: hidden;
          opacity: 0;
          transition: all 400ms cubic-bezier(0.075, 0.82, 0.165, 1);
          max-height: 0px;
        }

        .menu-content-wrapper .menu-label {
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-evenly;
          flex: 1;
        }

        .menu-content-wrapper .menu-label .primary {
          font-weight: 500;
          font-size: 1rem;
          white-space: nowrap;
          position: relative;
          text-overflow: ellipsis;
          overflow: hidden;
          text-transform: uppercase;
          line-height: 1;
        }

        .menu-content-wrapper .menu-label .secondary {
          color: var(--secondary-text-color);
          /* text-transform: capitalize; */
          letter-spacing: 0.5px;
          font-size: smaller;
          line-height: 150%;
        }

        .menu-selector.hidden {
          max-width: 0;
          overflow: hidden;
          opacity: 0;
        }

        .menu-selector {
          max-width: 100%;
          width: 100%;
          opacity: 1;
          display: flex;
          transition: all 400ms cubic-bezier(0.075, 0.82, 0.165, 1);
        }

        .tip-content {
          display: flex;
          flex-direction: column;
          margin-top: var(--vic-gutter-gap);
          gap: var(--vic-gutter-gap);
        }

        [role='button'] {
          cursor: pointer;
          pointer-events: auto;
        }
        [role='button']:focus {
          outline: none;
        }
        [role='button']:hover {
          background-color: var(--secondary-background-color);
        }

        .tip-item {
          /* background-color: #ffffff; */
          padding: var(--vic-gutter-gap);
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          transition: background-color 0.3s ease;
          /* pointer-events: all; */
        }

        /* .tip-item:hover {
        background-color: var(--secondary-background-color);
      } */

        .tip-title {
          font-weight: bold;
          text-transform: capitalize;
          color: var(--rgb-primary-text-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .tip-title > span {
          color: var(--primary-color) !important;
        }

        .tip-item span {
          color: var(--secondary-text-color);
        }

        .click-shrink {
          transition: transform 0.1s;
        }

        .click-shrink:active {
          transform: scale(0.9);
        }

        .version-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 0.5rem;
          margin-top: var(--vic-card-padding);
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-menu-element': MenuElement;
  }
}
