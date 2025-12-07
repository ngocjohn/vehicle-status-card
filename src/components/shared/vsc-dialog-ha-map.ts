import { mdiClose } from '@mdi/js';
import { css, CSSResultGroup, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { DEFAULT_HA_MAP_STYLES } from '../../constants/maptiler-const';
import { HassDialog, HomeAssistant, LovelaceCardConfig, fireEvent } from '../../ha';
import { MiniMapConfig } from '../../types/config';
import { createSingleMapCard } from '../../utils/lovelace/create-map-card';
import { MapDialogParams } from '../../utils/lovelace/show-map-dialog';

enum CARD_TAG {
  HUI_MAP = 'hui-map-card',
  EXTRA_MAP = 'extra-map-card',
}

@customElement('vsc-dialog-ha-map')
export class VscDialogHaMap extends LitElement implements HassDialog<MapDialogParams> {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _params?: MapDialogParams;
  @state() private _mapConfig?: MiniMapConfig;
  @state() private _mapCard?: LovelaceCardConfig[];
  @state() private useMapTiler: boolean = false;

  @state() private _open: boolean = false;
  @state() private _loaded: boolean = false;

  @state() private _resizeObserver?: ResizeObserver;

  public async showDialog(params: MapDialogParams): Promise<void> {
    this._params = params;
    this._mapConfig = params.map_config;
    this.useMapTiler = params.use_map_tiler ?? false;
    this._open = true;
    if (!this._mapCard) {
      this._mapCard = await createSingleMapCard(this._mapConfig, this.hass);
      this._mapCard.map((card) => (card.hass = this.hass));
      this._loaded = true;
      this._setObserver();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.vscDialogHaMap = this;
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.vscDialogHaMap = undefined as any;
    this._resizeObserver?.disconnect();
  }

  protected async firstUpdated(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50)); // Ensure the dialog is fully rendered before applying styles
    this._setObserver();
  }

  private _setObserver(): void {
    this.updateComplete.then(() => {
      const mapTagName = this.useMapTiler ? CARD_TAG.EXTRA_MAP : CARD_TAG.HUI_MAP;
      const root = this.shadowRoot
        ?.querySelector(mapTagName)
        ?.shadowRoot?.querySelector('ha-card')
        ?.querySelector('#root') as HTMLElement;

      if (root) {
        this._resizeObserver = new ResizeObserver(() => {
          this._handleResize(root);
        });
        this._resizeObserver.observe(root);

        // Initial call to handle first render
        this._handleResize(root);
      }
    });
  }

  public closeDialog() {
    this._params = undefined;
    this._mapConfig = undefined;
    this._mapCard = undefined;
    this._loaded = false;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._open = false;
    fireEvent(this, 'dialog-closed', { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    return html`
      <ha-dialog open hideActions flexContent @closed=${this.closeDialog}>
        <div id="hamap-wrapper" style="overflow: hidden;">
          <ha-icon-button
            .label=${this.hass?.localize('ui.dialogs.generic.close') ?? 'Close'}
            .path=${mdiClose}
            class="close-button"
            ?left=${this.useMapTiler}
            @click=${this.closeDialog}
          ></ha-icon-button>
          ${!this._loaded || !this._mapCard
            ? html` <div class="loading-content">
                <ha-fade-in .delay=${500}><ha-spinner size="large"></ha-spinner></ha-fade-in>
              </div>`
            : html`${this._mapCard}`}
        </div>
      </ha-dialog>
    `;
  }

  private _handleResize(root: HTMLElement): void {
    const mq = window.matchMedia('(max-width: 800px)');
    if (mq.matches) {
      root.style.setProperty('height', '100%', 'important');
      root.style.setProperty('padding-bottom', '100%');
    }
  }

  static get styles(): CSSResultGroup {
    return [
      DEFAULT_HA_MAP_STYLES,
      css`
        .close-button {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 99999;
          cursor: pointer;
          opacity: 0.8;
          border-radius: 50%;
          background-color: var(--ha-card-background, var(--card-background-color));
          &:hover {
            opacity: 1;
          }
        }
        ha-icon-button.close-button[left] {
          left: 0.5rem;
          right: auto;
        }

        .loading-content {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }
        @media all and (max-width: 600px), all and (max-height: 500px) {
          #hamap-wrapper {
            overflow: hidden;
            width: 100vw;
            height: 100vh;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-dialog-ha-map': VscDialogHaMap;
  }
  interface Window {
    vscDialogHaMap: VscDialogHaMap;
  }
}
