import { css, CSSResultGroup, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import cardstyles from '../css/card.css';
import { EDITOR_AREA_SELECTED } from '../events/editor-config-area';
import { HomeAssistant } from '../ha/types';
import { SECTION } from '../types/section';
import { Store } from './store';

export class BaseElement extends LitElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) protected _store!: Store;
  @property({ attribute: 'editor-dimmed', type: Boolean, reflect: true }) protected editorDimmed = false;

  protected section?: SECTION;

  private _onAreaSelected: (ev: Event) => void;

  constructor(section?: SECTION) {
    super();
    if (section) {
      this.section = section;
    }
    this._onAreaSelected = this._changeDimmedState.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.section && this._store !== undefined && this.isBaseInEditor) {
      document.addEventListener(EDITOR_AREA_SELECTED, this._onAreaSelected);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.section && this._store !== undefined && this.isBaseInEditor) {
      document.removeEventListener(EDITOR_AREA_SELECTED, this._onAreaSelected);
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._store && !this._store.hass) {
      this._store.hass = hass;
    }
  }

  get hass(): HomeAssistant {
    return this._hass;
  }

  private get _sectionInEditor(): SECTION | undefined {
    return this._store?._sectionInEditor;
  }

  protected _changeDimmedState = (ev: Event) => {
    if (!this.section || !this.isBaseInEditor) {
      return;
    }
    const evArgs = (ev as CustomEvent).detail as { section: SECTION };
    const selectedArea = evArgs.section;
    if (this.section && selectedArea) {
      if (selectedArea === SECTION.DEFAULT || this.section === selectedArea) {
        this.editorDimmed = false;
        return;
      }
      const isNotSelected = this.notSelectedAndNotDefault;
      this.editorDimmed = isNotSelected;
    }
  };

  get notSelectedAndNotDefault(): boolean {
    if (!this.section || !this.isBaseInEditor) {
      return false;
    }
    const isDefault = this._sectionInEditor === SECTION.DEFAULT;
    if (isDefault) {
      return false;
    }
    const isSameSection = this.section === this._sectionInEditor;
    if (isSameSection) {
      return false;
    }
    return true;
  }

  get isBaseInEditor(): boolean {
    return this._store.card.isEditorPreview;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host([editor-dimmed]) {
          opacity: 0.2;
          filter: blur(1px);
        }
        :host([editor-dimmed]:hover) {
          opacity: 1;
          filter: none;
        }
      `,
      cardstyles,
    ];
  }
}
