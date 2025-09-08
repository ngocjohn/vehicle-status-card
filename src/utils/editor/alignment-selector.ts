import { css, CSSResultGroup, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { HomeAssistant } from '../../ha';
import { capitalizeFirstLetter } from '../../ha/common/string/capitalize-first-letter';

const ALIGNMENT = ['default', 'start', 'center', 'end', 'justify'] as const;
type Alignment = (typeof ALIGNMENT)[number];

const ICONS: Record<Alignment, string> = {
  default: 'mdi:format-align-left',
  start: 'mdi:format-align-left',
  center: 'mdi:format-align-center',
  end: 'mdi:format-align-right',
  justify: 'mdi:format-align-justify',
};

@customElement('vsc-alignment-selector')
export class AlignmentSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() public label = '';
  @property() public value?: string;
  @property() public configValue = '';

  render() {
    const value = this.value || 'default';

    return html`
      <ha-select
        icon
        .label=${this.label}
        .configValue=${this.configValue}
        .value=${this.value || 'default'}
        @selected=${this._selectedChange}
        @closed=${(ev: any) => ev.stopPropagation()}
        fixedMenuPosition
        naturalMenuWidth
      >
        <ha-icon slot="icon" .icon=${ICONS[value as Alignment]}></ha-icon>
        ${ALIGNMENT.map((alignment) => {
          return html`
            <ha-list-item .value=${alignment} graphic="icon">
              ${capitalizeFirstLetter(alignment)}
              <ha-icon slot="graphic" .icon=${ICONS[alignment]}></ha-icon>
            </ha-list-item>
          `;
        })}
      </ha-select>
    `;
  }

  _selectedChange(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    if (value) {
      this.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: value !== 'default' ? value : '',
          },
        })
      );
    }
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
