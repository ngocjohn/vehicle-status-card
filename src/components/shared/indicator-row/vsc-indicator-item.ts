import { css, html, nothing, TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { COMPONENT } from '../../../constants/const';
import { computeEntityName, computeStateName, fireEvent } from '../../../ha';
import { computeCssColor } from '../../../ha/common/color/compute-color';
import { actionHandler, ActionHandlerEvent } from '../../../ha/panels/common/directives/action-handler-directive';
import { handleAction } from '../../../ha/panels/common/handle-actions';
import './vsc-indicator-badge';
import '../vsc-state-display';
import { hasAction } from '../../../types/config/actions-config';
import {
  GlobalAppearanceConfig,
  IndicatorEntityConfig,
  IndicatorRowGroupConfig,
} from '../../../types/config/card/row-indicators';
import { VscIndicatorItemBase } from '../../../utils/base-indicator';
import { VscIndicatorBadge } from './vsc-indicator-badge';

declare global {
  interface HASSDomEvents {
    'group-toggle': { index?: number; type?: string };
  }
}

@customElement(COMPONENT.INDICATOR_ITEM)
export class VscIndicatorItem extends VscIndicatorItemBase<IndicatorEntityConfig | IndicatorRowGroupConfig> {
  @property({ type: Number, attribute: 'item-index' }) public itemIndex?: number;
  @property({ type: Boolean, reflect: true }) public active = false;
  @property({ attribute: false }) private globalAppearance?: GlobalAppearanceConfig;
  @property({ type: Boolean, reflect: true, attribute: 'dimmed-in-editor' }) public dimmedInEditor = false;
  @query(COMPONENT.INDICATOR_BADGE) _badge!: VscIndicatorBadge;

  private get _visibility(): boolean {
    return Boolean(this._getTemplateResult('visibility') ?? true);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) {
      return nothing;
    }
    if (!Boolean(this._visibility)) {
      return nothing;
    }
    const isGroup = this.type === 'group';
    const hasGroupEntity = this._hasGroupEntity;
    const commonConfig = this.commonConfig;
    const stateObj = this._stateObj;
    if (!isGroup && !stateObj) {
      return this._renderNoEntity();
    }
    let style: Record<string, string> = {};

    let color: string | undefined;
    if (isGroup && !hasGroupEntity) {
      const configColor = (this._config as IndicatorRowGroupConfig).color;
      if (configColor) {
        color = computeCssColor(configColor);
      }
    } else {
      color = this._computeStateColor(stateObj!, this._config.color);
    }
    color = this._getTemplateResult('color_template') ?? color;

    if (color) {
      style['--badge-color'] = color;
    }

    const stateDisplay = this._renderStateDisplay();

    const name =
      this._config.name || (stateObj ? computeEntityName(stateObj!, this.hass) || computeStateName(stateObj!) : '');

    const showConfig = this._showConfig;
    const showName = showConfig.show_name;
    const showState = showConfig.show_state;
    const showIcon = showConfig.show_icon;
    const showEntityPicture = showConfig.show_entity_picture;

    const imageUrl = showEntityPicture ? this._getImageUrl(stateObj!) : undefined;

    const label = showState && showName ? name : undefined;

    const content = showState ? stateDisplay : showName ? name : undefined;

    const hasAction = this._hasAction;

    let iconSize = 21;
    let rowReverse = false;
    let colReverse = false;
    if (this.globalAppearance) {
      if (!this._config.ignore_global) {
        rowReverse = this.globalAppearance.global_row_reverse ?? false;
        colReverse = this.globalAppearance.global_column_reverse ?? false;
        iconSize = this.globalAppearance.global_icon_size ?? iconSize;
      }
    }
    rowReverse = commonConfig.row_reverse ?? rowReverse;
    colReverse = commonConfig.column_reverse ?? colReverse;
    iconSize = commonConfig.icon_size ?? iconSize;

    if (iconSize !== 21) {
      style['--badge-icon-size'] = `${iconSize}px`;
    }

    return html`
      <vsc-indicator-badge
        .type=${this.type}
        .label=${label}
        .hidden=${!Boolean(this._visibility)}
        .active=${this.active}
        .buttonRole=${Boolean(hasAction)}
        .iconOnly=${!content}
        .rowReverse=${rowReverse}
        .colReverse=${colReverse}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: true,
          hasDoubleClick: true,
        })}
        style=${styleMap(style)}
      >
        ${showIcon !== false
          ? imageUrl
            ? html`<img slot="icon" src=${imageUrl} />`
            : this._renderIcon(stateObj!)
          : nothing}
        ${content}
      </vsc-indicator-badge>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    ev.stopPropagation();

    const action = ev.detail.action;
    const isGroupEntity = this.type === 'group' || this._isGroupEntity;
    const config = this._itemActionsConfig;
    if (action === 'tap') {
      this.dispatchEvent(new CustomEvent('row-item-clicked', { bubbles: true, composed: true }));
      if (isGroupEntity) {
        fireEvent(this, 'group-toggle', {
          index: this.itemIndex,
          type: this.type,
        });
        return;
      }
      if (hasAction(config.tap_action)) {
        handleAction(this, this.hass, config, 'tap');
      }
      return;
    }

    if (action === 'hold' || action === 'double_tap') {
      if (hasAction(config[`${action}_action`])) {
        handleAction(this, this.hass, config, action);
      }
      // no event to parent
      return;
    }
  }

  static get styles() {
    return css`
      :host([dimmed-in-editor]),
      :host(.dimmed) {
        opacity: 0.2;
        filter: blur(1px);
      }
      :host([dimmed-in-editor]):hover,
      :host(.dimmed:hover) {
        opacity: 1 !important;
        filter: none !important;
      }
      :host(.peek) {
        border: 1px solid var(--accent-color);
        border-radius: var(--ha-badge-border-radius, calc(var(--ha-badge-size, 36px) / 2));
        background-color: rgba(var(--rgb-primary-color), 0.1);
      }
      vsc-indicator-badge.error {
        --badge-color: var(--red-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vsc-indicator-item': VscIndicatorItem;
  }
}
