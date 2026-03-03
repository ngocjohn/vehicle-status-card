import { css } from 'lit';

export const DEFAULT_HA_MAP_STYLES = css`
  ha-dialog {
    --mdc-dialog-min-width: 800px;
    --mdc-dialog-max-width: 85vw;
    --ha-dialog-min-width: 800px; // wa-dialog support
    --ha-dialog-max-width: 85vw; // wa-dialog support
    --dialog-backdrop-filter: blur(2px);
    --ha-dialog-surface-backdrop-filter: blur(2px);
    --ha-dialog-scrim-backdrop-filter: blur(4px) brightness(30%);
    --dialog-content-padding: 0;
  }
  ha-dialog[width='full'] {
    --width: var(--full-width);
    --mdc-dialog-min-height: 100vh;
    --mdc-dialog-max-height: 100vh;
    --ha-dialog-min-height: 100vh;
    --ha-dialog-max-height: 100vh;
    --ha-dialog-border-radius: 0;
    --ha-dialog-width-full: 100vw;
  }
  @media all and (max-width: 800px), all and (max-height: 500px) {
    ha-dialog {
      --mdc-dialog-min-width: 100vw;
      --mdc-dialog-max-width: 100vw;
      --mdc-dialog-min-height: 100%;
      --mdc-dialog-max-height: 100%;
      --ha-dialog-min-width: 100vw;
      --ha-dialog-max-width: 100vw;
      --ha-dialog-min-height: 100%;
      --ha-dialog-max-height: 100%;
      --vertical-align-dialog: flex-end;
      --ha-dialog-border-radius: 0;
      --dialog-content-padding: 0;
      --ha-card-border-radius: 0 !important;
      --ha-dialog-width-full: 100vw;
    }
    .mdc-dialog .mdc-dialog__content {
      padding: 0;
      height: unset !important;
    }

    :host([flexContent]) .mdc-dialog .mdc-dialog__content {
      padding: 0;
      justify-content: center;
      align-items: center;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
  }
`;
