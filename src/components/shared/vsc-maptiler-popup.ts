import * as maptilersdk from '@maptiler/sdk';
import { helpers } from '@maptiler/sdk';
import mapstyle from '@maptiler/sdk/dist/maptiler-sdk.css';
import * as turf from '@turf/turf';
import { LitElement, html, css, TemplateResult, unsafeCSS, CSSResultGroup, nothing } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';

import { ICON } from '../../const/const';
import {
  DEFAULT_ZOOM,
  MAP_SOURCE,
  MAP_TYPES,
  MAP_STORAGE,
  MAPTILER_STYLE,
  MAPTILER_THEME,
  STYLE_SCHEMA,
} from '../../const/maptiler-const';
import { MapData, MiniMapConfig } from '../../types';
import { getAddressFromMapTiler } from '../../utils/ha-helper';
import { getFormatedDateTime, getInitials } from '../../utils/helpers';
import { VehicleStatusCard } from '../../vehicle-status-card';

enum THEME_MODE {
  DARK = 'dark',
  LIGHT = 'light',
}

type THEME = 'dark' | 'light';
const BOUNDS_OPTS = {
  padding: 50,
  animate: true,
  maxZoom: 15,
  pitch: 0,
  bearing: 0,
};

const MARKER_FLYTO_OPTS = {
  zoom: 17.5,
  pitch: 45,
  bearing: -17.6,
};

@customElement('vsc-maptiler-popup')
export class VscMaptilerPopup extends LitElement {
  @property({ attribute: false }) mapData!: MapData;
  @property({ attribute: false }) card!: VehicleStatusCard;
  @property({ attribute: false }) _paths?: any;

  @state() private _themeMode?: THEME;
  @state() private _currentStyle?: string;

  @state() private map!: maptilersdk.Map;
  @state() private _popup: maptilersdk.Popup | null = null;
  @state() private _loadError: boolean = false;
  @state() private _markerFocus: boolean = false;

  private _mapHelper = helpers;
  private _bounds: maptilersdk.LngLatBounds | null = null;

  private get mapConfig(): MiniMapConfig {
    return this.card._config.mini_map!;
  }

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
  }

  protected updated(changedProps: Map<string | number | symbol, unknown>): void {
    if (changedProps.has('_themeMode') && this._themeMode !== undefined) {
      if (this._themeMode === THEME_MODE.DARK) {
        localStorage.setItem(MAP_STORAGE.DARK, 'true');
      } else {
        localStorage.removeItem(MAP_STORAGE.DARK);
      }
    }

    if (changedProps.has('_currentStyle') && this._currentStyle !== undefined) {
      localStorage.setItem(MAP_STORAGE.THEME_STYLE, this._currentStyle);
    }
  }

  private _handleInitialTheme() {
    const mapDark = localStorage.getItem(MAP_STORAGE.DARK);
    const mapSelectedStyle = localStorage.getItem(MAP_STORAGE.THEME_STYLE);
    if (mapDark) {
      console.log('Map Dark:', mapDark);
      this._themeMode = mapDark === 'true' ? THEME_MODE.DARK : THEME_MODE.LIGHT;
    } else if (mapSelectedStyle) {
      this._themeMode = mapSelectedStyle.includes('DARK') ? THEME_MODE.DARK : THEME_MODE.LIGHT;
    } else {
      const mapConfigMode = this.card._config.mini_map?.theme_mode || 'auto';
      if (mapConfigMode === 'auto') {
        this._themeMode = this.card.isDark ? THEME_MODE.DARK : THEME_MODE.LIGHT;
      } else {
        this._themeMode === THEME_MODE.DARK ? THEME_MODE.DARK : THEME_MODE.LIGHT;
      }
    }

    if (mapSelectedStyle) {
      this._currentStyle = mapSelectedStyle;
    } else {
      this._currentStyle = this._themeMode === THEME_MODE.DARK ? MAPTILER_STYLE.dark : MAPTILER_STYLE.light;
      localStorage.setItem(MAP_STORAGE.THEME_STYLE, this._currentStyle);
    }

    console.log('Initial Theme Mode:', this._themeMode, 'Current Style:', this._currentStyle);
  }

  private _initMap(): void {
    const mapConfig = this.mapConfig;
    const apiKey = mapConfig.maptiler_api_key;

    const defaultZoom = mapConfig.default_zoom || DEFAULT_ZOOM;
    const { lat, lon } = this.mapData;

    const initStyle = this._themeMode === THEME_MODE.DARK ? MAPTILER_STYLE.dark : MAPTILER_STYLE.light;

    this._bounds = this._getMapBounds();

    const mapEl = this.shadowRoot!.getElementById('map') as HTMLElement;

    maptilersdk.config.apiKey = apiKey;

    const mapOptions: maptilersdk.MapOptions = {
      geolocateControl: false,
      fullscreenControl: false,
      navigationControl: false,
      attributionControl: false,
      fadeDuration: 0,
      minZoom: 3,
      canvasContextAttributes: { antialias: true },
      container: mapEl,
      zoom: defaultZoom,
      style: initStyle,
    };

    this.map = new maptilersdk.Map(mapOptions);
    this._changeMapStyle(this._currentStyle!);
    this.map.setCenter([lon, lat]);

    this.map.on('load', async () => {
      const markerEl = this.addMarker() as HTMLElement;
      new maptilersdk.Marker({ element: markerEl }).setLngLat([lon, lat]).addTo(this.map!);
      markerEl.style.display = 'block';

      const geolocationIp = await maptilersdk.geolocation.info();
      const { country_languages } = geolocationIp;
      if (country_languages && country_languages.length > 0) {
        const language = country_languages[0];
        this.map!.setLanguage(language);
      }

      if (!this._bounds!.isEmpty() && mapConfig.auto_fit) {
        this.map!.fitBounds(this._bounds!, { ...BOUNDS_OPTS, maxZoom: defaultZoom });
      }
    });

    this.map.on('style.load', async () => {
      this._changeControlTheme();
      // Add a circle around the marker
      this._addMarkerCircle([lon, lat]);
      // Add sources & layers if available
      if (this._paths) {
        this._addSourceAndLayer(MAP_SOURCE.POINTS, this._paths.points, 'points');
        this._addSourceAndLayer(MAP_SOURCE.ROUTE, this._paths.route, 'route');
      }
    });

    const navControl = new maptilersdk.NavigationControl({ visualizePitch: true, visualizeRoll: true });
    this.map.addControl(navControl, 'top-right');

    // Add Find Car Button
    this._addMapControl(
      !this._markerFocus ? 'mdi:target' : 'mdi:image-filter-center-focus',
      'Find car',
      'top-right',
      (event) => {
        this._markerFocus = !this._markerFocus;
        const findCarBtn = event.currentTarget as HTMLElement;
        const haIcon = findCarBtn.querySelector('ha-icon') as HTMLElement;
        if (!this._markerFocus) {
          this.map!.fitBounds(this._bounds!, { ...BOUNDS_OPTS, maxZoom: defaultZoom });
          haIcon.setAttribute('icon', 'mdi:target');
        } else {
          this.map!.flyTo({ center: [lon, lat], ...MARKER_FLYTO_OPTS });
          haIcon.setAttribute('icon', 'mdi:image-filter-center-focus');
        }
      }
    );

    // Add Path Control Button (Only if paths exist)
    if (this._paths) {
      this._addMapControl('mdi:map-marker-path', 'Toggle path', 'top-right', this._toggleMapLayers);
    }

    // Add Theme Toggle Button
    this._addMapControl(this.getModeColor('themeBtn') as string, 'Toggle theme mode', 'bottom-right', (event) => {
      const themeBtn = event.currentTarget as HTMLElement;
      const haIcon = themeBtn.querySelector('ha-icon') as HTMLElement;
      this._handleThemeToggle();
      haIcon.setAttribute('icon', this.getModeColor('themeBtn') as string);
    });

    // Add a click event to toggle the sidebar
    this._setupToggleSidebar();

    // Setup point interactions
    this._setupPointInteractions();

    this.map.on('error', (e: any) => {
      if (e.style !== undefined) {
        this._loadError = true;
        this.map.setStyle(MAPTILER_STYLE.demo);
        this.map.setZoom(5);
      } else {
        return;
      }
    });

    this.map.on('styleimagemissing', (e) => {
      this.map?.addImage(e.id, {
        width: 0,
        height: 0,
        data: new Uint8Array(0),
      });
    });
  }

  private _changeControlTheme() {
    const setTheme = (key: string) => this.getModeColor(key);
    const elements = Array.from(this.shadowRoot!.querySelectorAll('.maplibregl-ctrl'));

    for (const element of elements) {
      const buttons = Array.from(element.querySelectorAll('button'));
      for (const button of buttons) {
        const buttonEl = button as HTMLButtonElement;
        buttonEl.style.backgroundColor = setTheme('backgroundColor') as string;
        buttonEl.style.boxShadow = setTheme('boxShadow') as string;
        const spanEl = button.querySelector('span') as HTMLSpanElement;
        if (spanEl) {
          const computedStyle = window.getComputedStyle(spanEl);
          const backgroundImage = computedStyle.backgroundImage;
          if (backgroundImage.startsWith('url("data:image/svg+xml')) {
            const fillColor = this.getModeColor('fill') as string;
            const svgUri = backgroundImage.slice(5, -2);
            const decodedSvg = decodeURIComponent(svgUri.split(',')[1]);

            const updatedSvg = decodedSvg
              .replace(/fill:[^;"]*/g, `fill:${fillColor}`)
              .replace(/fill="[^"]*"/g, `fill="${fillColor}"`);

            const encodedSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(updatedSvg)}`;
            spanEl.style.backgroundImage = `url("${encodedSvg}")`;
          }
        }
      }
    }
  }

  private _getMapBounds(): maptilersdk.LngLatBounds {
    const { lon, lat } = this.mapData;
    let bounds = new maptilersdk.LngLatBounds();
    bounds.extend([lon, lat]);
    if (this._paths) {
      const features = this._paths?.points.data.features;
      features.forEach((feature: any) => {
        if (feature.geometry.type === 'Point') {
          const [lng, lat] = feature.geometry.coordinates;
          if (lng !== null && lat !== null) {
            bounds.extend([lng, lat]);
          }
        }
      });
    }
    return bounds;
  }

  private _addMarkerCircle(lngLat: [number, number]) {
    const deviceTracker = this.card._config.mini_map?.device_tracker!;
    const stateObj = this.card._hass.states[deviceTracker];
    const { gps_accuracy: gpsAccuracy } = stateObj.attributes;
    const markerCircle = {
      type: 'geojson',
      data: turf.circle(lngLat, gpsAccuracy, { steps: 64, units: 'meters' }),
    };
    this._addSourceAndLayer(MAP_SOURCE.MARKER_CIRCLE, markerCircle, 'circle-radius');
    this._addSourceAndLayer(MAP_SOURCE.MARKER_CIRCLE, markerCircle, 'circle-outline');
  }

  private _addSourceAndLayer(sourceId: string, sourceData: any, type: MAP_TYPES): void {
    if (!this.map.getSource(sourceId)) {
      this.map.addSource(sourceId, sourceData);
    }

    if (!this.map.getLayer(type)) {
      this._addLayer(type);
    }
  }

  private _addLayer(type: MAP_TYPES): void {
    const pathHidden = localStorage.getItem(MAP_STORAGE.PATH_HIDDEN) === 'true';
    const pathColors = this.getPathColor();

    let layerConfig:
      | maptilersdk.CircleLayerSpecification
      | maptilersdk.LineLayerSpecification
      | maptilersdk.FillLayerSpecification;

    switch (type) {
      case 'points':
        layerConfig = {
          id: 'points',
          type: 'circle',
          source: MAP_SOURCE.POINTS,
          layout: {
            'circle-sort-key': ['get', 'last_updated'],
            visibility: pathHidden ? 'none' : 'visible',
          },
          paint: {
            'circle-radius': 8,
            'circle-color': pathColors,
            'circle-opacity': ['get', 'opacity'],
            'circle-stroke-width': 1,
            'circle-stroke-color': pathColors,
          },
        };
        break;
      case 'route':
        layerConfig = {
          id: 'route',
          type: 'line',
          source: MAP_SOURCE.ROUTE,
          layout: {
            'line-sort-key': ['get', 'order_id'],
            'line-join': 'round',
            'line-cap': 'round',
            visibility: pathHidden ? 'none' : 'visible',
          },
          paint: {
            'line-color': pathColors,
            'line-width': 3,
            'line-opacity': ['get', 'opacity'],
          },
        };
        break;
      case 'circle-radius':
        layerConfig = {
          id: 'circle-radius',
          type: 'fill',
          source: MAP_SOURCE.MARKER_CIRCLE,
          paint: {
            'fill-color': pathColors,
            'fill-opacity': 0.3,
          },
        };
        break;
      case 'circle-outline':
        layerConfig = {
          id: 'circle-outline',
          type: 'line',
          source: MAP_SOURCE.MARKER_CIRCLE,
          paint: {
            'line-color': pathColors,
            'line-width': 3,
            'line-opacity': 0.8,
          },
        };
        break;
    }

    this.map.addLayer(layerConfig);
  }

  /**
   * Helper function to add a control button to the map
   */
  private _addMapControl(icon: string, title: string, position: 'top-right' | 'bottom-right', onClick: EventListener) {
    this.map.addControl(
      {
        onAdd: () => {
          const button = this._createButton(icon, title);
          button.style.display = 'unset';
          button.addEventListener('click', onClick);
          return button;
        },
        onRemove: () => null,
      },
      position
    );
  }

  private _createButton = (icon: string, title: string): HTMLElement => {
    const div = document.createElement('div');
    div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    const haIcon = document.createElement('ha-icon');
    haIcon.setAttribute('icon', icon);
    haIcon.style.color = 'var(--vic-map-button-color)';
    button.appendChild(haIcon);
    button.title = title;
    div.appendChild(button);
    div.style.display = 'none';

    return div;
  };

  private _toggleMapLayers = (): void => {
    const pathHidden = localStorage.getItem(MAP_STORAGE.PATH_HIDDEN) === 'true';
    const newVisibility = pathHidden ? null : 'none';

    // Toggle localStorage state
    localStorage.setItem(MAP_STORAGE.PATH_HIDDEN, String(!pathHidden));

    // Define layers to toggle
    const layers = [MAP_SOURCE.POINTS, MAP_SOURCE.ROUTE];

    // Loop through layers and update visibility
    layers.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', newVisibility);
      }
    });
  };

  private _setupToggleSidebar() {
    // Add a click event to toggle the sidebar
    this.map.on('click', () => {
      const sideBarEl = this.shadowRoot?.getElementById('left') as HTMLElement;
      const sidebarToggle = sideBarEl.querySelector('ha-icon-button.sidebar-toggle') as HTMLElement;
      const isCollapsed = sideBarEl.classList.contains('collapsed');
      if (isCollapsed) return;
      sideBarEl.classList.toggle('collapsed', !isCollapsed);
      sidebarToggle.classList.toggle('activated', isCollapsed);

      const padding = { left: isCollapsed ? 250 : 0 };
      this.map!.easeTo({ padding, duration: 1000 });
    });
  }

  private _setupPointInteractions() {
    const apiKey = this.mapConfig.maptiler_api_key;
    // Create a popup, but don't add it to the map yet.

    const pointPopup = new maptilersdk.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    let currentFeatureCoordinates: string | undefined;

    this.map.on('mousemove', 'points', async (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const featureCoordinates = feature.geometry.coordinates.toString();
      if (currentFeatureCoordinates !== featureCoordinates) {
        currentFeatureCoordinates = featureCoordinates;
        this.map.getCanvas().style.cursor = 'pointer';

        const coordinates = e.features[0].geometry.coordinates.slice();

        const { description, friendly_name, last_updated } = feature.properties;
        const frName = `<b>${friendly_name}</b>`;
        const lastUpdated = `<i>${getFormatedDateTime(new Date(last_updated * 1000), this.card._hass.locale)}</i>`;

        // Adjust longitude for world wrap
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        pointPopup.setLngLat(coordinates).setHTML(description).addTo(this.map);
        // Get address from MapTiler API and update the popup content
        const formattedAddress = await getAddressFromMapTiler(coordinates[1], coordinates[0], apiKey);
        if (formattedAddress) {
          const updatedAddress = `${frName}${formattedAddress.streetName}${lastUpdated}`;
          if (pointPopup.isOpen()) {
            pointPopup.setHTML(updatedAddress);
          }
        }
      }
    });

    this.map.on('mouseleave', 'points', () => {
      currentFeatureCoordinates = undefined;
      this.map.getCanvas().style.cursor = '';
      pointPopup.remove();
    });

    this.map.on('dblclick', 'points', (e: any) => e.preventDefault()); // Disable double-click zoom
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

  private addMarker(): HTMLElement {
    const deviceTracker = this.mapConfig.device_tracker!;
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
      const entityName = stateObj?.attributes.friendly_name;
      const initials = getInitials(entityName!);
      buttonEl.textContent = initials;
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

    const mapAddress = await getAddressFromMapTiler(
      this.mapData.lat,
      this.mapData.lon,
      this.mapConfig.maptiler_api_key
    );

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

  private _handleThemeToggle() {
    const currentStyle = this._currentStyle!.split('.')[0];
    const styleToChange = this._themeMode === THEME_MODE.DARK ? `${currentStyle}.LIGHT` : `${currentStyle}.DARK`;
    const mode = this._themeMode;
    if (mode === THEME_MODE.DARK) {
      this._changeMapStyle(styleToChange);
      this._currentStyle = styleToChange;
      this._themeMode = THEME_MODE.LIGHT;
      console.log('Switching to Light Theme', styleToChange, 'Current Style:', this._currentStyle);
    } else {
      this._changeMapStyle(styleToChange);
      this._currentStyle = styleToChange;
      this._themeMode = THEME_MODE.DARK;
      console.log('Switching to Dark Theme', styleToChange, 'Current Style:', this._currentStyle);
    }
  }

  private _handleThemePicked(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    this._currentStyle = value as string;
    localStorage.setItem(MAP_STORAGE.THEME_STYLE, this._currentStyle);
    this._themeMode = this._currentStyle.includes('DARK') ? THEME_MODE.DARK : THEME_MODE.LIGHT;
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

  private getModeColor = (key: string): string => {
    return this._themeMode === 'dark' ? MAPTILER_THEME[key].dark : MAPTILER_THEME[key].light;
  };

  private getPathColor = () => {
    const computedStyle = getComputedStyle(this);
    const configPathColor = this.card._config.mini_map?.path_color;
    const color =
      configPathColor !== 'none' && configPathColor
        ? computedStyle.getPropertyValue(`--${configPathColor}-color`)
        : this._themeMode === THEME_MODE.DARK
        ? computedStyle.getPropertyValue('--accent-color')
        : computedStyle.getPropertyValue('--primary-color');
    return color;
  };

  private _computeMapStyle() {
    const getStyle = (key: string) => this.getModeColor(key);
    const configPathColor = this.card._config.mini_map?.path_color;

    const deviceTracker = this.card._config.mini_map?.device_tracker;
    const entityPic = this.card._hass.states[deviceTracker]?.attributes.entity_picture;

    const markerColor =
      configPathColor !== 'none' && configPathColor
        ? `var(--${configPathColor}-color)`
        : this._themeMode === 'dark'
        ? 'var(--accent-color)'
        : 'var(--primary-color)';

    const picBgcolor = entityPic ? 'rgba(0, 0, 0, 0.5)' : markerColor;
    // const markerSize = entityPic ? '3.5rem' : '2rem';
    const markerSize = '48px';
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
          transform-origin: center;
          top: 0;
          left: 0;
          right: 0;
          border: 0;
        }

        button#marker {
          position: absolute;
          width: 100%;
          height: 100%;
          background-size: cover;
          /* background-color: rgb(from var(--vic-map-marker-color) r g b / 100%); */
          /* background-color: var(--vic-map-marker-color); */
          background-color: var(--vic-map-button-bg);
          border: 2px solid;
          border-color: var(--vic-map-marker-color);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          color: var(--vic-map-button-color);
          font-size: 1.5rem;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          overflow: hidden;
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
