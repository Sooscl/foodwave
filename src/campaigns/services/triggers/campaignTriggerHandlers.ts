import type {
  ITriggerPlugin,
  TriggerExecutionContext,
} from '../../../automation/contracts/automationContracts';

class GenericTriggerPlugin implements ITriggerPlugin {
  constructor(public readonly type: string) {}

  async execute(context: TriggerExecutionContext): Promise<boolean> {
    if (context.event.type !== this.type) {
      return false;
    }

    const explicitDisable = context.trigger.config.enabled === false;
    return !explicitDisable;
  }
}

const CAMPAIGN_TRIGGER_TYPES = [
  'customer_created',
  'first_visit',
  'visit_registered',
  'birthday',
  'customer_inactive',
  'customer_returned',
  'points_earned',
  'reward_available',
  'level_changed',
  'wallet_installed',
  'wallet_updated',
];

export const createCampaignTriggerPlugins = (): ITriggerPlugin[] => {
  return CAMPAIGN_TRIGGER_TYPES.map((type) => new GenericTriggerPlugin(type));
};
