import {
  mdiAlignHorizontalDistribute,
  mdiFormatAlignCenter,
  mdiFormatAlignJustify,
  mdiFormatAlignLeft,
  mdiFormatAlignRight,
} from '@mdi/js';
import { css, CSSResultGroup, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { HomeAssistant } from '../../ha';
import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';
import { ALIGNMENT, Alignment } from '../../types/config/card/row-indicators';

interface HaSelectOption {
  value: string | number;
  label?: string;
  secondary?: string;
  iconPath?: string;
  disabled?: boolean;
}

const ICONS: Record<Alignment, string> = {
  default: mdiAlignHorizontalDistribute,
  start: mdiFormatAlignLeft,
  center: mdiFormatAlignCenter,
  end: mdiFormatAlignRight,
  justify: mdiFormatAlignJustify,
};

const ALIGNMENT_OPTIONS: HaSelectOption[] = ALIGNMENT.map((alignment) => ({
  value: alignment,
  label: capitalizeFirstLetter(alignment),
  iconPath: ICONS[alignment],
}));

@customElement('vsc-alignment-selector')
export class AlignmentSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() public label = '';
  @property() public value?: Alignment;
  @property() public configValue = '';
  @property() _selectedChange = (): void => {};

  render() {
    const value = this.value || 'default';

    return html`
      <ha-select
        .label=${this.label}
        .configValue=${this.configValue}
        .value=${value}
        @selected=${this._selectedChange}
        @closed=${(ev: any) => ev.stopPropagation()}
        .options=${ALIGNMENT_OPTIONS}
        fixedMenuPosition
        naturalMenuWidth
      >
      </ha-select>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        width: 100%;
      }
      ha-select {
        width: 100%;
      }
    `;
  }
}
