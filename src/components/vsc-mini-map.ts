// debugger
import { debug } from '../utils/debuglog';
// eslint-disable-next-line
const debuglog = debug.extend('mini-map');

import L from 'leaflet';
import 'leaflet-providers/leaflet-providers.js';
import mapstyle from 'leaflet/dist/leaflet.css';
import { css, CSSResultGroup, html, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { COMPONENT } from '../constants/const';
import { Address, MapData, MiniMapConfig } from '../types/config';
import { SECTION } from '../types/section';
import { isSafari } from '../utils';
import { BaseElement } from '../utils/base-element';
import { _getMapAddress } from '../utils/lovelace/create-map-card';
import { showHaMapDialog } from '../utils/lovelace/show-map-dialog';

export const DEFAULT_HOURS_TO_SHOW = 0;
export const DEFAULT_ZOOM = 14;

export const CARD_MAP_POSITION = ['default', 'top', 'bottom', 'single'] as const;
export type CardMapPosition = (typeof CARD_MAP_POSITION)[number];

const MAP_FILTER: Record<CardMapPosition, string> = {
  default: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
  top: 'linear-gradient(to bottom, black 80%, transparent 100%)',
  bottom: 'linear-gradient(to bottom, transparent 5%, black 20%)',
  single: 'linear-gradient(to bottom, transparent 0%, black 0%, black 100%, transparent 100%)',
};

const MARGIN_BLOCK: Record<CardMapPosition, string> = {
  default: 'auto',
  top: 'calc(-1 * var(--vic-card-padding)) auto',
  bottom: 'auto calc(-1 * var(--vic-card-padding))',
  single: `calc(-1 * var(--vic-card-padding))`,
};

@customElement(COMPONENT.MINI_MAP)
export class MiniMapBox extends BaseElement {
  constructor() {
    super(SECTION.MINI_MAP);
  }

  @property({ attribute: false }) public mapConfig!: MiniMapConfig;
  @property({ attribute: 'is-dark', type: Boolean, reflect: true })
  isDark!: boolean;
  @property({ type: String, reflect: true, attribute: 'map-position' }) public mapPosition: CardMapPosition = 'default';
  @state() private mapData?: MapData;

  @state() private map: L.Map | null = null;

  @state() private latLon: L.LatLng | null = null;
  @state() private marker: L.Marker | null = null;

  @state() private _addressReady = false;
  @state() private _locateIconVisible = false;
  private _address: Partial<Address> | null = null;

  @state() private _mapInitialized = false;

  private resizeObserver?: ResizeObserver;

  private get mapPopup(): boolean {
    return this.mapConfig?.enable_popup || false;
  }

  private get zoom(): number {
    return this.mapConfig?.map_zoom || 14;
  }

  private get useMapTiler(): boolean {
    return !!this.mapConfig.maptiler_api_key;
  }

  private get _deviceState(): string {
    const deviceTracker = this.mapConfig.device_tracker!;
    const stateObj = this._hass.states[deviceTracker];
    if (stateObj) {
      return this._hass.formatEntityState(stateObj);
    }
    return '';
  }

  private get _deviceNotInZone(): boolean {
    return this._hass.states[this.mapConfig.device_tracker!]?.state === 'not_home' || false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
    });
    this.updateComplete.then(() => {
      const container = this.shadowRoot?.getElementById('map');
      if (container) {
        this.resizeObserver!.observe(container);
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (!this.mapConfig) return;
    if (changedProperties.has('mapConfig') && this.mapConfig) {
      // console.log('Map config changed, resetting map...');
      const deviceTracker = this.mapConfig.device_tracker!;
      const stateObj = this._hass.states[deviceTracker];
      if (stateObj) {
        this.mapData = {
          lat: stateObj.attributes.latitude,
          lon: stateObj.attributes.longitude,
        };
        this._addressReady = false;
        this._address = null;
        this._mapInitialized = false;
        this.map = null;
        this.marker = null;
      }
    }

    if (changedProperties.has('_mapInitialized') && this._mapInitialized && this.map) {
      this.latLon = this._getTargetLatLng(this.map);
      this.map.invalidateSize();
      this.map.setView(this.latLon, this.zoom);
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has('mapData') && this.mapData && this.mapData !== undefined && !this.map) {
      // console.log('Map data changed, initializing map...');
      this.initMap();
      if (this.mapConfig?.hide_map_address !== true) {
        this._getAddress();
      }
    }
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    super.shouldUpdate(changedProperties);
    if (changedProperties.has('_hass') && changedProperties.get('_hass') !== undefined && this.map && this.mapData) {
      const { lat, lon } = this.mapData;
      const stateObj = this._hass.states[this.mapConfig.device_tracker!];
      if (stateObj) {
        const { latitude, longitude } = stateObj.attributes;
        if (lat !== latitude || lon !== longitude) {
          console.log('Updating map position...', { newLat: latitude, newLon: longitude });
          // Update map position
          this._addressReady = false;
          this.mapData.lat = latitude;
          this.mapData.lon = longitude;
          this.latLon = this._getTargetLatLng(this.map);
          this.marker?.setLatLng([latitude, longitude]);
          this.map.setView(this.latLon, this.zoom);
          this._getAddress();
        }
      }
    }

    return true;
  }

  protected firstUpdated(): void {
    this.mapPosition = this._computeMapPosition();
  }

  private async _getAddress(): Promise<void> {
    const { lat, lon } = this.mapData!;
    const address = await _getMapAddress(this.mapConfig, lat, lon);
    if (address) {
      this._address = address;
      this.mapData!.address = address;
      this._addressReady = true;
    } else if (!this._address) {
      this._addressReady = true;
    }
  }

  private initMap(): void {
    if (this._mapInitialized || this.map) return;
    // console.log('Initializing map...');
    const { lat, lon } = this.mapData!;
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
  }

  private _getTargetLatLng(map: L.Map): L.LatLng {
    const { lat, lon } = this.mapData!;
    const mapSizeSplit = map.getSize().x;
    const targetPoint = map.project([lat, lon], this.zoom).subtract([mapSizeSplit / 5, 3]);
    const targetLatLng = map.unproject(targetPoint, this.zoom);
    return targetLatLng;
  }

  private _createTileLayer(map: L.Map): L.TileLayer {
    const retina = L.Browser.retina;
    const tileOpts = {
      className: 'map-tiles',
      detectRetina: true,
      tileSize: retina ? 512 : 256,
      zoomOffset: retina ? -1 : 0,
      transparent: true,
      // opacity: 0.8,
    };

    const tileLayer = L.tileLayer.provider('CartoDB.Positron', tileOpts).addTo(map);
    return tileLayer;
  }

  private _createMarker(map: L.Map): L.Marker {
    const { lat, lon } = this.mapData!;
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
    return html`
      <div class="map-wrapper" ?safari=${isSafari}>
        <div id="overlay-container">
          <div class="reset-button" @click=${this.resetMap} .hidden=${this._locateIconVisible}>
            <ha-icon icon="mdi:compass"></ha-icon>
          </div>
          ${this._renderAddress()}
        </div>
        <div id="map"></div>
      </div>
    `;
  }

  private _renderAddress(): TemplateResult {
    const config = this.mapConfig;
    const hide = config?.hide_map_address ?? false;
    if (hide) return html``;

    const useZoneName = config?.use_zone_name ?? false;

    if (!this._addressReady) {
      return html`<div class="address-line loading"><span class="loader"></span></div>`;
    }

    const address = this._address || {};
    const inZone = !this._deviceNotInZone;
    // const inZone = this._hass.states[config.device_tracker]?.state !== 'not_home';

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

  private _toggleDialog(): void {
    if (!this.mapPopup) return;
    const params = {
      map_config: this.mapConfig,
      use_map_tiler: this.useMapTiler,
    };
    console.log('Opening map dialog...', params);
    showHaMapDialog(this, params);
  }

  private _computeMapPosition = (): CardMapPosition => {
    let position: CardMapPosition = 'default';
    const mapSec = this.parentNode as HTMLElement | null;
    if (!mapSec) return position;
    const { previousElementSibling, nextElementSibling } = mapSec;
    const hasCardName = this._store.hasCardName;
    if (!previousElementSibling && !nextElementSibling) {
      position = 'single';
    } else if (!previousElementSibling && nextElementSibling && !hasCardName) {
      position = 'top';
    } else if (previousElementSibling && !nextElementSibling) {
      position = 'bottom';
    } else {
      position = 'default';
    }

    const mapStyle = {
      '--vic-map-mask-image': MAP_FILTER[position],
      height: `${this.mapConfig?.map_height || 150}px`,
      'margin-block': MARGIN_BLOCK[position],
    };
    Object.entries(mapStyle).forEach(([key, value]) => {
      this.style.setProperty(key, value);
    });

    // debuglog('final map position:', position, 'margin-block:', MARGIN_BLOCK[position]);

    return position;
  };

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      unsafeCSS(mapstyle),
      css`
        :host {
          display: block;
          width: 100%;
          height: 100%;
          --vic-map-marker-color: var(--primary-color);
          --vic-marker-filter: none;
          --vic-map-tiles-filter: grayscale(1) contrast(1.1);
          --vic-address-line-color: var(--text-light-primary-color);
        }
        :host([is-dark]) {
          --vic-map-marker-color: var(--accent-color);
          --vic-marker-filter: contrast(1.2) saturate(6) brightness(1.3);
          --vic-map-tiles-filter: brightness(0.8) invert(0.9) contrast(2.1) brightness(2) opacity(27%) grayscale(1);
          /* --vic-map-tiles-filter: brightness(0.7) invert(1) contrast(2.8) brightness(1.8) opacity(0.17) grayscale(1); */
          --vic-address-line-color: var(--primary-text-color);
        }
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
          color: var(--vic-address-line-color, var(--primary-text-color));
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
          border: 2px solid var(--vic-address-line-color, var(--primary-text-color));
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
    'vsc-mini-map': MiniMapBox;
  }
}
