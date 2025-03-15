import { HomeAssistant } from '../home-assistant';

export type HistoryStates = Record<string, EntityHistoryState[]>;

export interface EntityHistoryState {
  /** state */
  s: string;
  /** attributes */
  a: Record<string, any>;
  /** last_changed; if set, also applies to lu */
  lc?: number;
  /** last_updated */
  lu: number;
}

export interface HistoryStreamMessage {
  states: HistoryStates;
  start_time?: number; // Start time of this historical chunk
  end_time?: number; // End time of this historical chunk
}

class HistoryStream {
  hass: HomeAssistant;

  hoursToShow?: number;

  combinedHistory: HistoryStates;

  constructor(hass: HomeAssistant, hoursToShow?: number) {
    this.hass = hass;
    this.hoursToShow = hoursToShow;
    this.combinedHistory = {};
  }

  processMessage(streamMessage: HistoryStreamMessage): HistoryStates {
    if (!this.combinedHistory || !Object.keys(this.combinedHistory).length) {
      this.combinedHistory = streamMessage.states;
      return this.combinedHistory;
    }
    if (!Object.keys(streamMessage.states).length) {
      // Empty messages are still sent to
      // indicate no more historical events
      return this.combinedHistory;
    }
    const purgeBeforePythonTime = this.hoursToShow
      ? (new Date().getTime() - 60 * 60 * this.hoursToShow * 1000) / 1000
      : undefined;
    const newHistory: HistoryStates = {};
    for (const entityId of Object.keys(this.combinedHistory)) {
      newHistory[entityId] = [];
    }
    for (const entityId of Object.keys(streamMessage.states)) {
      newHistory[entityId] = [];
    }
    for (const entityId of Object.keys(newHistory)) {
      if (entityId in this.combinedHistory && entityId in streamMessage.states) {
        const entityCombinedHistory = this.combinedHistory[entityId];
        const lastEntityCombinedHistory = entityCombinedHistory[entityCombinedHistory.length - 1];
        newHistory[entityId] = entityCombinedHistory.concat(streamMessage.states[entityId]);
        if (streamMessage.states[entityId][0].lu < lastEntityCombinedHistory.lu) {
          // If the history is out of order we have to sort it.
          newHistory[entityId] = newHistory[entityId].sort((a, b) => a.lu - b.lu);
        }
      } else if (entityId in this.combinedHistory) {
        newHistory[entityId] = this.combinedHistory[entityId];
      } else {
        newHistory[entityId] = streamMessage.states[entityId];
      }
      // Remove old history
      if (purgeBeforePythonTime && entityId in this.combinedHistory) {
        const expiredStates = newHistory[entityId].filter((state) => state.lu < purgeBeforePythonTime);
        if (!expiredStates.length) {
          continue;
        }
        newHistory[entityId] = newHistory[entityId].filter((state) => state.lu >= purgeBeforePythonTime);
        if (newHistory[entityId].length && newHistory[entityId][0].lu === purgeBeforePythonTime) {
          continue;
        }
        // Update the first entry to the start time state
        // as we need to preserve the start time state and
        // only expire the rest of the history as it ages.
        const lastExpiredState = expiredStates[expiredStates.length - 1];
        lastExpiredState.lu = purgeBeforePythonTime;
        newHistory[entityId].unshift(lastExpiredState);
      }
    }
    this.combinedHistory = newHistory;
    return this.combinedHistory;
  }
}

export const subscribeHistoryStatesTimeWindow = (
  hass: HomeAssistant,
  callbackFunction: (data: HistoryStates) => void,
  hoursToShow: number,
  entityIds: string[],
  noAttributes?: boolean,
  minimalResponse = true,
  significantChangesOnly = true
): Promise<() => Promise<void>> => {
  const params = {
    type: 'history/stream',
    entity_ids: entityIds,
    start_time: new Date(new Date().getTime() - 60 * 60 * hoursToShow * 1000).toISOString(),
    minimal_response: minimalResponse,
    significant_changes_only: significantChangesOnly,
    no_attributes: noAttributes,
  };
  const stream = new HistoryStream(hass, hoursToShow);
  return hass.connection.subscribeMessage<HistoryStreamMessage>(
    (message) => callbackFunction(stream.processMessage(message)),
    params
  );
};
