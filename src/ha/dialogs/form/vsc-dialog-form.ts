import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import type { HomeAssistant } from '../../types';
import type { HassDialog } from '../dialog-manager';
import type { FormDialogData, FormDialogParams } from './show-form-dialog';

import { NAMESPACE_TITLE } from '../../../constants/const';
import '../../../editor/shared/vsc-editor-form';
import { atLeastVersion } from '../../../utils/compare-version';
import { createCloseHeading } from '../../../utils/editor/create';
import { fireEvent } from '../../common/dom/fire_event';

@customElement('vsc-dialog-form')
export class VscDialogForm extends LitElement implements HassDialog<FormDialogData> {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: FormDialogParams;
  @state() private _data: FormDialogData = {};

  public async showDialog(params: FormDialogParams): Promise<void> {
    this._params = params;
    this._data = params.data || {};
  }

  public closeDialog() {
    this._params = undefined;
    this._data = {};
    fireEvent(this, 'dialog-closed', { dialog: this.localName });
    return true;
  }

  private _submit(): void {
    this._params?.submit?.(this._data);
    this.closeDialog();
  }

  private _cancel(): void {
    this._params?.cancel?.();
    this.closeDialog();
  }

  private _valueChanged(ev: CustomEvent): void {
    this._data = ev.detail.value;
    console.log(this._data);
  }

  protected render() {
    if (!this._params || !this.hass) {
      return nothing;
    }
    const beforeWaDialog = !atLeastVersion(this.hass.config.version, 2023, 3);
    return html`
      <ha-dialog
        .hass=${this.hass}
        open
        scrimClickAction
        escapeKeyAction
        flexContent
        .headerTitle=${this._params.title || NAMESPACE_TITLE}
        .heading=${createCloseHeading(this.hass, this._params.title)}
        @closed=${this._cancel}
      >
        <vsc-editor-form
          dialogInitialFocus
          ._hass=${this.hass}
          .data=${this._data}
          .schema=${this._params.schema}
          @value-changed=${this._valueChanged}
        ></vsc-editor-form>
        <div class="footer" slot=${ifDefined(beforeWaDialog ? 'footer' : undefined)}>
          <ha-button size="small" appearance="plain" variant="warning" @click=${this._cancel} slot="secondaryAction">
            ${this._params.cancelText || this.hass.localize('ui.common.cancel')}
          </ha-button>
          <ha-button size="small" appearance="plain" @click=${this._submit} slot="primaryAction">
            ${this._params.submitText || this.hass.localize('ui.common.save')}
          </ha-button>
        </div>
      </ha-dialog>
    `;
  }

  static styles = css`
    /* mwc-dialog (ha-dialog) styles */
    ha-dialog {
      --mdc-dialog-min-width: 400px;
      --justify-action-buttons: space-between;
    }

    ha-dialog .form {
      color: var(--primary-text-color);
    }

    a {
      color: var(--primary-color);
    }
    .footer {
      display: flex;
      gap: 12px;
      justify-content: var(--justify-action-buttons, flex-end);
      align-items: center;
      width: 100%;
      box-sizing: border-box;
      margin-top: 1em;
    }
    /* make dialog fullscreen on small screens */
    @media all and (max-width: 450px), all and (max-height: 500px) {
      ha-dialog {
        --mdc-dialog-min-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --mdc-dialog-max-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
        --ha-dialog-min-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --ha-dialog-max-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --ha-dialog-min-height: 100%;
        --ha-dialog-max-height: 100%;
        --vertical-align-dialog: flex-end;
        --ha-dialog-border-radius: 0;
      }
    }
    .error {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-dialog-form': VscDialogForm;
  }
}
