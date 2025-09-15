import { mdiCodeBracesBox, mdiCog, mdiGrid } from '@mdi/js';
import { html, TemplateResult, CSSResultGroup, css, PropertyValues } from 'lit';

import '../shared/panel-yaml-editor';
import '../components/slide-images/panel-images-preview';

import { customElement, property, state } from 'lit/decorators.js';

import { fireEvent } from '../../ha';
import { showFormDialog } from '../../ha/dialogs/form/show-form-dialog';
import { ImageItem, VehicleStatusCardConfig } from '../../types/config';
import { Create, ICON } from '../../utils';
import { BaseEditor } from '../base-editor';
import { PANEL } from '../editor-const';
import { ImageSchema, SLIDE_SIZE_SCHEMA, SWIPE_BEHAVIOR_SCHEMA } from '../form';

type ACTIVE_VIEW = 'grid' | 'settings' | 'yaml';

@customElement(PANEL.IMAGES_EDITOR)
export class PanelImagesEditor extends BaseEditor {
  @property({ attribute: false }) private config!: VehicleStatusCardConfig;

  @state() private _selectedView: ACTIVE_VIEW = 'grid';
  @state() private _images: ImageItem[] = [];

  constructor() {
    super();
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        *[active] {
          color: var(--primary-color);
        }

        *[hidden],
        .hidden {
          display: none;
        }
        .action-footer {
          margin-top: 0;
        }
      `,
    ];
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (_changedProperties.has('config') && this.config) {
      this._images = (this.config.images as ImageItem[]) || [];
    }
  }

  protected render(): TemplateResult {
    if (!this.config || !this._hass) {
      return html`<div class="card-config">Loading...</div>`;
    }
    const isActive = (key: ACTIVE_VIEW) => this._selectedView === key;
    const viewSelected = {
      grid: this._renderPreview(),
      settings: this._renderImageLayoutConfig(),
      yaml: this._renderYamlEditor(),
    };

    const actionHeader = html`<div class="action-footer">
      <ha-button size="small" appearance="filled" @click=${() => this._showAddImage()}
        ><ha-svg-icon .path=${ICON.PLUS} slot="start"></ha-svg-icon>Add image</ha-button
      >
      <div class="item-actions">
        <ha-icon-button
          .viewType=${'grid'}
          ?active=${isActive('grid')}
          .path=${mdiGrid}
          @click=${this._handleViewChange}
        >
        </ha-icon-button>

        <ha-icon-button
          .viewType=${'settings'}
          ?active=${isActive('settings')}
          .path=${mdiCog}
          @click=${this._handleViewChange}
        ></ha-icon-button>
        <ha-icon-button
          .viewType=${'yaml'}
          ?active=${isActive('yaml')}
          .path=${mdiCodeBracesBox}
          @click=${this._handleViewChange}
        ></ha-icon-button>
      </div>
    </div> `;
    return html`
      ${actionHeader}
      <div class="card-config">${viewSelected[this._selectedView]}</div>
    `;
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

  private _renderImageLayoutConfig(): TemplateResult {
    const imagesSwipeConfig = this.config?.layout_config?.images_swipe || {};
    const DATA = { ...imagesSwipeConfig };

    const swipeSchema = [...SLIDE_SIZE_SCHEMA, ...SWIPE_BEHAVIOR_SCHEMA(DATA)];
    const haFormEl = this._createVscForm(DATA, swipeSchema, 'layout_config', 'images_swipe');

    return Create.SectionPanel([
      {
        title: 'Slide configuration',
        content: haFormEl,
      },
    ]);
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
    if (key === 'images' && Array.isArray(value)) {
      this.config = { ...this.config, images: value };
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
    this.config = {
      ...this.config,
      images: imagesList,
    };
    this._images = imagesList;
    fireEvent(this, 'config-changed', { config: this.config });
  }
  private _handleImageChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const images = ev.detail.images;
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
