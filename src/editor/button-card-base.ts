import { CSSResultGroup, html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

import { EditorSubCardPreviewEvent } from '../events';
import { BaseButtonCardItemConfig, PreviewType } from '../types/config';
import { ButtonArea } from '../types/config-area';
import { ButtonSubCardPreviewConfig } from '../utils/editor/types';
import { BaseEditor } from './base-editor';

export class ButtonCardBaseEditor extends BaseEditor {
  @property({ attribute: false }) protected _btnConfig!: BaseButtonCardItemConfig;
  @property({ attribute: false }) protected _btnIndex!: number;
  @state() public _currentArea!: ButtonArea;
  @state() public _activePreview: PreviewType | null = null;

  protected buttonArea?: ButtonArea;

  constructor(area?: ButtonArea) {
    super();
    if (area) {
      this.buttonArea = area;
    }
  }

  set activePreview(preview: PreviewType | null) {
    this._activePreview = preview;
  }
  get activePreview(): PreviewType | null {
    return this._activePreview;
  }

  set currentArea(area: ButtonArea) {
    this._currentArea = area;
  }
  get currentArea(): ButtonArea {
    return this._currentArea;
  }

  protected _renderPreviewBtn(): TemplateResult {
    if (this.currentArea === ButtonArea.BASE) {
      return html`<ha-button
        @click=${() => this._dispatchEditorEvent('show-button', { buttonIndex: this._btnIndex })}
        size="small"
        variant="neutral"
        appearance="plain"
        >Show Button</ha-button
      > `;
    }

    const isActive = this._activePreview !== null;
    const label = isActive ? 'Exit Preview' : 'Preview Card';
    const variant = isActive ? 'warning' : 'neutral';
    return html` <ha-button size="small" variant=${variant} appearance="plain"> ${label} </ha-button> `;
  }

  protected _togglePreview(previewType: PreviewType | null): void {
    if (previewType === null) {
      this._dispatchEditorEvent('reset-preview', {});
      return;
    }
    const cardKey = previewType === null ? null : previewType;
    const config = this._btnConfig?.sub_card?.[cardKey!];

    const eventDetail: ButtonSubCardPreviewConfig = {
      type: previewType,
      config,
    };
    document.dispatchEvent(EditorSubCardPreviewEvent(eventDetail));
  }

  static get styles(): CSSResultGroup {
    return super.styles;
  }
}
