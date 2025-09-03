import { LitElement, html, css, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { fireEvent } from '../../ha';
import { MenuItemConfig, DefaultActions, ActionType } from '../../utils/editor/create-actions-menu';
import { ICON } from '../../utils/mdi-icons';

declare global {
  interface HASSDomEvents {
    'badge-action-item': { action: string };
  }
}
@customElement('badge-editor-item')
export class BadgeEditorItem extends LitElement {
  @property({ attribute: false }) public _menuAction: MenuItemConfig[] = [];
  @property({ attribute: false }) public defaultAction: string | ActionType = 'edit-item';
  @property({ type: Boolean, attribute: 'hidden-overlay' })
  public hiddenOverlay = false;

  @property({ type: Boolean, attribute: 'no-edit' })
  public noEdit = false;

  @property({ type: Boolean, attribute: 'more-only' })
  public moreOnly = false;

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

  protected render(): TemplateResult {
    const showOverlay = (this._hover || this._menuOpened || this._focused) && !this.hiddenOverlay;
    this._menuAction = this._menuAction.length ? this._menuAction : DefaultActions;
    return html`
      <div class="button-wrapper"><slot></slot></div>
      <div class="button-overlay ${classMap({ visible: showOverlay })}">
        ${this.moreOnly
          ? nothing
          : this.noEdit
          ? html`
              <div class="control">
                <div class="control-overlay">
                  <ha-svg-icon .path=${ICON.CURSOR_MOVE}></ha-svg-icon>
                </div>
              </div>
            `
          : html`
              <div class="control" @click="${this._handleOverlayClick}" .action=${this.defaultAction}>
                <div class="control-overlay">
                  <ha-svg-icon .path=${ICON.PENCIL}></ha-svg-icon>
                </div>
              </div>
            `}
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
    this._overlayClick(ev);
  }

  private _overlayClick(ev): void {
    const action = (ev.currentTarget as any).action || this.defaultAction;
    fireEvent(this, 'badge-action-item', { action });
  }

  private _handleAction(ev): void {
    ev.stopPropagation();
    const action = (ev.currentTarget as any).action;
    fireEvent(this, 'badge-action-item', { action });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
          position: relative;
          height: 100%;
          --badge-border-radius: calc(var(--ha-badge-size, 36px) / 2);
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
          width: inherit;
        }

        .control {
          outline: none !important;
          cursor: pointer;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--badge-border-radius);
          z-index: 0;
        }

        .control-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.8;
          background-color: var(--primary-background-color);
          border: 1px solid var(--divider-color);
          border-radius: var(--badge-border-radius);
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
          --mdc-icon-size: 18px;
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
          --mdc-icon-button-size: 24px;
          --mdc-icon-size: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'badge-editor-item': BadgeEditorItem;
  }
}
