import { html, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './panel-images-preview';
import '../../../utils/editor/sub-editor-header';
import { fireEvent } from '../../../ha';
import { showFormDialog } from '../../../ha/dialogs/form/show-form-dialog';
import { ImageItem, VehicleStatusCardConfig } from '../../../types/config';
import { ConfigArea } from '../../../types/config-area';
import { ICON } from '../../../utils';
import { BaseEditor } from '../../base-editor';
import { PANEL } from '../../editor-const';
import { ImageSchema } from '../../form';

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

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  static get styles(): CSSResultGroup {
    return [super.styles];
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
      <ha-button slot="primary-action" size="small" appearance="filled" @click=${() => this._showAddImage()}
        ><ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon>Add image</ha-button
      >
      <span slot="secondary-action">
        ${ActiveViews.map(
          (view) => html` <ha-icon-button
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
    const { key, subKey } = ev.target as any;
    const value = ev.detail;
    console.debug('YAML changed:', { key, subKey, value });
    if (key === 'images') {
      if (value === undefined || !Array.isArray(value)) {
        this._images = [];
        delete this.config.images;
        fireEvent(this, 'config-changed', { config: this.config });
        return;
      }
      this._images = value;
      fireEvent(this, 'config-changed', { config: this.config });
    }
  }

  private _handleViewChange(ev: Event): void {
    ev.stopPropagation();
    const button = ev.currentTarget as any;
    const viewType = button.viewType as ACTIVE_VIEW;
    if (viewType && this._selectedView !== viewType) {
      this._selectedView = viewType;
      console.log('View changed to:', this._selectedView);
    }
  }
  private async _showAddImage() {
    const newImage = await showFormDialog(this, {
      title: 'Add New Image',
      schema: [...ImageSchema],
      data: {},
      submitText: 'Add',
    });
    if (!newImage || newImage === null) return;
    const imagesList = [...this._images];
    imagesList.push(newImage);
    this._configChanged(imagesList);
  }
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
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-images-editor': PanelImagesEditor;
  }
}
