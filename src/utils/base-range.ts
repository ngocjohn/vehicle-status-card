import pick from 'es-toolkit/compat/pick';
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { property, state } from 'lit/decorators.js';

import { RenderTemplateResult, subscribeRenderTemplate, hasTemplate } from '../ha';
import { HomeAssistant } from '../ha';
import {
  RangeInfoConfig,
  RANGE_INFO_TEMPLATE_KEYS,
  RangeInfoTemplateKey,
  RangeInfoLayoutConfig,
  RANGE_LAYOUT_KEYS,
  ActionsSharedConfig,
  ACTION_SHARED_KEYS,
  RangeItemConfig,
} from '../types/config';
import { BaseElement } from './base-element';

export const RANGE_INFO_DEFAULT_LAYOUT: RangeInfoLayoutConfig = {
  bar_height: 14,
  bar_width: 100,
  bar_radius: 5,
};

export class VscBaseRange extends BaseElement {
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) protected rangeItem!: RangeInfoConfig;

  @state() protected _templateResults: Partial<Record<RangeInfoTemplateKey, RenderTemplateResult | undefined>> = {};
  @state() protected _unsubRenderTemplates: Map<RangeInfoTemplateKey, Promise<UnsubscribeFunc>> = new Map();

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private async _tryConnect(): Promise<void> {
    RANGE_INFO_TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: RangeInfoTemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this.hass || !hasTemplate(this.rangeItem[key])) {
      return;
    }

    const rangeItem = this.rangeItem;
    const templateValue = this.rangeItem[key];
    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [key]: result,
          };
        },
        {
          template: templateValue ?? '',
          entity_ids: rangeItem.energy_level.entity ? [rangeItem.energy_level.entity] : undefined,
          variables: {
            config: rangeItem,
            user: this.hass.user!.name,
          },
          strict: true,
        }
      );
      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.warn('Error rendering template', e);
      const result = {
        result: templateValue ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [key]: result,
      };
      this._unsubRenderTemplates.delete(key);
    }
  }
  private async _tryDisconnect(): Promise<void> {
    RANGE_INFO_TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: RangeInfoTemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  protected get _energyLevel(): RangeItemConfig {
    return this.rangeItem.energy_level;
  }

  protected get _rangeLevel(): Omit<RangeItemConfig, 'max_value' | 'value_alignment'> | undefined {
    return this.rangeItem.range_level;
  }

  protected get _layoutConfig(): RangeInfoLayoutConfig {
    return pick(this.rangeItem, [...RANGE_LAYOUT_KEYS]);
  }

  protected get _energyActionsConfig(): ActionsSharedConfig {
    return pick(this._energyLevel, ['entity', ...ACTION_SHARED_KEYS]);
  }
  protected get _rangeActionsConfig(): ActionsSharedConfig {
    if (!this._rangeLevel) {
      return {};
    }
    return pick(this._rangeLevel, ['entity', ...ACTION_SHARED_KEYS]);
  }

  protected get _level(): number {
    const { entity, attribute } = this._energyLevel;
    const state = this._getEntityState(entity, attribute);
    return parseInt(state ?? '0', 10);
  }

  public _getEntityState = (entityId?: string, attribute?: string) => {
    if (!entityId || !this.hass.states[entityId]) {
      return undefined;
    }
    const stateObj = this.hass.states[entityId];
    return attribute
      ? this.hass.formatEntityAttributeValue(stateObj, attribute)
      : this.hass.formatEntityState(stateObj);
  };
}
