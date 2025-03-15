import { html } from 'lit';

export const STYLE_SCHEMA = [
  {
    name: 'Navigation and city exploration',
    selector: {
      select: {
        options: ['STREETS', 'STREETS.DARK', 'STREETS.LIGHT', 'STREETS.PASTEL'],
      },
    },
  },
  {
    name: 'Data visualization',
    selector: {
      select: {
        options: ['DATAVIZ', 'DATAVIZ.DARK', 'DATAVIZ.LIGHT'],
      },
    },
  },
  {
    name: 'Minimalist and general purpose',
    selector: {
      select: {
        options: ['BASIC', 'BASIC.DARK', 'BASIC.LIGHT'],
      },
    },
  },
  {
    name: 'High contrast navigation',
    selector: {
      select: {
        options: ['BRIGHT', 'BRIGHT.DARK', 'BRIGHT.LIGHT', 'BRIGHT.PASTEL'],
      },
    },
  },
  {
    name: 'Topographic study',
    selector: {
      select: {
        options: ['TOPO', 'TOPO.SHINY', 'TOPO.PASTEL', 'TOPO.TOPOGRAPHIQUE'],
      },
    },
  },
  {
    name: 'Minimalist',
    selector: {
      select: {
        options: ['VOYAGER', 'VOYAGER.DARK', 'VOYAGER.LIGHT', 'VOYAGER.VINTAGE'],
      },
    },
  },
  {
    name: 'High contrast',
    selector: {
      select: {
        options: ['TONER', 'TONER.BACKGROUND', 'TONER.LITE', 'TONER.LINES'],
      },
    },
  },
  {
    name: 'Neutral greyscale style with hillshading',
    selector: {
      select: {
        options: ['BACKDROP', 'BACKDROP.DARK', 'BACKDROP.LIGHT'],
      },
    },
  },
  {
    name: 'Other',
    selector: {
      select: {
        options: ['OPENSTREETMAP', 'OUTDOOR', 'WINTER', 'SATELLITE', 'HYBRID'],
      },
    },
  },
];
export const MAP_STYLE_OPTIONS = [
  {
    label: 'Navigation and city exploration',
    options: [
      { value: 'STREETS', label: 'STREETS' },
      { value: 'STREETS.DARK', label: 'STREETS.DARK' },
      { value: 'STREETS.LIGHT', label: 'STREETS.LIGHT' },
      { value: 'STREETS.PASTEL', label: 'STREETS.PASTEL' },
    ],
  },
  { value: 'OUTDOOR', label: 'OUTDOOR' },
  { value: 'WINTER', label: 'WINTER' },
  { value: 'SATELLITE', label: 'SATELLITE' },
  { value: 'HYBRID', label: 'HYBRID' },
  {
    label: 'Data visualization',
    options: [
      { value: 'DATAVIZ', label: 'DATAVIZ' },
      { value: 'DATAVIZ.DARK', label: 'DATAVIZ.DARK' },
      { value: 'DATAVIZ.LIGHT', label: 'DATAVIZ.LIGHT' },
    ],
  },
  {
    label: 'Minimalist and general purpose',
    options: [
      { value: 'BASIC', label: 'BASIC' },
      { value: 'BASIC.DARK', label: 'BASIC.DARK' },
      { value: 'BASIC.LIGHT', label: 'BASIC.LIGHT' },
    ],
  },
  {
    label: 'High contrast navigation',
    options: [
      { value: 'BRIGHT', label: 'BRIGHT' },
      { value: 'BRIGHT.DARK', label: 'BRIGHT.DARK' },
      { value: 'BRIGHT.LIGHT', label: 'BRIGHT.LIGHT' },
      { value: 'BRIGHT.PASTEL', label: 'BRIGHT.PASTEL' },
    ],
  },
  {
    label: 'Topographic study',
    options: [
      { value: 'TOPO', label: 'TOPO' },
      { value: 'TOPO.SHINY', label: 'TOPO.SHINY' },
      { value: 'TOPO.PASTEL', label: 'TOPO.PASTEL' },
      { value: 'TOPO.TOPOGRAPHIQUE', label: 'TOPO.TOPOGRAPHIQUE' },
    ],
  },
  {
    label: 'Minimalist',
    options: [
      { value: 'VOYAGER', label: 'VOYAGER' },
      { value: 'VOYAGER.DARK', label: 'VOYAGER.DARK' },
      { value: 'VOYAGER.LIGHT', label: 'VOYAGER.LIGHT' },
      { value: 'VOYAGER.VINTAGE', label: 'VOYAGER.VINTAGE' },
    ],
  },
  {
    label: 'High contrast',
    options: [
      { value: 'TONER', label: 'TONER' },
      { value: 'TONER.BACKGROUND', label: 'TONER.BACKGROUND' },
      { value: 'TONER.LITE', label: 'TONER.LITE' },
      { value: 'TONER.LINES', label: 'TONER.LINES' },
    ],
  },
  {
    label: 'Neutral greyscale style with hillshading',
    options: [
      { value: 'BACKDROP', label: 'BACKDROP' },
      { value: 'BACKDROP.DARK', label: 'BACKDROP.DARK' },
      { value: 'BACKDROP.LIGHT', label: 'BACKDROP.LIGHT' },
    ],
  },
  { value: 'OPENSTREETMAP', label: 'OPENSTREETMAP' },
];

export const DARK_AVAILABLE_STYLES = ['STREETS', 'BASIC', 'BRIGHT', 'DATAVIZ', 'VOYAGER', 'BACKDROP'];

export enum MAP_STORAGE {
  THEME_STYLE = 'vsc-mapstyle',
  DARK = 'vsc-mapDark',
  PATH_HIDDEN = 'vsc-pathHidden',
}

export enum MAP_SOURCE {
  POINTS = 'points',
  ROUTE = 'route',
}

export const MAPTILER_DIALOG_STYLES = html`
  <style>
    ha-dialog {
      --mdc-dialog-min-width: 85vw;
      --mdc-dialog-max-width: 85vw;
      --dialog-backdrop-filter: blur(2px);
      --dialog-content-padding: 0;
    }
    @media all and (max-width: 600px), all and (max-height: 500px) {
      ha-dialog {
        --mdc-dialog-min-width: 100vw;
        --mdc-dialog-max-width: 100vw;
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
        --vertical-align-dialog: flex-end;
        --ha-dialog-border-radius: 0;
        --dialog-content-padding: 0;
      }
      .mdc-dialog .mdc-dialog__content {
        padding: 0;
      }
    }
  </style>
`;

export const DEFAULT_DIALOG_STYLES = html` <style>
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
</style>`;
