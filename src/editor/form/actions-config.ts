export const computeActionsFormSchema = () => {
  return [
    {
      name: 'tap_action',
      selector: {
        ui_action: {
          default_action: 'none',
        },
      },
    },
    {
      name: 'hold_action',
      selector: {
        ui_action: {
          default_action: 'none',
        },
      },
    },
    {
      name: 'double_tap_action',
      selector: {
        ui_action: {
          default_action: 'none',
        },
      },
    },
  ];
};
