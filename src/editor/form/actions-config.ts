import { UiAction } from '../../ha';
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

const DEFAULT_ACTIONS: UiAction[] = ['more-info', 'toggle', 'navigate', 'url', 'perform-action', 'assist', 'none'];

export const computeOptionalActionSchema = () => {
  return [
    {
      name: 'tap_action',
      label: 'Tap Action',
      selector: {
        ui_action: {
          actions: DEFAULT_ACTIONS,
          default_action: 'none' as const,
        },
      },
    },
    {
      name: '',
      type: 'optional_actions',
      flatten: true,
      schema: (['hold_action', 'double_tap_action'] as const).map((action) => ({
        name: action,
        selector: {
          ui_action: {
            actions: DEFAULT_ACTIONS,
            default_action: 'none' as const,
          },
        },
      })),
    },
  ] as const;
};

export const computeOptionalActionSchemaFull = () => {
  return [
    {
      name: '',
      type: 'optional_actions',
      flatten: true,
      schema: (['tap_action', 'hold_action', 'double_tap_action'] as const).map((action) => ({
        name: action,
        label: action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' '),
        selector: {
          ui_action: {
            actions: DEFAULT_ACTIONS,
            default_action: 'none' as const,
          },
        },
      })),
    },
  ] as const;
};
// export const computeOptionalActionSchema = (full: boolean = true, defaultAction?: string) => {
//   const tapActionSchema = (defaultAction?: string) => ({
//     name: 'tap_action',
//     label: 'Tap Action',
//     selector: {
//       ui_action: {
//         actions: DEFAULT_ACTIONS,
//         default_action: defaultAction || 'none',
//       },
//     },
//   });
//   return [
//     !full
//       ? tapActionSchema(defaultAction)
//       : {
//           name: '',
//           type: 'optional_actions',
//           flatten: true,
//           schema: [
//             { ...(full && tapActionSchema()) },
//             {
//               name: 'hold_action',
//               label: 'Hold Action',
//               selector: {
//                 ui_action: {
//                   actions: DEFAULT_ACTIONS,
//                   default_action: 'none',
//                 },
//               },
//             },

//             {
//               name: 'double_tap_action',
//               label: 'Double Tap Action',
//               selector: {
//                 ui_action: {
//                   actions: DEFAULT_ACTIONS,
//                   default_action: 'none',
//                 },
//               },
//             },
//           ],
//         },
//   ] as const;
// };
