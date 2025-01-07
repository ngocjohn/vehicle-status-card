import { LovelaceCardConfig } from 'custom-card-helpers';
import 'leaflet-providers/leaflet-providers.js';
import L from 'leaflet';
import mapstyle from 'leaflet/dist/leaflet.css';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { SECTION, SECTION_ORDER } from '../const/const';
import { Address, MapData } from '../types';
import { createCloseHeading } from '../utils/create';
import { _getMapAddress, _setMapPopup } from '../utils/ha-helper';
import { VehicleStatusCard } from '../vehicle-status-card';

@customElement('mini-map-box')
export class MiniMapBox extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleStatusCard;
  @property({ type: Boolean }) private isDark!: boolean;
  @property({ type: Boolean }) open!: boolean;

  @state() private map: L.Map | null = null;
  @state() private marker: L.Marker | null = null;
  @state() private latLon: L.LatLng | null = null;
  @state() private tileLayer: L.TileLayer | null = null;
  @state() private mapCardPopup?: LovelaceCardConfig[];
  @state() private _addressReady = false;

  @state() private _address: Partial<Address> | null = null;

  private get mapPopup(): boolean {
    return this.card._config.mini_map?.enable_popup || false;
  }

  private get zoom(): number {
    return this.card._config.mini_map?.default_zoom || 14;
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('mapData') && this.mapData && this.mapData !== undefined) {
      this.initMap();
      this._getAddress();
    }
  }

  private async _getAddress(): Promise<void> {
    const { lat, lon } = this.mapData;
    if (!lat || !lon) return;
    const address = await _getMapAddress(this.card, lat, lon);
    if (address) {
      this._address = address;
      this._addressReady = true;
    } else if (!address) {
      this._addressReady = true;
    }
  }

  private calculateLatLngOffset(
    map: L.Map,
    lat: number,
    lng: number,
    xOffset: number,
    yOffset: number
  ): [number, number] {
    // Convert the lat/lng to a point
    const point = map.latLngToContainerPoint([lat, lng]);
    // Apply the offset
    const newPoint = L.point(point.x - xOffset, point.y - yOffset);
    // Convert the point back to lat/lng
    const newLatLng = map.containerPointToLatLng(newPoint);
    return [newLatLng.lat, newLatLng.lng];
  }

  private _computeMapStyle() {
    // const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const map_height = this.card._config.mini_map?.map_height ?? 150;
    const noHeader = this.card._config.layout_config?.hide.card_name || this.card._config.name?.trim() === '';
    const section_order = this.card._config.layout_config?.section_order || [...SECTION_ORDER];
    const firstItem = section_order[0] === SECTION.MINI_MAP && noHeader;
    const lastItem = section_order[section_order.length - 1] === SECTION.MINI_MAP;
    const single = section_order.includes(SECTION.MINI_MAP) && section_order.length === 1;

    let maskImage =
      'linear-gradient(to bottom, black 87%, transparent 100%), linear-gradient(to top, black 87%, transparent 100%)';

    if (lastItem && !firstItem) {
      maskImage = 'linear-gradient(to top, black 95%, transparent 100%)';
    } else if (firstItem && !lastItem) {
      maskImage = 'linear-gradient(to bottom, black 90%, transparent 100%)';
    } else if (single) {
      maskImage = 'linear-gradient(to bottom, transparent 0%, black 0%, black 100%, transparent 100%)';
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

  initMap(): void {
    // console.log('Initializing map...');
    const { lat, lon } = this.mapData;

    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
    };
    const mapContainer = this.shadowRoot?.getElementById('map') as HTMLElement;
    if (!mapContainer) return;
    this.map = L.map(mapContainer, mapOptions).setView([lat, lon], this.zoom);
    const offset: [number, number] = this.calculateLatLngOffset(this.map, lat, lon, this.map.getSize().x / 5, 3);

    this.latLon = L.latLng(offset[0], offset[1]);
    this.map.setView(this.latLon, this.zoom);

    // Add tile layer to map
    this.tileLayer = this._createTileLayer(this.map);
    // Add marker to map
    this.marker = this._createMarker(this.map);
  }

  private _createTileLayer(map: L.Map): L.TileLayer {
    // console.log('Creating tile layer...');
    const tileOpts = {
      tileSize: 256,
      className: 'map-tiles',
    };

    const provider = this.isDark ? 'CartoDB.Positron' : 'CartoDB.Voyager';
    const tileLayer = L.tileLayer.provider(provider, tileOpts).addTo(map);
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
      this._toggleMapDialog();
    });

    return marker;
  }

  private resetMap(): void {
    if (!this.map || !this.latLon) return;
    this.map.flyTo(this.latLon, this.zoom);
  }

  render(): TemplateResult {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return html`
      <div class="map-wrapper" ?safari=${isSafari} style=${this._computeMapStyle()}>
        <div id="map"></div>
        <div id="overlay-container"></div>
        <div class="reset-button" @click=${this.resetMap}>
          <ha-icon icon="mdi:compass"></ha-icon>
        </div>
        ${this._renderAddress()}
      </div>
      ${this._renderMapDialog()}
    `;
  }
  private _renderAddress(): TemplateResult {
    if (this.card._config.layout_config.hide.map_address) return html``;
    if (!this._addressReady) return html` <div class="address-line loading"><span class="loader"></span></div> `;

    const address = this._address || {};
    return html`
      <div class="address-line">
        <ha-icon icon="mdi:map-marker"></ha-icon>
        <div class="address-info">
          <span class="secondary">${address.streetNumber} ${address.streetName}</span>
          <span class="primary">${!address.sublocality ? address.city : address.sublocality}</span>
        </div>
      </div>
    `;
  }

  private _renderMapDialog() {
    if (!this.open) return html``;
    const styles = html`
      <style>
        ha-dialog {
          --mdc-dialog-min-width: 500px;
          --mdc-dialog-max-width: 600px;
          --dialog-backdrop-filter: blur(2px);
        }
        @media all and (max-width: 600px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 100vw;
            --mdc-dialog-max-width: 100vw;
            --mdc-dialog-min-height: 100%;
            --mdc-dialog-max-height: 100%;
            --vertical-align-dialog: flex-end;
            --ha-dialog-border-radius: 0;
          }
        }
      </style>
    `;
    return html`
      <ha-dialog
        open
        .heading=${createCloseHeading(this.card._hass, 'Map')}
        @closed=${() => (this.open = false)}
        hideActions
        flexContent
      >
        ${styles} ${this.mapCardPopup}
      </ha-dialog>
    `;
  }

  async _toggleMapDialog() {
    if (!this.mapPopup) return;
    if (this.mapCardPopup !== undefined) {
      this.open = !this.open;
      return;
    } else {
      _setMapPopup(this.card).then((popup) => {
        this.mapCardPopup = popup;
        setTimeout(() => {
          this.open = true;
        }, 50);
      });
    }
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
          background-color: rgb(from var(--ha-card-background, var(--card-background-color)) r g b / 15%);
          /* opacity: 0.6; */
          pointer-events: none;
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
            rgb(from var(--vic-map-marker-color) r g b / 35%) 100%
          );
          border-radius: 50%;
          border: none !important;
          /* opacity: 0.6; */
        }

        .marker::after {
          content: '';
          position: absolute;
          width: calc(50% + 1px);
          height: calc(50% + 1px);
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
