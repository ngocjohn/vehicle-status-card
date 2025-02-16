import * as maptilersdk from '@maptiler/sdk';
import mapstyle from '@maptiler/sdk/dist/maptiler-sdk.css';
import { LitElement, html, css, TemplateResult, unsafeCSS, CSSResultGroup, nothing } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';

import { ICON, MAPTILER_THEME } from '../../const/const';
import { carLocationIcon } from '../../const/img-const';
import { MapData } from '../../types';
import { VehicleStatusCard } from '../../vehicle-status-card';

const MAPTILER_STYLE = {
  dark: maptilersdk.MapStyle.STREETS.DARK,
  light: maptilersdk.MapStyle.STREETS,
  demo: 'https://demotiles.maplibre.org/style.json',
};

@customElement('vsc-maptiler-popup')
export class VscMaptilerPopup extends LitElement {
  @property({ attribute: false }) mapData!: MapData;
  @property({ attribute: false }) card!: VehicleStatusCard;

  @state() private _themeMode?: 'dark' | 'light';
  @state() private map!: maptilersdk.Map;
  @state() private _popup: maptilersdk.Popup | null = null;

  private _loadError: boolean = false;
  private observer?: MutationObserver | null;
  private _observerReady = false;

  connectedCallback(): void {
    super.connectedCallback();
    window.maptilerPopup = this;
    const mapConfigMode = this.card._config.mini_map?.theme_mode || 'auto';
    console.log('Map Config Mode:', mapConfigMode);
    if (mapConfigMode === 'auto') {
      this._themeMode = this.card.isDark ? 'dark' : 'light';
    } else {
      this._themeMode = mapConfigMode as 'dark' | 'light';
    }
    console.log('Theme Mode:', this._themeMode);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected async firstUpdated(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    this._initMap();
    if (this.map && !this._observerReady) {
      this._addObserver();
    }
  }

  private async _addObserver() {
    if (this._observerReady) return;
    // Initialize the MutationObserver to observe changes in the map controls
    this.observer = new MutationObserver((mutations) => {
      let themeChangeRequired = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          themeChangeRequired = true; // Only change theme if childList mutations are detected
        }
      });

      if (themeChangeRequired) {
        // Use requestAnimationFrame to debounce the theme change if multiple mutations occur
        requestAnimationFrame(() => {
          this._changeControlTheme();
        });
      }
    });
    // Wait for the map container to be available and observe changes in the controls
    const mapContainer = this.shadowRoot?.querySelector('#map') as HTMLElement;
    if (mapContainer) {
      const controlContainer = mapContainer.querySelector('.maplibregl-control-container') as HTMLElement;
      if (controlContainer) {
        console.log('controlContainer found');
        this.observer.observe(controlContainer, { childList: true, subtree: true });
        console.log('Observer added');
        this._observerReady = true; // Mark the observer as ready
      } else {
        console.log('controlContainer not found. Delaying observer addition.');
        // Retry observing after a small delay if controlContainer isn't available
        setTimeout(() => this._addObserver(), 500); // Adjust delay as needed
      }
    }
  }

  // Your existing change control theme logic here
  _changeControlTheme() {
    // Your existing implementation for applying themes to the controls
    const setTheme = (key: string) => this.getModeColor(key);

    const mapContainer = this.shadowRoot?.querySelector('#map') as HTMLElement;
    const controlContainer = mapContainer.querySelector('.maplibregl-control-container') as HTMLElement;

    if (controlContainer) {
      const controlButtons = [
        controlContainer?.querySelector('.maplibregl-ctrl-top-left'),
        controlContainer?.querySelector('.maplibregl-ctrl-top-right'),
        controlContainer?.querySelector('.maplibregl-ctrl-bottom-right'),
      ].filter(Boolean) as HTMLElement[];

      if (!controlButtons.length || controlButtons.length === 0) return;
      // Apply styles to control buttons
      for (const controlButtonGroup of controlButtons) {
        const controlGroups = Array.from(
          controlButtonGroup!.querySelectorAll('.maplibregl-ctrl.maplibregl-ctrl-group')
        );
        for (const controlGroup of controlGroups) {
          const element = controlGroup as HTMLElement;
          element.style.backgroundColor = setTheme('backgroundColor') as string;
          element.style.boxShadow = setTheme('boxShadow') as string;

          const buttons = Array.from(controlGroup.querySelectorAll('button'));
          for (const button of buttons) {
            const buttonEl = button as HTMLButtonElement;

            const spanEl = button?.querySelector('span') as HTMLSpanElement;
            if (spanEl) {
              const computedStyle = window.getComputedStyle(spanEl);
              const backgroundImage = computedStyle.backgroundImage;
              if (backgroundImage.startsWith('url("data:image/svg+xml')) {
                const fillColor = setTheme('fill') as string;
                const svgUri = backgroundImage.slice(5, -2);
                const decodedSvg = decodeURIComponent(svgUri.split(',')[1]);

                const updatedSvg = decodedSvg
                  .replace(/fill:[^;"]*/g, `fill:${fillColor}`)
                  .replace(/fill="[^"]*"/g, `fill="${fillColor}"`);

                const encodedSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(updatedSvg)}`;
                spanEl.style.backgroundImage = `url("${encodedSvg}")`;
              }
            }
            const prevButton = button?.previousElementSibling as HTMLButtonElement;
            if (prevButton && prevButton.type === 'button') {
              buttonEl.style.borderTop = setTheme('borderTop') as string;
            }
          }
        }
      }
    }
  }

  private _initMap(): void {
    const mapConfig = this.card._config.mini_map;
    const apiKey = mapConfig.maptiler_api_key;
    const defaultZoom = mapConfig.default_zoom || 13.5;
    const { lat, lon } = this.mapData;

    const mapEl = this.shadowRoot!.getElementById('map') as HTMLElement;
    maptilersdk.config.apiKey = apiKey;

    const mapOptions: maptilersdk.MapOptions = {
      container: mapEl,
      zoom: defaultZoom,
      style: this.getMapStyle(),
      // geolocateControl: false,
      fullscreenControl: true,
      navigationControl: false,
      canvasContextAttributes: { antialias: true },
    };

    this.map = new maptilersdk.Map(mapOptions);
    this.map.setCenter([lon, lat]);

    this.map.on('load', () => {
      const markerEl = this.addMarker() as HTMLElement;
      new maptilersdk.Marker({ element: markerEl }).setLngLat([lon, lat]).addTo(this.map!);
    });

    this.map.addControl(new maptilersdk.NavigationControl({ visualizePitch: true }), 'top-right');

    this.map.addControl(
      new maptilersdk.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'top-right'
    );
    this.map.addControl(
      {
        onAdd: () => {
          const geoElement = this._renderGeolocateControl() as HTMLElement;

          geoElement.style.display = 'unset';
          return geoElement;
        },
        onRemove: () => {
          return null;
        },
      },
      'top-right'
    );

    this.map.on('error', (e) => {
      console.log('Error loading map:', e.error);
      this._loadError = true;
      this.map.setStyle(MAPTILER_STYLE.demo);
      this.map.setZoom(5);
    });

    this.map.on('styleimagemissing', (e) => {
      this.map?.addImage(e.id, {
        width: 0,
        height: 0,
        data: new Uint8Array(0),
      });
    });
  }

  protected render(): TemplateResult {
    const haButtons = this._renderHaButtons();
    const loadError = this._renderLoadError();
    return html`
      <div class="tiler-map" style="${this._computeMapStyle()}">
        ${loadError}
        <div id="map">${haButtons}</div>
      </div>
    `;
  }

  private _renderGeolocateControl(): HTMLElement {
    const iconStyle = `background-image: url(${carLocationIcon}); background-size: 60%;`;
    const geolocateControl = document.createElement('div');
    geolocateControl.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    button.className = 'maplibregl-ctrl-geolocate';
    const span = document.createElement('span');
    span.className = 'maplibregl-ctrl-icon';
    span.style.cssText = iconStyle;
    button.appendChild(span);
    geolocateControl.appendChild(button);
    geolocateControl.style.display = 'none';

    return geolocateControl;
  }

  private addMarker(): HTMLElement {
    console.log('Adding marker');
    const pictureUrl = this.card._hass.states[this.card._config.mini_map?.device_tracker]?.attributes.entity_picture;

    const markerEl = document.createElement('div');

    markerEl.id = 'marker-container';
    markerEl.innerHTML = `
    <div class="pulse"></div>
    <button id="marker" style="background-image: url(${pictureUrl || 'none'})"></button>
  `;

    // Variables to manage the click and double-click events
    let clickTimeout: number | null = null; // Variable to track the click event
    let isDoubleClick = false; // Variable to track if a double-click event is detected

    markerEl.addEventListener('dblclick', (ev: MouseEvent) => {
      ev.stopPropagation();

      isDoubleClick = true;
      // If a click event is in progress, clear it (to avoid popup conflict)
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
    });

    markerEl.addEventListener('click', (ev: MouseEvent) => {
      ev.stopPropagation();

      // Set a small delay to differentiate between click and double-click
      clickTimeout = setTimeout(() => {
        // Handle single-click event
        if (!isDoubleClick) {
          if (this._popup?.isOpen()) {
            this._popup.remove();
            this._popup = null;
          } else {
            this._renderPopup();
          }
        }
        isDoubleClick = false;
      }, 250); // 250ms delay to distinguish between click and dblclick
    });

    return markerEl;
  }

  private async _renderPopup() {
    this._popup = new maptilersdk.Popup({ offset: 32, closeButton: false, closeOnMove: true }).setLngLat([
      this.mapData.lon,
      this.mapData.lat,
    ]);
    const deviceTracker = this.card._config.mini_map?.device_tracker;
    const stateObj = this.card._hass.states[deviceTracker];
    const deviceName = this.card._hass.formatEntityAttributeValue(stateObj, 'friendly_name');
    const deviceState = this.card._hass.formatEntityState(stateObj);

    let popupContent = `
      <div class="popup-content primary">
        <span>${deviceName}</span>
        <span>${deviceState}</span>
      </div>
    `;

    this._popup.setHTML(popupContent).addTo(this.map!);

    const mapAddress = this.mapData.address;

    if (mapAddress) {
      const { streetName, sublocality, city } = mapAddress;
      const addressLine = `
        <div class="popup-content">
          <span>${streetName}</span>
          <span>${sublocality}, ${city}</span>
        </div>
      `;

      const updatedContent = `${popupContent}${addressLine}`;
      if (this._popup.isOpen()) {
        this._popup.setHTML(updatedContent);
      }
    }

    this._popup.on('close', () => {
      this._popup = null;
    });
  }

  private _renderLoadError(): TemplateResult | typeof nothing {
    if (!this._loadError) return nothing;
    return html`<div id="error">
      <ha-alert alert-type="error">Error fetching the map. Please verify your API key and try again.</ha-alert>
    </div>`;
  }

  private _renderHaButtons(): TemplateResult {
    return html`
      <ha-icon-button
        id="ha-button"
        class="close-btn"
        .path="${ICON.CLOSE}"
        .label="${'Close'}"
        @click="${this._closeDialog}"
      ></ha-icon-button>
      <ha-icon-button
        id="ha-button"
        class="theme-toggle"
        .label="${this._themeMode === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}"
        .path="${ICON.THEME_LIGHT_DARK}"
        @click="${this._handleThemeToggle}"
      ></ha-icon-button>
    `;
  }

  private _closeDialog() {
    this.dispatchEvent(new CustomEvent('close-dialog', { bubbles: true, composed: true }));
  }

  private _handleThemeToggle() {
    const mode = this._themeMode;
    if (mode === 'dark') {
      this.map.setStyle(MAPTILER_STYLE.light, { diff: false });
      this._themeMode = 'light';
    } else {
      this.map.setStyle(MAPTILER_STYLE.dark, { diff: false });
      this._themeMode = 'dark';
    }
  }

  private getModeColor = (key: string): string => {
    return this._themeMode === 'dark' ? MAPTILER_THEME[key].dark : MAPTILER_THEME[key].light;
  };

  private getMapStyle() {
    return this._themeMode === 'dark' ? MAPTILER_STYLE.dark : MAPTILER_STYLE.light;
  }

  private _computeMapStyle() {
    const getStyle = (key: string) => this.getModeColor(key);

    const deviceTracker = this.card._config.mini_map?.device_tracker;
    const entityPic = this.card._hass.states[deviceTracker]?.attributes.entity_picture;

    const markerColor = this._themeMode === 'dark' ? 'var(--accent-color)' : 'var(--primary-color)';
    const picBgcolor = entityPic ? 'rgba(0, 0, 0, 0.5)' : markerColor;
    const markerSize = entityPic ? '3.5rem' : '2rem';
    const buttonBg = getStyle('backgroundColor');
    const buttonColor = getStyle('fill');
    const boxShadow = getStyle('boxShadow');
    const buttonBorder = getStyle('borderTop');

    return styleMap({
      '--vic-map-marker-color': markerColor,
      '--vic-map-marker-pic': picBgcolor,
      '--vic-map-marker-size': markerSize,
      '--vic-map-button-bg': buttonBg,
      '--vic-map-button-color': buttonColor,
      '--vic-map-button-shadow': boxShadow,
      '--vic-map-button-border': buttonBorder,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(mapstyle),
      css`
        .tiler-map {
          position: relative;
          width: 100%;
          height: 75vh;
          font-family: inherit;
        }
        @media all and (max-width: 600px), all and (max-height: 500px) {
          .tiler-map {
            height: 100vh;
          }
        }

        #error {
          position: absolute;
          top: 0.5rem;
          left: 50%;
          transform: translateX(-50%);
          background: var(--card-background-color);
          height: fit-content;
          display: flex;
          justify-content: center;
          z-index: 100;
        }

        #ha-button {
          position: absolute;
          z-index: 100;
          color: var(--vic-map-button-color);
          background-color: var(--vic-map-button-bg);
          box-shadow: var(--vic-map-button-shadow);
          border-radius: 50%;
          animation: fadeIn 600ms;
          --mdc-icon-button-size: 33px;
          margin: 10px;
        }
        .close-btn {
          top: 0.5rem;
          left: 0.5rem;
        }
        .theme-toggle {
          bottom: 0.5rem;
          right: 0.5rem;
        }

        .fade-in {
          animation: fadeIn 0.5s;
        }

        #map {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
        }

        #marker-container {
          position: relative;
          width: var(--vic-map-marker-size);
          height: var(--vic-map-marker-size);
        }
        #marker-container .pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: rgb(from var(--vic-map-marker-color) r g b / 1);
          border: 2px solid transparent;
          border-radius: 50%;
          animation: pulse 5s infinite;
        }

        button#marker {
          position: absolute;
          width: 100%;
          height: 100%;
          background-size: contain;
          background-color: rgb(from var(--vic-map-marker-color) r g b / 30%);
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          color: white;
        }

        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-top-left,
        .maplibregl-ctrl-top-right {
          padding: 0.5rem;
        }

        .maplibregl-popup-content {
          background-color: rgb(from var(--vic-map-button-bg) r g b / 80%);
          color: var(--vic-map-button-color);
          border-radius: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          animation: fadeIn 0.5s;
          backdrop-filter: blur(5px);
          border: var(--vic-map-button-border);
          box-shadow: var(--vic-map-button-shadow);
          font-size: 1rem;
          letter-spacing: 0.5px;
        }

        .maplibregl-popup-content .popup-content {
          display: flex;
          flex-direction: column;
        }

        .popup-content.primary > span:first-child {
          font-size: 1.1rem;
          font-weight: 500;
        }

        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
          border-top-color: rgb(from var(--vic-map-button-bg) r g b / 80%);
        }

        .maplibregl-ctrl-bottom-left > .maplibregl-ctrl:not(.maplibregl-map) {
          display: none !important;
        }

        .maplibregl-ctrl-bottom-right > details {
          display: none;
        }
        @media all and (max-width: 600px), all and (max-height: 500px) {
          .maplibregl-ctrl-top-right .maplibregl-ctrl.maplibregl-ctrl-group .maplibregl-ctrl-fullscreen {
            display: none !important;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(0.1);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-maptiler-popup': VscMaptilerPopup;
  }

  interface Window {
    maptilerPopup: VscMaptilerPopup;
  }
}
