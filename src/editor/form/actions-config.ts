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
const ActionKey = ['tap_action', 'hold_action', 'double_tap_action'] as const;
type ActionKey = (typeof ActionKey)[number];

const IconActionsKeys = ['icon_tap_action', 'icon_hold_action', 'icon_double_tap_action'] as const;
type IconActionKey = (typeof IconActionsKeys)[number];

const ActionLabel: Record<ActionKey | IconActionKey, string> = {
  tap_action: 'Tap behavior',
  hold_action: 'Hold behavior',
  double_tap_action: 'Double tap behavior',
  icon_tap_action: 'Icon tap behavior',
  icon_hold_action: 'Icon hold behavior',
  icon_double_tap_action: 'Icon double tap behavior',
};

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
  const tapGestureActions: ActionKey[] = noTap
    ? (['hold_action', 'double_tap_action'] as const)
    : (['tap_action', 'hold_action', 'double_tap_action'] as const);

  return [
    {
      name: '',
      type: 'optional_actions',
      flatten: true,
      schema: tapGestureActions.map((action: string) => ({
        name: action,
        label: ActionLabel[action as ActionKey],
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

export const computeIconActionSchema = (actions?: UiAction[]) => {
  return [
    {
      name: '',
      type: 'optional_actions',
      flatten: true,
      schema: [
        ...IconActionsKeys.map((action) => ({
          name: action,
          label: ActionLabel[action],
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
