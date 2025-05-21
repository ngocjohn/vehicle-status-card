import { ActionConfig } from 'custom-card-helpers';

export type UiAction = Exclude<ActionConfig['action'], 'fire-dom-event'>;

export interface UiActionSelector {
  ui_action: {
    actions?: UiAction[];
  } | null;
}
