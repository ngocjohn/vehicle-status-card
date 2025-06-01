export const computeActionsFormSchema = () => {
  return [
    {
      name: 'tap_action',
      label: 'Tap Action',
      selector: {
        ui_action: {
          default_action: 'none',
        },
      },
    },
    {
      name: 'hold_action',
      label: 'Hold Action',
      selector: {
        ui_action: {
          default_action: 'none',
        },
      },
    },
    {
      name: 'double_tap_action',
      label: 'Double Tap Action',
      selector: {
        ui_action: {
          default_action: 'none',
        },
      },
    },
  ] as const;
};

const DEFAULT_ACTIONS = ['more-info', 'toggle', 'navigate', 'perform-action', 'assist'];

export const computeOptionalActionSchema = (full: boolean = true, defaultAction?: string) => {
  const tapActionSchema = (defaultAction?: string) => ({
    name: 'tap_action',
    label: 'Tap Action',
    selector: {
      ui_action: {
        actions: DEFAULT_ACTIONS,
        default_action: defaultAction || 'none',
      },
    },
  });
  return [
    !full
      ? tapActionSchema(defaultAction)
      : {
          name: '',
          type: 'optional_actions',
          flatten: true,
          schema: [
            { ...(full && tapActionSchema()) },
            {
              name: 'hold_action',
              label: 'Hold Action',
              selector: {
                ui_action: {
                  actions: DEFAULT_ACTIONS,
                  default_action: 'none',
                },
              },
            },

            {
              name: 'double_tap_action',
              label: 'Double Tap Action',
              selector: {
                ui_action: {
                  actions: DEFAULT_ACTIONS,
                  default_action: 'none',
                },
              },
            },
          ],
        },
  ] as const;
};
