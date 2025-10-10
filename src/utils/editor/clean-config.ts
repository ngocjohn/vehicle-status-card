import isEmpty from 'es-toolkit/compat/isEmpty';

import { VehicleStatusCardConfig } from '../../types/config';

export const cleanConfig = (config: VehicleStatusCardConfig): VehicleStatusCardConfig => {
  // Deep clone the config to avoid mutating the original object
  const cleanedConfig = JSON.parse(JSON.stringify(config)) as VehicleStatusCardConfig;
  // find the difference between config and cleanedConfig
  const diff: string[] = [];
  Object.keys(cleanedConfig).forEach((key) => {
    const keyToRemove = isEmpty((cleanedConfig as any)[key]);
    if (keyToRemove) {
      delete (cleanedConfig as any)[key];
      diff.push(key);
    }
  });
  if (diff.length > 0) {
    console.debug('Cleaned config, removed undefined or empty properties:', diff);
  }
  return cleanedConfig;
};
