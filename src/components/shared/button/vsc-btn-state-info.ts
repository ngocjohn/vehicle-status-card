import { css, CSSResultGroup, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

@customElement('vsc-btn-state-info')
export class VscBtnStateInfo extends LitElement {
  @property({ attribute: false }) public primary?: string | TemplateResult<1>;
  @property({ attribute: false }) public secondary?: TemplateResult;
  @property({ type: Boolean }) public multiline_secondary?: boolean = false;

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <span class="primary">${this.primary ?? ''}</span>
        ${this.secondary
          ? html`<span class=${classMap({ secondary: true, multiline_secondary: this.multiline_secondary! })}
              >${this.secondary}</span
            >`
          : html``}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .primary {
        font-weight: var(--card-primary-font-weight, 500);
        font-size: var(--card-primary-font-size, 14px);
        line-height: var(--card-primary-line-height, 20px);
        color: var(--card-primary-color, var(--primary-text-color));
        letter-spacing: var(--card-primary-letter-spacing, 0.1px);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
      .secondary {
        font-weight: var(--card-secondary-font-weight, 400);
        font-size: var(--card-secondary-font-size, 12px);
        line-height: var(--card-secondary-line-height, 16px);
        color: var(--card-secondary-color, var(--primary-text-color));
        letter-spacing: var(--card-secondary-letter-spacing, 0.4px);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
      .multiline_secondary {
        white-space: pre-wrap;
        width: 100%;
        display: flex;
      }
    `;
  }
}
