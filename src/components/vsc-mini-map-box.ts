import { mdiClose } from '@mdi/js';
import 'leaflet-providers/leaflet-providers.js';
import { LovelaceCardConfig } from 'custom-card-helpers';
import L from 'leaflet';
import mapstyle from 'leaflet/dist/leaflet.css';
import { css, CSSResultGroup, html, LitElement, nothing, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { SECTION, SECTION_ORDER } from '../const/const';
import { DEFAULT_HA_MAP_STYLES, MAPTILER_DIALOG_STYLES } from '../const/maptiler-const';
import './shared/vsc-maptiler-popup';
import { Address, HistoryStates, isComponentLoaded, MapData, subscribeHistory } from '../types';
import { _getHistoryPoints } from '../utils';
import { _getMapAddress, _setMapPopup } from '../utils/ha-helper';
import parseAspectRatio from '../utils/parse-aspect-ratio';
import { VehicleStatusCard } from '../vehicle-status-card';

export const DEFAULT_HOURS_TO_SHOW = 0;
export const DEFAULT_ZOOM = 14;

@customElement('mini-map-box')
export class MiniMapBox extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleStatusCard;
  @property({ type: Boolean }) private isDark: boolean = false;
  @property({ type: Boolean }) open!: boolean;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private latLon: L.LatLng | null = null;

  private mapCardPopup?: LovelaceCardConfig[];
  @state() private _addressReady = false;
  @state() private _locateIconVisible = false;
  private _address: Partial<Address> | null = null;

  private _subscribed?: Promise<(() => Promise<void>) | undefined>;
  private _stateHistory?: HistoryStates;
  private _historyPoints?: any | undefined;

  private _mapInitialized = false;

  private get mapPopup(): boolean {
    return this.card._config.mini_map?.enable_popup || false;
  }

  private get zoom(): number {
    return this.card._config.mini_map?.map_zoom || 14;
  }

  private get useMapTiler(): boolean {
    return !!this.card._config.mini_map.maptiler_api_key;
  }

  private get _deviceState(): string {
    const stateObj = this.card._hass.states[this.card._config.mini_map?.device_tracker];
    if (stateObj) {
      return this.card._hass.formatEntityState(stateObj);
    }
    return '';
  }

  private get _deviceNotInZone(): boolean {
    return this.card._hass.states[this.card._config.mini_map?.device_tracker].state === 'not_home';
  }

  public connectedCallback() {
    super.connectedCallback();
    this._subscribeHistory();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private _subscribeHistory() {
    const _config = this.card._config;
    const hass = this.card._hass;
    if (
      !isComponentLoaded(hass!, 'history') ||
      this._subscribed ||
      !(_config.mini_map?.hours_to_show ?? DEFAULT_HOURS_TO_SHOW)
    ) {
      return;
    }

    const historyPeriod = _config.mini_map?.history_period;
    const now = new Date();

    // Set custom time range for history
    // if history_period is set
    let startTime = new Date(now);
    let endTime = new Date(now);
    if (historyPeriod === 'today') {
      startTime.setHours(0, 0, 0, 0);
    } else if (historyPeriod === 'yesterday') {
      startTime.setDate(now.getDate() - 1);
      startTime.setHours(0, 0, 0, 0);
    } else {
      startTime = new Date(now.getTime() - 60 * 60 * (_config.mini_map?.hours_to_show ?? DEFAULT_HOURS_TO_SHOW) * 1000);
    }

    // console.log('History period:', historyPeriod, 'start:', startTime.toISOString(), 'end', endTime.toISOString());

    this._subscribed = subscribeHistory(
      hass!,
      (combinedHistory) => {
        if (!this._subscribed) {
          // Message came in before we had a chance to unload
          return;
        }
        this._stateHistory = combinedHistory;
        // console.log('History updated:', this._stateHistory);
      },
      new Date(startTime),
      new Date(endTime),
      [_config.mini_map!.device_tracker]
    ).catch((err) => {
      this._subscribed = undefined;
      console.error('Error subscribing to history', err);
      return undefined;
    });
  }

  private _unsubscribeHistory() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.updated(changedProperties);
    if (this.mapPopup && !this.useMapTiler && this.mapCardPopup === undefined) {
      this.mapCardPopup = await _setMapPopup(this.card);
    }
  }

  protected async updated(changedProperties: PropertyValues): Promise<void> {
    super.updated(changedProperties);
    if (changedProperties.has('mapData') && this.mapData && this.mapData !== undefined && !this.map) {
      this.initMap();
      if (this.card._config.mini_map?.hide_map_address !== true) {
        this._getAddress();
      }
    }
  }

  private getResponsivePopupSize(aspectRatio: string): { width: string; height: string } {
    const ratio = parseAspectRatio(aspectRatio);
    const w = ratio?.w;
    const h = ratio?.h;
    if (!w || !h) return { width: '85vw', height: 'auto' };

    const aspect = w / h;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxWidthPx = vw * 0.85;
    const maxHeightPx = vh * 0.95;

    let width = maxWidthPx;
    let height = width / aspect;

    if (height > maxHeightPx) {
      height = maxHeightPx;
      width = height * aspect;
    }

    const finalWidthVW = (width / vw) * 100;
    const finalHeightVW = (height / vw) * 100;

    return {
      width: `${finalWidthVW.toFixed(2)}vw`,
      height: `${finalHeightVW.toFixed(2)}vw`,
    };
  }

  private async _getAddress(): Promise<void> {
    const { lat, lon } = this.mapData;
    // console.log('Getting adress...');
    const address = await _getMapAddress(this.card, lat, lon);
    if (address) {
      this._address = address;
      this.mapData.address = address;
      this._addressReady = true;
    } else if (!this._address) {
      this._addressReady = true;
    }
  }

  private initMap(): void {
    if (this._mapInitialized || this.map) return;
    // console.log('Initializing map...');
    const { lat, lon } = this.mapData;
    const defaultZoom = this.zoom;
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
      zoom: defaultZoom,
    };

    const mapContainer = this.shadowRoot?.getElementById('map') as HTMLElement;
    if (!mapContainer) return;

    this.map = L.map(mapContainer, mapOptions).setView([lat, lon]);

    this.latLon = this._getTargetLatLng(this.map);

    // Add tile layer to map
    this._createTileLayer(this.map);
    // Add marker to map
    this.marker = this._createMarker(this.map);

    this.map.on('moveend zoomend', () => {
      // check visibility of marker icon on view
      const bounds = this.map!.getBounds();
      const isMarkerVisible = bounds.contains(this.marker!.getLatLng());
      this._locateIconVisible = isMarkerVisible;
      // console.log('Marker visible:', isMarkerVisible);
    });
    this._mapInitialized = true;
    this.map.invalidateSize();
    this.map.setView(this.latLon, this.zoom);
  }

  private _getTargetLatLng(map: L.Map): L.LatLng {
    const { lat, lon } = this.mapData;
    const mapSizeSplit = map.getSize().x;
    const targetPoint = map.project([lat, lon], this.zoom).subtract([mapSizeSplit / 5, 3]);
    const targetLatLng = map.unproject(targetPoint, this.zoom);
    return targetLatLng;
  }

  private _createTileLayer(map: L.Map): L.TileLayer {
    const tileOpts = {
      tileSize: 256,
      className: 'map-tiles',
    };

    const tileLayer = L.tileLayer.provider('CartoDB.Positron', tileOpts).addTo(map);
    return tileLayer;
  }

  private _createMarker(map: L.Map): L.Marker {
    const { lat, lon } = this.mapData;
    const customIcon = L.divIcon({
      html: `<div class="marker">
            </div>`,
      iconSize: [24, 24],
      className: 'marker',
    });

    // Add marker to map
    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    // Add click event listener to marker
    marker.on('click', () => {
      this._toggleDialog();
    });

    return marker;
  }

  private resetMap() {
    if (!this.map || !this.latLon) return;
    this.map.flyTo(this.latLon, this.zoom);
  }

  protected render(): TemplateResult {
    const maptilerKey = this.card._config.mini_map?.maptiler_api_key;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return html`
      <div class="map-wrapper" ?safari=${isSafari} style=${this._computeMapStyle()}>
        <div id="overlay-container">
          <div class="reset-button" @click=${this.resetMap} .hidden=${this._locateIconVisible}>
            <ha-icon icon="mdi:compass"></ha-icon>
          </div>
          ${this._renderAddress()}
        </div>
        <div id="map"></div>
      </div>
      ${maptilerKey ? this._renderMaptilerDialog() : this._renderMapDialog()}
    `;
  }

  private _renderAddress(): TemplateResult {
    const hide = this.card._config.mini_map?.hide_map_address ?? false;
    if (hide) return html``;

    const useZoneName = this.card._config.mini_map?.use_zone_name ?? false;

    if (!this._addressReady) {
      return html`<div class="address-line loading"><span class="loader"></span></div>`;
    }

    const address = this._address || {};
    const inZone = !this._deviceNotInZone;

    const addressContent =
      useZoneName && inZone
        ? html`<span class="primary">${this._deviceState}</span>`
        : html`
            <span class="secondary">${address.streetName}</span>
            <span class="primary">${address.sublocality || address.city}</span>
          `;

    return address?.streetName
      ? html`
          <div class="address-line">
            <ha-icon icon="mdi:map-marker"></ha-icon>
            <div class="address-info">${addressContent}</div>
          </div>
        `
      : html``;
  }

  private _renderMaptilerDialog(): TemplateResult | typeof nothing {
    if (!this.open || !this.useMapTiler) return nothing;
    // const pathData = this._getHistoryPoints();
    this._historyPoints = _getHistoryPoints(this.card._config.mini_map!, this._stateHistory);

    return html`
      <ha-dialog open @closed=${() => (this.open = false)} hideActions flexContent>
        ${MAPTILER_DIALOG_STYLES}
        <vsc-maptiler-popup
          .hass=${this.card._hass}
          .mapData=${this.mapData}
          .card=${this.card}
          ._paths=${this._historyPoints}
          ._sizes=${this.getResponsivePopupSize(this.card._config.mini_map?.aspect_ratio || '1.3')}
          @close-dialog=${() => {
            this.open = false;
          }}
        ></vsc-maptiler-popup>
      </ha-dialog>
    `;
  }

  private _renderMapDialog(): TemplateResult | typeof nothing {
    if (!this.open) return nothing;
    return html`
      <ha-dialog open @closed=${() => (this.open = false)} hideActions=${true} flexContent=${true}>
        <style>
          ${DEFAULT_HA_MAP_STYLES.toString()} .close-button {
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
        </style>
        <div id="hamap-wrapper" style="overflow: hidden;">
          <ha-icon-button
            .label=${this.card.hass?.localize('ui.dialogs.generic.close') ?? 'Close'}
            .path=${mdiClose}
            class="close-button"
            @click=${() => (this.open = false)}
          ></ha-icon-button>
          ${this.mapCardPopup}
        </div>
      </ha-dialog>
    `;
  }

  private _toggleDialog(): void {
    this.open = !this.open;
  }

  private _computeMapStyle() {
    // const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const map_height = this.card._config.mini_map?.map_height ?? 150;
    const noHeader = this.card._config.layout_config?.hide.card_name || this.card._config.name?.trim() === '';
    const section_order = this.card._config.layout_config?.section_order || [...SECTION_ORDER];
    const firstItem = section_order[0] === SECTION.MINI_MAP && noHeader;
    const lastItem = section_order[section_order.length - 1] === SECTION.MINI_MAP;
    const single = section_order.includes(SECTION.MINI_MAP) && section_order.length === 1;

    let maskImage = 'linear-gradient(to bottom, transparent 0%, black 15%, black 90%, transparent 100%)';

    if (lastItem && !firstItem) {
      maskImage = 'linear-gradient(to bottom, transparent 0%, black 10%)';
    } else if (firstItem && !lastItem) {
      maskImage = 'linear-gradient(to bottom, black 90%, transparent 100%)';
    } else if (single) {
      maskImage = 'linear-gradient(to bottom, transparent 0%, black 0%, black 100%, transparent 100%)';
    } else {
      maskImage;
    }

    const markerColor = this.isDark ? 'var(--accent-color)' : 'var(--primary-color)';
    const markerFilter = this.isDark ? 'contrast(1.2) saturate(6) brightness(1.3)' : 'none';
    const tileFilter = this.isDark
      ? 'brightness(0.7) invert(1) contrast(2.8)  brightness(1.8) opacity(0.17) grayscale(1)'
      : 'grayscale(1) contrast(1.1)';
    return styleMap({
      '--vic-map-marker-color': markerColor,
      '--vic-marker-filter': markerFilter,
      '--vic-map-tiles-filter': tileFilter,
      '--vic-map-mask-image': maskImage,
      height: `${map_height}px`,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(mapstyle),
      css`
        *:focus {
          outline: none;
        }
        .leaflet-container {
          background: transparent !important;
        }

        .map-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .map-wrapper[safari] {
          width: calc(100% + 0.6rem);
          left: -0.5rem;
        }

        .map-wrapper.loading {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #overlay-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          /* background-color: var(--ha-card-background, var(--card-background-color)); */
          /* background-color: rgb(from var(--ha-card-background, var(--card-background-color)) r g b / 15%); */
          /* opacity: 0.6; */
          /* pointer-events: none; */
        }

        #map {
          height: 100%;
          width: 100%;
          background-color: transparent !important;
          mask-image: var(--vic-map-mask-image);
          mask-composite: intersect;
        }

        .map-tiles {
          filter: var(--vic-map-tiles-filter, none);
          position: relative;
          width: 100%;
          height: 100%;
          /* z-index: 1; */
        }
        .marker {
          position: relative;
          width: 24px;
          height: 24px;
          /* filter: var(--vic-marker-filter); */
        }

        .marker::before {
          content: '';
          position: absolute;
          width: calc(100% + 1rem);
          height: calc(100% + 1rem);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-image: radial-gradient(
            circle,
            transparent 0%,
            rgb(from var(--vic-map-marker-color) r g b / 25%) 100%
          );
          border-radius: 50%;
          border: none !important;
          /* opacity: 0.6; */
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0;
          }
          30% {
            opacity: 0.5;
          }
          60% {
            transform: scale(2);
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        .marker::after {
          content: '';
          position: absolute;
          width: 50%;
          height: 50%;
          background-color: var(--vic-map-marker-color);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          /* border: 1px solid white; */
          transform: translate(-50%, -50%);
          opacity: 1;
          transition: all 0.2s ease;
        }

        .marker:hover::after {
          width: calc(60% + 1px);
          height: calc(60% + 1px);
        }

        .leaflet-control-container {
          display: none;
        }

        .reset-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 2;
          cursor: pointer;
          opacity: 0.5;
          &:hover {
            opacity: 1;
          }
        }

        .address-line {
          position: absolute;
          width: max-content;
          height: fit-content;
          bottom: 1rem;
          left: 1rem;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary-text-color);
          backdrop-filter: blur(2px);
          text-shadow: 0 0 black;
          ha-icon {
            color: var(--secondary-text-color);
          }
          .address-info {
            display: flex;
            flex-direction: column;
          }
          .address-info span {
            font-weight: 400;
            font-size: 12px;
            letter-spacing: 0.5px;
            line-height: 16px;
          }
          span.primary {
            text-transform: uppercase;
            opacity: 0.8;
            letter-spacing: 1px;
          }
        }
        .loader {
          width: 48px;
          height: 48px;
          display: inline-block;
          position: relative;
        }
        .loader::after,
        .loader::before {
          content: '';
          box-sizing: border-box;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid var(--primary-text-color);
          position: absolute;
          left: 0;
          top: 0;
          animation: animloader 2s linear infinite;
          opacity: 0;
        }
        .loader::after {
          animation-delay: 1s;
        }

        @keyframes animloader {
          0% {
            transform: scale(0);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mini-map-box': MiniMapBox;
  }
}
