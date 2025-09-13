import { capitalize } from 'es-toolkit';
import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { HomeAssistant } from '../../types';
import type { HassDialog } from '../dialog-manager';
import type { FormDialogData, FormDialogParams } from './show-form-dialog';

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

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, this._params.title)}
        @closed=${this._cancel}
      >
        <ha-form
          dialogInitialFocus
          .hass=${this.hass}
          .computeLabel=${this._params?.computeLabel || this.computeLabel}
          .computeHelper=${this._params?.computeHelper || this.computeHelper}
          .data=${this._data}
          .schema=${this._params.schema}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <ha-button appearance="plain" @click=${this._cancel} slot="secondaryAction">
          ${this._params.cancelText || this.hass.localize('ui.common.cancel')}
        </ha-button>
        <ha-button @click=${this._submit} slot="primaryAction">
          ${this._params.submitText || this.hass.localize('ui.common.save')}
        </ha-button>
      </ha-dialog>
    `;
  }

  private computeLabel = (schema: any): string | undefined => {
    if (schema.name === 'entity' && !schema.context?.group_entity) {
      return undefined;
    }
    const label = schema.label || schema.name || schema.title || '';
    return capitalize(label.trim());
  };

  private computeHelper = (schema: any): string | TemplateResult | undefined => {
    return schema.helper || undefined;
  };

  static styles = css`
    /* mwc-dialog (ha-dialog) styles */
    ha-dialog {
      --mdc-dialog-min-width: 400px;
      --mdc-dialog-max-width: 600px;
      --mdc-dialog-max-width: min(600px, 95vw);
      --justify-action-buttons: space-between;
    }

    ha-dialog .form {
      color: var(--primary-text-color);
    }

    a {
      color: var(--primary-color);
    }

    /* make dialog fullscreen on small screens */
    @media all and (max-width: 450px), all and (max-height: 500px) {
      ha-dialog {
        --mdc-dialog-min-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --mdc-dialog-max-width: calc(100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left));
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
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
