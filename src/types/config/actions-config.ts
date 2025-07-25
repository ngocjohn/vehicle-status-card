import { ActionConfig } from '../../ha';

export type ActionsSharedConfig = {
  entity?: string; // Optional entity for the action
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
};

export function hasAction(config?: ActionConfig): boolean {
  return config !== undefined && config.action !== 'none';
}

export function hasItemAction(config?: ActionsSharedConfig): boolean {
  return (
    config !== undefined &&
    Object.keys(config)
      .filter((key) => key !== 'entity')
      .some((action) => hasAction(config[action]))
  );
}
