import { UiAction } from '../../ha';

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
// const groupActions: UiAction[] = ['navigate', 'url', 'perform-action', 'assist', 'none'];

export const computeOptionalActionSchemaFull = (noTap: boolean = false) => {
  const tapGestureActions = [...(noTap ? [] : (['tap_action'] as const)), 'hold_action', 'double_tap_action'] as const;

  // const tapGestureActions = noTap
  //   ? (['hold_action', 'double_tap_action'] as const)
  //   : (['tap_action', 'hold_action', 'double_tap_action'] as const);
  // const actions = noTap ? groupActions : DEFAULT_ACTIONS;

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
            actions: DEFAULT_ACTIONS,
            default_action: 'none' as const,
          },
        },
      })),
    },
  ] as const;
};

const IconActionsKeys = ['icon_tap_action', 'icon_hold_action', 'icon_double_tap_action'] as const;
type IconActionKey = (typeof IconActionsKeys)[number];

const IconActionLabels: Record<IconActionKey, string> = {
  icon_tap_action: 'Icon Tap Behavior',
  icon_hold_action: 'Icon Hold Behavior',
  icon_double_tap_action: 'Icon Double Tap Behavior',
};

export const computeIconActionSchema = (actions?: UiAction[]) => {
  return [
    {
      name: '',
      type: 'optional_actions',
      flatten: true,
      schema: [
        ...IconActionsKeys.map((action) => ({
          name: action,
          label: IconActionLabels[action],
          selector: {
            ui_action: {
              actions: actions ?? DEFAULT_ACTIONS,
              default_action: 'none' as const,
            },
          },
        })),
      ],
    },
  ] as const;
};
