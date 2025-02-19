import * as maptilersdk from '@maptiler/sdk';
import mapstyle from '@maptiler/sdk/dist/maptiler-sdk.css';
import { LitElement, html, css, TemplateResult, unsafeCSS, CSSResultGroup, nothing } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';

import { ICON, MAPTILER_THEME } from '../../const/const';
import { STYLE_SCHEMA } from '../../const/maptiler-const';
import { MapData } from '../../types';
import { VehicleStatusCard } from '../../vehicle-status-card';

const MAPTILER_STYLE = {
  dark: 'STREETS.DARK',
  light: 'STREETS',
  demo: 'https://demotiles.maplibre.org/style.json',
};

@customElement('vsc-maptiler-popup')
export class VscMaptilerPopup extends LitElement {
  @property({ attribute: false }) mapData!: MapData;
  @property({ attribute: false }) card!: VehicleStatusCard;

  @state() private _themeMode?: 'dark' | 'light';
  @state() private map!: maptilersdk.Map;
  @state() private _popup: maptilersdk.Popup | null = null;
  @state() private _marker: maptilersdk.Marker | null = null;

  @state() private _currentStyle?: string;

  private _loadError: boolean = false;
  private observer?: MutationObserver | null;
  private _observerReady = false;

  connectedCallback(): void {
    super.connectedCallback();
    window.maptilerPopup = this;
    this._handleInitialTheme();
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

  protected updated(changedProps: Map<string | number | symbol, unknown>): void {
    if (changedProps.has('_themeMode') && this._themeMode !== undefined) {
      if (this._themeMode === 'dark') {
        localStorage.setItem('vsc-mapDark', 'true');
      } else {
        localStorage.removeItem('vsc-mapDark');
      }
    }

    if (changedProps.has('_currentStyle') && this._currentStyle !== undefined) {
      localStorage.setItem('vsc-mapStyle', this._currentStyle);
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
        this.observer.observe(controlContainer, { childList: true, subtree: true });
        this._observerReady = true; // Mark the observer as ready
      } else {
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

  private _handleInitialTheme() {
    const mapDark = localStorage.getItem('vsc-mapDark');
    const mapSelectedStyle = localStorage.getItem('vsc-mapStyle');
    if (mapDark) {
      console.log('Map Dark:', mapDark);
      this._themeMode = mapDark === 'true' ? 'dark' : 'light';
    } else if (mapSelectedStyle) {
      this._themeMode = mapSelectedStyle.includes('DARK') ? 'dark' : 'light';
    } else {
      const mapConfigMode = this.card._config.mini_map?.theme_mode || 'auto';
      if (mapConfigMode === 'auto') {
        this._themeMode = this.card.isDark ? 'dark' : 'light';
      } else {
        this._themeMode = mapConfigMode as 'dark' | 'light';
      }
    }

    if (mapSelectedStyle) {
      this._currentStyle = mapSelectedStyle;
    } else {
      this._currentStyle = this._themeMode === 'dark' ? MAPTILER_STYLE.dark : MAPTILER_STYLE.light;
      localStorage.setItem('vsc-mapStyle', this._currentStyle);
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
      geolocateControl: true,
      fullscreenControl: false,
      navigationControl: false,
      attributionControl: false,
      fadeDuration: 0,
      minZoom: 3,
      canvasContextAttributes: { antialias: true },
    };

    this.map = new maptilersdk.Map(mapOptions);
    this._changeMapStyle(this._currentStyle!);
    this.map.setCenter([lon, lat]);

    this.map.on('load', async () => {
      const markerEl = this.addMarker() as HTMLElement;
      this._marker = new maptilersdk.Marker({ element: markerEl }).setLngLat([lon, lat]).addTo(this.map!);
      markerEl.style.display = 'block';
      const geolocationIp = await maptilersdk.geolocation.info();
      const { country_languages } = geolocationIp;
      if (country_languages && country_languages.length > 0) {
        const language = country_languages[0];
        this.map.setLanguage(language);
      }
    });

    this.map.addControl(new maptilersdk.NavigationControl({ visualizePitch: true }), 'top-right');

    this.map.addControl(
      {
        onAdd: () => {
          const findCar = this._renderFindCarControl() as HTMLElement;
          findCar.style.display = 'unset';
          findCar.addEventListener('click', () => {
            const isBearing = this.map.getBearing() === 0;
            if (isBearing) {
              this.map.flyTo({ center: [lon, lat], zoom: 17.5, pitch: 45, bearing: -17.6 });
            } else {
              this.map.easeTo({ center: [lon, lat], zoom: defaultZoom, pitch: 0, bearing: 0 });
            }
          });
          return findCar;
        },
        onRemove: () => {
          return null;
        },
      },
      'top-right'
    );

    this.map.addControl(
      {
        onAdd: () => {
          const themeBtn = this._themeTogglerBtn() as HTMLElement;
          const haIcon = themeBtn.querySelector('ha-icon') as HTMLElement;
          themeBtn.style.display = 'unset';
          haIcon.style.color = 'var(--vic-map-button-color)';
          themeBtn.addEventListener('click', () => {
            this._handleThemeToggle();
            haIcon.setAttribute('icon', this.getModeColor('themeBtn') as string);
          });
          return themeBtn;
        },
        onRemove: () => {
          return null;
        },
      },
      'bottom-right'
    );

    this.map.on('click', () => {
      const sideBarEl = this.shadowRoot?.getElementById('left') as HTMLElement;
      const sidebarToggle = sideBarEl.querySelector('ha-icon-button.sidebar-toggle') as HTMLElement;
      const isCollapsed = sideBarEl.classList.contains('collapsed');
      if (isCollapsed) return;
      sideBarEl.classList.toggle('collapsed', !isCollapsed);
      sidebarToggle.classList.toggle('activated', isCollapsed);

      const padding = { left: isCollapsed ? 250 : 0 };
      this.map.easeTo({ padding, duration: 1000 });
    });

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

  private _renderOptionSelector(): TemplateResult {
    return html` <div id="left" class="sidebar flex-center left collapsed">
      <div class="sidebar-content rounded-rect">
        <div class="option-selector">
          ${STYLE_SCHEMA.map((schema) => {
            return html`
              <ha-selector
                .hass=${this.card._hass}
                .selector=${schema.selector}
                .label=${schema.name}
                .value=${this._currentStyle}
                @value-changed=${this._handleThemePicked}
                .required=${false}
              ></ha-selector>
            `;
          })}
        </div>
      </div>
      <ha-icon-button
        id="ha-button"
        class="sidebar-toggle left"
        .label="${'Change Map Style'}"
        .path="${ICON.CHEVRON_RIGHT}"
        @click="${this._toggleSidebar}"
      ></ha-icon-button>
    </div>`;
  }

  private _toggleSidebar(ev: Event) {
    ev.preventDefault();
    const target = ev.target as HTMLElement;
    const isCollapsed = target.parentElement?.classList.contains('collapsed');
    target.parentElement?.classList.toggle('collapsed', !isCollapsed);
    target.classList.toggle('activated', isCollapsed);
    const padding = { left: isCollapsed ? 250 : 0 };
    this.map.easeTo({ padding, duration: 1000 });
  }

  private _renderFindCarControl(): HTMLElement {
    const geolocateControl = document.createElement('div');
    geolocateControl.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    const haIcon = document.createElement('ha-icon');
    haIcon.setAttribute('icon', 'mdi:target');
    haIcon.style.color = 'var(--vic-map-button-color)';
    button.appendChild(haIcon);
    geolocateControl.appendChild(button);
    geolocateControl.style.display = 'none';

    return geolocateControl;
  }

  private _themeTogglerBtn(): HTMLElement {
    // const iconStyle = `background-image: url(${this._themeMode === 'dark' ? SUN_LIGHT_ICON : MOON_DARK_MODE});`;
    const themeBtn = document.createElement('div');
    themeBtn.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    const haIcon = document.createElement('ha-icon');
    haIcon.className = 'theme-btn';
    haIcon.setAttribute('icon', this.getModeColor('themeBtn') as string);
    button.appendChild(haIcon);
    themeBtn.appendChild(button);
    themeBtn.style.display = 'none';
    return themeBtn;
  }

  private addMarker(): HTMLElement {
    const deviceTracker = this.card._config.mini_map?.device_tracker;
    const stateObj = this.card._hass.states[deviceTracker];
    const pictureUrl = stateObj?.attributes.entity_picture;

    const markerEl = document.createElement('div');

    markerEl.className = 'marker-container';
    const pulseEl = document.createElement('div');
    pulseEl.className = 'pulse';
    markerEl.appendChild(pulseEl);
    const buttonEl = document.createElement('button');
    buttonEl.id = 'marker';
    buttonEl.style.backgroundImage = `url(${pictureUrl || 'none'})`;
    if (!pictureUrl) {
      buttonEl.style.backgroundColor = '#000';
      const haStateIcon = document.createElement('ha-state-icon') as any;
      haStateIcon.hass = this.card._hass;
      haStateIcon.stateObj = stateObj;
      haStateIcon.style.setProperty('--mdc-icon-size', '2.5rem');
      haStateIcon.style.color = '#fff';
      buttonEl.appendChild(haStateIcon);
    }
    markerEl.appendChild(buttonEl);

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

  private _handleThemePicked(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    this._currentStyle = value as string;
    localStorage.setItem('vsc-mapStyle', this._currentStyle);
    this._themeMode = this._currentStyle.includes('DARK') ? 'dark' : 'light';
    this._changeMapStyle(this._currentStyle);
  }

  private _changeMapStyle(style: string) {
    const selectedTheme = style.split('.');
    const maptilerTheme =
      selectedTheme.length === 2
        ? maptilersdk.MapStyle[selectedTheme[0]][selectedTheme[1]]
        : maptilersdk.MapStyle[selectedTheme[0]];
    this.map.setStyle(maptilerTheme, { diff: false });
  }

  private _renderHaButtons(): TemplateResult {
    // const themeSelector = this._renderThemeSelector();
    const optionSelector = this._renderOptionSelector();

    return html`
      <ha-icon-button
        id="ha-button"
        class="close-btn"
        .path="${ICON.CLOSE}"
        .label="${'Close'}"
        @click="${this._closeDialog}"
      ></ha-icon-button>
      ${optionSelector}
    `;
  }

  private _closeDialog() {
    this.dispatchEvent(new CustomEvent('close-dialog', { bubbles: true, composed: true }));
  }

  private _handleThemeToggle() {
    const currentStyle = this._currentStyle!.split('.')[0];
    const styleToChange = this._themeMode === 'dark' ? `${currentStyle}.LIGHT` : `${currentStyle}.DARK`;
    const mode = this._themeMode;
    if (mode === 'dark') {
      this._changeMapStyle(styleToChange);
      this._currentStyle = styleToChange;
      this._themeMode = 'light';
      console.log('Switching to Light Theme', styleToChange, 'Current Style:', this._currentStyle);
    } else {
      this._changeMapStyle(styleToChange);
      this._currentStyle = styleToChange;
      console.log('Switching to Dark Theme', styleToChange, 'Current Style:', this._currentStyle);
      this._themeMode = 'dark';
    }
  }

  private getModeColor = (key: string): string => {
    return this._themeMode === 'dark' ? MAPTILER_THEME[key].dark : MAPTILER_THEME[key].light;
  };

  private _computeMapStyle() {
    const getStyle = (key: string) => this.getModeColor(key);

    const deviceTracker = this.card._config.mini_map?.device_tracker;
    const entityPic = this.card._hass.states[deviceTracker]?.attributes.entity_picture;

    const markerColor = this._themeMode === 'dark' ? 'var(--accent-color)' : 'var(--primary-color)';
    const picBgcolor = entityPic ? 'rgba(0, 0, 0, 0.5)' : markerColor;
    // const markerSize = entityPic ? '3.5rem' : '2rem';
    const markerSize = '3.5rem';
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
        *:focus {
          outline: none;
        }
        :host {
          --mdc-radio-unchecked-color: var(--vic-map-button-color);
          --mdc-theme-text-primary-on-background: var(--vic-map-button-color);
        }

        .tiler-map {
          position: relative;
          width: 100%;
          height: 75vh;
          font-family: inherit;
          --mdc-radio-unchecked-color: var(--vic-map-button-color);
          --mdc-theme-text-primary-on-background: var(--vic-map-button-color);
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
          z-index: 100;
          color: var(--vic-map-button-color);
          background-color: var(--vic-map-button-bg);
          box-shadow: var(--vic-map-button-shadow);
          border-radius: 50%;
          animation: fadeIn 600ms;
          --mdc-icon-button-size: 33px;
          margin: 10px;
        }

        ha-icon-button[hidden] {
          display: none;
        }

        .close-btn {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
        }
        .theme-toggle.activated {
          transform: rotate(180deg);
          transition: transform 0.5s;
        }

        .theme-bottom {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          width: fit-content;
          display: flex;
        }

        .fade-in {
          animation: fadeIn 0.5s;
        }

        #mapstyles {
          z-index: 100;
          margin: auto 10px;
          background: var(--vic-map-button-bg);
          padding: 0.5rem;
          color: var(--vic-map-button-color);
          border-radius: 4px;
          border-color: transparent;
          box-shadow: var(--vic-map-button-shadow);
          max-width: 100%;
          opacity: 1;
          transition: max-width 0.5s ease-in, opacity 0.5s ease-in;
        }

        #mapstyles.hidden {
          opacity: 0;
          margin: 0;
          padding: 0;
          max-width: 0;
          border: none;
          transition: all 0.5s ease-out;
        }

        .rounded-rect {
          background: var(--vic-map-button-bg);
          color: var(--vic-map-button-color);
          border-radius: 10px;
          box-shadow: var(--vic-map-button-shadow);
        }
        .option-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
        }

        .flex-center {
          position: absolute;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .flex-center.left {
          left: 0px;
        }

        .flex-center.right {
          right: 0px;
        }

        .sidebar-content {
          position: absolute;
          width: 90%;
          height: 95%;
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Global scrollbar styles */
        .sidebar-content {
          scrollbar-width: thin;
          scrollbar-color: #70809030 #ffffff00;
        }

        .sidebar-content::-webkit-scrollbar {
          width: 10px;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background: #7080908e;
          width: 5px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: #7080908e;
          width: 5px;
        }

        .sidebar-content::-webkit-scrollbar-thumb:hover {
          background-color: #555;
        }

        .sidebar-content::-webkit-scrollbar-thumb:active {
          background-color: var(--vic-map-button-bg);
        }

        .sidebar-toggle {
          position: absolute;
          overflow: visible;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .sidebar-toggle.activated {
          transform: rotate(180deg);
          transition: transform 0.5s;
        }

        .sidebar-toggle.left {
          bottom: 10px;
          right: -4rem;
        }

        .sidebar {
          transition: transform 1s;
          z-index: 150;
          width: 250px;
          height: 100%;
        }
        .left.collapsed {
          transform: translateX(-245px);
        }

        #map {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
        }

        .marker-container {
          position: relative;
          width: var(--vic-map-marker-size);
          height: var(--vic-map-marker-size);
          display: none;
        }
        .marker-container .pulse {
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
          background-size: cover;
          /* background-color: rgb(from var(--vic-map-marker-color) r g b / 100%); */
          background-color: var(--vic-map-marker-color);
          border: 2px solid;
          border-radius: 50%;
          cursor: pointer;
          color: white;
        }

        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-top-left,
        .maplibregl-ctrl-top-right {
          padding: 0.5rem;
          color: var(--vic-map-button-color);
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

        span.maplibregl-ctrl-icon.custom-added {
          background-size: 60%;
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
            transform: scale(1.5);
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
