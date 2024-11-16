import L from 'leaflet';
import 'leaflet-providers/leaflet-providers.js';
import mapstyle from 'leaflet/dist/leaflet.css';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { MapData } from '../types';
import { VehicleStatusCard } from '../vehicle-status-card';

@customElement('mini-map-box')
export class MiniMapBox extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleStatusCard;

  @state() private map: L.Map | null = null;
  @state() private marker: L.Marker | null = null;
  @state() private zoom = 16;

  private get darkMode(): boolean {
    return this.card.isDark;
  }

  private get mapPopup(): boolean {
    return this.card._config.mini_map?.enable_popup || false;
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('mapData')) {
      this.initMap();
    }
  }

  private _renderAddress(): TemplateResult {
    if (!this.mapData.address) {
      return html`<div class="address" style="left: 10%;"><span class="loader"></span></div>`;
    }
    const address = this.mapData?.address || {};
    return html`
      <div class="address">
        <div class="address-line">
          <ha-icon icon="mdi:map-marker"></ha-icon>
          <div>
            <span>${address.streetNumber} ${address.streetName}</span><br /><span
              style="text-transform: uppercase; opacity: 0.8; letter-spacing: 1px"
              >${!address.sublocality ? address.city : address.sublocality}</span
            >
          </div>
        </div>
      </div>
    `;
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

  private togglePopup(): void {
    const event = new CustomEvent('toggle-map-popup', {
      bubbles: true,
      composed: true,
      detail: {},
    });
    this.dispatchEvent(event);
  }

  private _computeMapStyle() {
    return styleMap({
      '--vic-map-marker-color': this.darkMode ? 'var(--accent-color)' : 'var(--primary-color)',
      '--vic-marker-filter': this.darkMode ? 'var(--vic-marker-dark-filter)' : 'var(--vic-marker-light-filter)',
      '--vic-map-tiles-filter': this.darkMode
        ? 'var(--vic-map-tiles-dark-filter)'
        : 'var(--vic-map-tiles-light-filter)',
    });
  }

  private updateMap(): void {
    if (!this.map || !this.marker) return;
    const { lat, lon } = this.mapData;
    const offset: [number, number] = this.calculateLatLngOffset(this.map, lat, lon, this.map.getSize().x / 5, 3);
    this.map.setView(offset, this.zoom);
    this.marker.setLatLng([lat, lon]);
  }

  initMap(): void {
    const { lat, lon } = this.mapData;
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
    };

    this.map = L.map(this.shadowRoot?.getElementById('map') as HTMLElement, mapOptions).setView([lat, lon], this.zoom);

    const mapboxToken = `pk.eyJ1IjoiZW1rYXkyazkiLCJhIjoiY2xrcHo5NzJwMXJ3MDNlbzM1bWJhcGx6eiJ9.kyNZp2l02lfkNlD2svnDsg`;
    const tileUrl = `https://api.mapbox.com/styles/v1/emkay2k9/clyd2zi0o00mu01pgfm6f6cie/tiles/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      tileSize: 512,
      zoomOffset: -1,
      className: 'map-tiles',
    }).addTo(this.map);

    // Define custom icon for marker
    const customIcon = L.divIcon({
      html: `<div class="marker">
              <div class="dot"></div>
              <div class="shadow"></div>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'marker',
    });

    // Add marker to map
    this.marker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);
    // Add click event listener to marker
    if (this.mapPopup) {
      this.marker.on('click', () => {
        this.togglePopup();
      });
    }

    this.updateComplete.then(() => {
      this.updateMap();
    });
  }

  render(): TemplateResult {
    if (!this.mapData) return html`<div class="map-wrapper loading"><span class="loader"></span></div>`;
    return html`
      <div class="map-wrapper" style=${this._computeMapStyle()}>
        <div id="map"></div>
        <div class="map-overlay"></div>
        <div class="reset-button" @click=${this.updateMap}>
          <ha-icon icon="mdi:compass"></ha-icon>
        </div>
        ${this._renderAddress()}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(mapstyle),
      css`
        *:focus {
          outline: none;
        }
        :host {
          --vic-map-marker-color: var(--primary-color);
          --vic-map-tiles-light-filter: none;
          --vic-map-tiles-dark-filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3)
            brightness(0.7);
          --vic-map-tiles-filter: var(--vic-map-tiles-light-filter);
          --vic-marker-dark-filter: brightness(1) contrast(1.2) saturate(6) brightness(1.3);
          --vic-marker-light-filter: none;
          --vic-maker-filter: var(--vic-marker-light-filter);
          --vic-map-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%),
            linear-gradient(to bottom, transparent 10%, black 20%, black 90%, transparent 100%);
        }
        .map-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        .map-wrapper.loading {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--card-background-color);
          opacity: 0.6; /* Adjust the opacity as needed */
          pointer-events: none; /* Ensure the overlay does not interfere with map interactions */
        }
        #map {
          height: 100%;
          width: 100%;
          background: transparent !important;
          mask-image: var(--vic-map-mask-image);
          mask-composite: intersect;
        }

        .map-tiles {
          filter: var(--vic-map-tiles-filter, none);
        }

        .marker {
          position: relative;
          width: 46px;
          height: 46px;
          filter: var(--vic-marker-filter);
        }

        .dot {
          position: absolute;
          width: 14px;
          height: 14px;
          background-color: var(--vic-map-marker-color);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          border: 1px solid white;
          transform: translate(-50%, -50%);
          opacity: 1;
        }
        .shadow {
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle, var(--vic-map-marker-color) 0%, transparent 100%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: none !important;
          opacity: 0.6;
        }
        .marker:hover .dot {
          filter: brightness(1.2);
        }
        .leaflet-control-container {
          display: none;
        }
        .reset-button {
          position: absolute;
          top: 15%;
          right: 1rem;
          z-index: 2;
          cursor: pointer;
          opacity: 0.5;
          &:hover {
            opacity: 1;
          }
        }
        .address {
          position: absolute;
          width: max-content;
          height: fit-content;
          top: 50%;
          left: 1rem;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          flex-direction: column;
          gap: 0.5rem;
          color: var(--primary-text-color);
          backdrop-filter: blur(1px);
          .address-line {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            text-shadow: 0 0 black;
            span {
              font-size: 0.9rem;
            }
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
          border: 2px solid #fff;
          position: absolute;
          left: 0;
          top: 0;
          animation: animloader 2s linear infinite;
        }
        .loader::after {
          animation-delay: 1s;
        }

        @keyframes animloader {
          0% {
            transform: scale(0);
            opacity: 1;
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
