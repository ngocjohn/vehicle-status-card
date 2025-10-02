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
const OVERLAY_ICON: Record<ActionType | string, string> = {
  'edit-item': ICON.PENCIL,
  'show-item': ICON.EYE,
  'delete-item': ICON.DELETE,
  'add-exclude-entity': ICON.CLOSE_CIRCLE,
  'remove-exclude-entity': ICON.CHECK_CIRCLE,
  'show-image': ICON.EYE,
};

export const DeleteAction: MenuItemConfig[] = [
  {
    title: 'Delete',
    action: 'delete-item',
    icon: 'mdi:delete',
    color: 'var(--error-color)',
  },
];

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

  @property({ type: Boolean, attribute: 'show-tooltip' })
  public showTooltip = false;

  @property({ type: Boolean, attribute: 'no-delete' })
  public noDelete = false;

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
    this._getElementStyle();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._documentClicked);
  }

  private _documentClicked = (ev) => {
    // console.log('composedPath', ev.composedPath(), 'includes this:', ev.composedPath().includes(this), this);
    this._hover = ev.composedPath().includes(this);
    document.removeEventListener('click', this._documentClicked);
  };

  private isDeleteAction(action: string): boolean {
    return /(delete|remove)/.test(action);
  }
  protected render(): TemplateResult {
    const showOverlay = (this._hover || this._menuOpened || this._focused) && !this.hiddenOverlay;
    this._menuAction = this._menuAction.length ? this._menuAction : DefaultActions;
    const isDelete = (this.isDeleteAction as (action: string) => boolean).bind(this);
    if (this.noDelete) {
      this._menuAction = this._menuAction.filter((a) => !isDelete(a.action));
    }

    // set delete action item to be the last item
    this._menuAction = [
      ...this._menuAction.filter((a) => !isDelete(a.action)),
      ...this._menuAction.filter((a) => isDelete(a.action)),
    ];

    let deleteFound = false;
    return html`
      <div class="button-wrapper"><slot></slot></div>
      <div
        class=${classMap({
          'button-overlay': true,
          visible: showOverlay,
        })}
      >
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
                  <ha-svg-icon .path=${OVERLAY_ICON[this.defaultAction] || ICON.PENCIL}></ha-svg-icon>
                  ${this.showTooltip
                    ? html`<span class="tooltip"
                        >${this._menuAction.find((a) => a.action === this.defaultAction)?.title}</span
                      >`
                    : nothing}
                </div>
              </div>
            `}
        ${this._menuAction.length === 1
          ? nothing
          : html`
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
                ${this._menuAction.map((item) => {
                  if (isDelete(item.action) && !deleteFound) {
                    deleteFound = true;
                    return this.noDelete
                      ? nothing
                      : html`
                          <li divider role="separator"></li>
                          ${this._renderActionItem(item)}
                        `;
                  }
                  return this._renderActionItem(item);
                })}
              </ha-button-menu>
            `}
      </div>
    `;
  }

  private _renderActionItem(item: MenuItemConfig): TemplateResult {
    const deleteClass = classMap({
      error: this.isDeleteAction(item.action),
    });
    return html`
      <ha-list-item
        graphic="icon"
        .action=${item.action}
        @click=${this._handleAction}
        class=${deleteClass}
        style="z-index: 6; ${item.color ? `color: ${item.color}` : ''}"
      >
        <ha-icon
          class=${deleteClass}
          .icon=${item.icon}
          slot="graphic"
          style="${item.color ? `color: ${item.color}` : ''}"
        ></ha-icon>
        ${item.title}
      </ha-list-item>
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

  private _getElementStyle = async () => {
    await this.updateComplete;
    // find style border-radius value in the slotted element
    const slot = this.shadowRoot!.querySelector('slot');
    const assignedElements = slot!.assignedElements({ flatten: true });
    if (assignedElements.length === 0) return;
    const el = assignedElements[0] as HTMLElement;
    // check if el has style border-radius, if not, check its first child element for border-radius
    let style = getComputedStyle(el);
    if (!style.borderRadius || style.borderRadius === '0px') {
      if (el.shadowRoot) {
        const childEl = el.shadowRoot.firstElementChild as HTMLElement;
        style = getComputedStyle(childEl);
      }
    }
    // set --overlay-radius to style border-radius or 12px if not found
    if (style.borderRadius && style.borderRadius !== '0px') {
      this.style.setProperty('--overlay-radius', style.borderRadius);
    }
    if (el.tagName.toLowerCase() === 'ha-badge') {
      const badge = el.shadowRoot?.querySelector('.badge') as HTMLElement;
      if (badge) {
        badge.style.setProperty('justify-content', 'var(--badge-editor-justify, center)');
        const infoClass = badge.querySelector('.info') as HTMLElement;
        if (infoClass) {
          infoClass.style.setProperty('text-align', 'var(--badge-editor-justify, center)');
        }
      }
    }
  };

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
          position: relative;
          height: 100%;
          --overlay-radius: var(--ha-card-border-radius, 12px);
          /* --badge-border-radius: calc(var(--ha-badge-size, 36px) / 2); */
        }
        li[divider] {
          margin: 4px 0;
          border-bottom: 1px solid var(--divider-color);
        }

        .secondary {
          color: var(--secondary-text-color);
        }

        .error {
          color: var(--error-color);
        }

        .warning {
          color: var(--error-color);
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
        .button-wrapper > ::slotted(ha-badge) {
          --badge-color: var(--primary-color);
        }
        .control {
          outline: none !important;
          cursor: pointer;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          /* border-radius: var(--badge-border-radius); */
          z-index: 0;
        }

        .control-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.8;
          background-color: var(--primary-background-color);
          border: 1px solid var(--divider-color);
          border-radius: var(--overlay-radius);
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
        .control .tooltip {
          flex: none;
          position: absolute;
          bottom: -28px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
          z-index: 1;
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
