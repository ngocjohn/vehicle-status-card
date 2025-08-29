import { LitElement, html, css, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { fireEvent } from '../../ha';
import { ICON } from '../../utils/mdi-icons';
import { BaseEditor } from '../base-editor';
import { ACTIONS } from '../editor-const';

declare global {
  interface HASSDomEvents {
    'button-grid-item-action': { action: string; buttonIndex: number };
  }
}

@customElement('panel-button-grid-item')
export class PanelButtonGridItem extends LitElement {
  @property({ attribute: false }) public primary!: string | number;
  @property({ attribute: false }) public secondary?: string | number;
  @property({ type: Number, attribute: 'button-index' })
  public buttonIndex!: number;
  @property({ type: Boolean, attribute: 'hidden-overlay' })
  public hiddenOverlay = false;

  @state()
  public _menuOpened = false;

  @state()
  public _hover = false;

  @state()
  public _focused = false;

  private _touchStarted = false;

  protected firstUpdated(): void {
    this.addEventListener('focus', () => {
      this._focused = true;
    });
    this.addEventListener('blur', () => {
      this._focused = false;
    });
    this.addEventListener(
      'touchstart',
      () => {
        this._touchStarted = true;
      },
      { passive: true }
    );
    this.addEventListener('touchend', () => {
      setTimeout(() => {
        this._touchStarted = false;
      }, 10);
    });
    this.addEventListener('mouseenter', () => {
      if (this._touchStarted) return;
      this._hover = true;
    });
    this.addEventListener('mouseleave', () => {
      this._hover = false;
    });
    this.addEventListener('click', () => {
      this._hover = true;
      document.addEventListener('click', this._documentClicked);
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._documentClicked);
  }

  private _documentClicked = (ev) => {
    this._hover = ev.composedPath().includes(this);
    document.removeEventListener('click', this._documentClicked);
  };

  private _menuAction = [
    { title: 'Edit', action: ACTIONS.EDIT_BUTTON, icon: 'mdi:pencil' },
    { title: 'Show Button', action: ACTIONS.SHOW_BUTTON, icon: 'mdi:eye' },
    { title: 'Duplicate', action: ACTIONS.DUPLICATE_BUTTON, icon: 'mdi:content-duplicate' },
    { title: 'Hide on card', action: ACTIONS.HIDE_BUTTON, icon: 'mdi:eye-off' },
    {
      title: 'Delete',
      action: ACTIONS.DELETE_BUTTON,
      icon: 'mdi:delete',
      color: 'var(--error-color)',
    },
  ];

  protected render(): TemplateResult {
    const showOverlay = (this._hover || this._menuOpened || this._focused) && !this.hiddenOverlay;

    return html`
      <div class="button-wrapper"><slot></slot></div>
      <div class="button-overlay ${classMap({ visible: showOverlay })}">
        <div class="control" @click="${this._handleOverlayClick}">
          <div class="control-overlay">
            <ha-svg-icon .path=${ICON.PENCIL}></ha-svg-icon>
          </div>
        </div>
        <ha-button-menu
          class="more"
          corner="TOP_LEFT"
          menu-corner="END"
          .fixed=${true}
          .naturalMenuWidth=${true}
          .activatable=${true}
          @closed=${(ev: Event) => {
            ev.stopPropagation();
            this._menuOpened = false;
          }}
          @opened=${(ev: Event) => {
            ev.stopPropagation();
            this._menuOpened = true;
          }}
        >
          <ha-icon-button slot="trigger" .path=${ICON.DOTS_VERTICAL}> </ha-icon-button>
          ${this._menuAction.map(
            (item) => html`<ha-list-item
              graphic="icon"
              .action=${item.action}
              @click=${this._handleAction}
              style="z-index: 6; ${item.color ? `color: ${item.color}` : ''}"
            >
              <ha-icon icon=${item.icon} slot="graphic" style="${item.color ? `color: ${item.color}` : ''}"></ha-icon>
              ${item.title}
            </ha-list-item>`
          )}
        </ha-button-menu>
      </div>
    `;
  }

  private _handleOverlayClick(ev): void {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    this._editCard();
  }

  private _editCard(): void {
    fireEvent(this, 'button-grid-item-action', { action: ACTIONS.EDIT_BUTTON, buttonIndex: this.buttonIndex });
  }

  private _handleAction(ev): void {
    ev.stopPropagation();
    const action = ev.currentTarget.action;
    fireEvent(this, 'button-grid-item-action', { action, buttonIndex: this.buttonIndex });
  }

  static get styles(): CSSResultGroup {
    return [
      BaseEditor.styles,
      css`
        :host {
          display: block;
          position: relative;
          height: 100%;
          width: 100%;
        }

        .button-overlay {
          position: absolute;
          opacity: 0;
          pointer-events: none;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 180ms ease-in-out;
        }
        .button-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .button-wrapper {
          position: relative;
          height: 100%;
          z-index: 0;
        }

        .control {
          outline: none !important;
          cursor: pointer;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ha-card-border-radius, 12px);
          z-index: 0;
        }

        .control-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.8;
          background-color: var(--primary-background-color);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-card-border-radius, 12px);
          z-index: 0;
          /* center the icon inside */
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .control ha-svg-icon {
          display: flex;
          position: relative;
          color: var(--primary-text-color);
          border-radius: 50%;
          padding: 8px;
          background: var(--secondary-background-color);
          --mdc-icon-size: 20px;
        }
        .more {
          position: absolute;
          right: -6px;
          top: -6px;
          inset-inline-end: -6px;
          inset-inline-start: initial;
        }
        .more ha-icon-button {
          cursor: pointer;
          border-radius: 50%;
          background: var(--secondary-background-color);
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
        }
      `,
    ];
  }
}
