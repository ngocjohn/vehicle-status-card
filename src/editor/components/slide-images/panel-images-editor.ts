import { html, TemplateResult, PropertyValues, CSSResultGroup, css } from 'lit';

import './panel-images-preview';
import '../../../utils/editor/sub-editor-header';
import { customElement, property, state } from 'lit/decorators.js';

import { fireEvent } from '../../../ha';
import { showImageUploadDialog } from '../../../ha/dialogs/image-upload/show-image-upload';
import { ImageItem, VehicleStatusCardConfig } from '../../../types/config';
import { ConfigArea } from '../../../types/config-area';
import { ICON } from '../../../utils';
import { loadPictureCardHelper } from '../../../utils/lovelace/create-card-element';
import { BaseEditor } from '../../base-editor';
import { PANEL } from '../../editor-const';

type ACTIVE_VIEW = 'grid' | 'settings' | 'yaml';

const ActiveViews: ACTIVE_VIEW[] = ['grid', 'settings', 'yaml'] as const;

const VIEW_ICON: Record<ACTIVE_VIEW, string> = {
  grid: ICON.GRID,
  settings: ICON.COG,
  yaml: ICON.CODE_BRACES,
};

@customElement(PANEL.IMAGES_EDITOR)
export class PanelImagesEditor extends BaseEditor {
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;

  @state() private _selectedView: ACTIVE_VIEW = 'grid';
  @state() private _images: ImageItem[] = [];

  constructor() {
    super(ConfigArea.IMAGES);
  }

  connectedCallback() {
    super.connectedCallback();
    void loadPictureCardHelper(this._hass!);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('config') && this.config) {
      this._images = (this.config.images as ImageItem[]) || [];
    }
  }

  protected render(): TemplateResult {
    if (!this.config || !this._hass) {
      return html`<div>Loading...</div>`;
    }
    const viewSelected = {
      grid: this._renderPreview(),
      settings: this._renderLayoutSection('images_swipe'),
      yaml: this._renderYamlEditor(),
    };

    return html` ${this._renderHeader()} ${viewSelected[this._selectedView]} `;
  }

  private _renderHeader(): TemplateResult {
    const isActive = (key: ACTIVE_VIEW) => this._selectedView === key;
    return html`<sub-editor-header hide-primary hide-secondary>
      <ha-button slot="primary-action" size="small" appearance="filled" @click=${this._showAddImage}
        ><ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon>Add image</ha-button
      >
      <span slot="secondary-action">
        ${ActiveViews.map(
          (view) => html` <ha-icon-button
            class="view-button"
            .viewType=${view}
            ?active=${isActive(view)}
            .path=${VIEW_ICON[view]}
            @click=${this._handleViewChange}
          >
          </ha-icon-button>`
        )}
      </span>
    </sub-editor-header>`;
  }

  private _renderPreview(): TemplateResult {
    return html`
      <panel-images-preview
        ._hass=${this._hass}
        .images=${this._images}
        @images-changed=${this._handleImageChanged}
      ></panel-images-preview>
    `;
  }

  private _renderYamlEditor(): TemplateResult {
    const imageConfig = this.config?.images || [];
    return this._createVscYamlEditor(imageConfig, 'images', undefined, false);
  }

  protected _onYamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    console.debug('YAML changed (PanelImagesEditor)');
    const { key } = ev.target as any;
    const value = ev.detail;
    if (key === 'images') {
      if (value === undefined || !Array.isArray(value)) {
        this._images = [];
        delete this.config.images;
        fireEvent(this, 'config-changed', { config: this.config });
        return;
      }
      this._images = value;
      this._configChanged(this._images);
    }
  }

  private _handleViewChange(ev: Event): void {
    ev.stopPropagation();
    const button = ev.currentTarget as any;
    const viewType = button.viewType as ACTIVE_VIEW;
    if (viewType && this._selectedView !== viewType) {
      this._selectedView = viewType;
      // console.log('View changed to:', this._selectedView);
    } else {
      // switch back to grid view
      this._selectedView = 'grid';
    }
  }
  private _showAddImage = async () => {
    const newImage = await showImageUploadDialog(this, {
      title: 'Add New Image',
      data: {},
    });
    if (!newImage || newImage === null) return;
    const updatedImages = [...this._images, ...newImage.images];
    this._configChanged(updatedImages);
    console.debug('New image added (PanelImagesEditor):', newImage);
  };

  private _handleImageChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newImages = ev.detail.images;
    console.debug('Images changed (PanelImagesEditor):', newImages);
    this._configChanged(newImages);
  }

  private _configChanged(images: ImageItem[]): void {
    this.config = { ...this.config, images: images };
    this._images = images;
    fireEvent(this, 'config-changed', { config: this.config });
  }
  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        ha-icon-button.view-button {
          color: var(--secondary-text-color);
        }
        ha-icon-button.view-button[active] {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-images-editor': PanelImagesEditor;
  }
}
