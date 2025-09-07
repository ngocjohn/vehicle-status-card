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

export const DEFAULT_ACTIONS: UiAction[] = [
  'more-info',
  'toggle',
  'navigate',
  'url',
  'perform-action',
  'assist',
  'none',
];

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
const groupActions: UiAction[] = ['navigate', 'url', 'perform-action', 'assist', 'none'];

export const computeOptionalActionSchemaFull = (noTap: boolean = false) => {
  const tapGestureActions = noTap
    ? (['hold_action', 'double_tap_action'] as const)
    : (['tap_action', 'hold_action', 'double_tap_action'] as const);
  const actions = noTap ? groupActions : DEFAULT_ACTIONS;

  return [
    {
      name: '',
      type: 'optional_actions',
      flatten: true,
      schema: tapGestureActions.map((action) => ({
        name: action,
        label: action.replace(/_/g, ' '),
        selector: {
          ui_action: {
            actions: actions || DEFAULT_ACTIONS,
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
