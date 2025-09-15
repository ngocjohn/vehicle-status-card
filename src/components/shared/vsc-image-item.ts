import { LitElement, html, nothing, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { HomeAssistant, type ImageEntity, computeImageUrl } from '../../ha';
import { isMediaSourceContentId, resolveMediaSource } from '../../ha/data/media_source';
import { ImageItem } from '../../types/config';

@customElement('vsc-image-item')
export class VscImageItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _imageConfig!: ImageItem;
  @state() private _resolvedImage?: string;

  protected willUpdate(_changedProperties: PropertyValues) {
    super.willUpdate(_changedProperties);
    if (!this._imageConfig || !this.hass) {
      return;
    }

    const firstHass = _changedProperties.has('hass') && _changedProperties.get('hass') === undefined;
    const imageChanged =
      _changedProperties.has('_imageConfig') &&
      _changedProperties.get('_imageConfig')?.image !== this._imageConfig.image;

    if (
      (firstHass || imageChanged) &&
      typeof this._imageConfig.image === 'string' &&
      isMediaSourceContentId(this._imageConfig.image)
    ) {
      // Resolve media source URL
      this._resolvedImage = undefined;
      resolveMediaSource(this.hass, this._imageConfig?.image).then((resp) => {
        this._resolvedImage = resp.url;
      });
    } else if (imageChanged) {
      this._resolvedImage = this._imageConfig?.image;
    }
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (!this._imageConfig || _changedProperties.has('_resolvedImage')) {
      return true;
    }
    if (this._imageConfig.image_entity && _changedProperties.has('hass')) {
      const oldHass = _changedProperties.get('hass') as HomeAssistant | undefined;
      if (
        !oldHass ||
        oldHass.states[this._imageConfig.image_entity] !== this.hass.states[this._imageConfig.image_entity]
      ) {
        return true;
      }
    }
    return true;
  }

  protected render() {
    if (!this._imageConfig || !this.hass) {
      return nothing;
    }

    let stateObj: ImageEntity | undefined;

    if (this._imageConfig.image_entity) {
      stateObj = this.hass.states[this._imageConfig.image_entity] as ImageEntity;
      if (!stateObj) {
        return html`<div class="error">
          ${this.hass.localize('ui.card.common.entity_not_found')}: ${this._imageConfig.image_entity}
        </div>`;
      }
    }

    let image: string | undefined = this._resolvedImage;
    if (this._imageConfig.image_entity) {
      image = computeImageUrl(stateObj as ImageEntity);
    }

    if (image === undefined) {
      return nothing;
    }

    return html` <img src="${this.hass.hassUrl(image)}" alt="Image" /> `;
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .error {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-image-item': VscImageItem;
  }
}
