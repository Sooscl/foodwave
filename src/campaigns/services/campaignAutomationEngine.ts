import {
  ActionRegistry,
  AutomationEngine,
  InternalEventBus,
  TriggerRegistry,
  type DomainEvent,
} from '../../automation';
import type { IEventBus } from '../../automation/contracts/automationContracts';
import type { AutomationExecutionResult } from '../../automation/types/automationTypes';
import type { CampaignConditionContext } from '../types';
import { CampaignIntegrationAdapter } from './campaignIntegrationService';
import { CampaignRepository } from './campaignRepository';
import { CampaignRuleEvaluator } from './campaignRuleEvaluator';
import { createCampaignActionPlugins } from './actions/campaignActionHandlers';
import { createCampaignTriggerPlugins } from './triggers/campaignTriggerHandlers';

const CAMPAIGN_EVENT_TYPES = [
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

export class CampaignAutomationRuntime {
  private readonly repository = new CampaignRepository();
  private readonly adapter = new CampaignIntegrationAdapter();
  private readonly ruleEvaluator = new CampaignRuleEvaluator();
  private readonly actionRegistry = new ActionRegistry();
  private readonly triggerRegistry = new TriggerRegistry();
  private readonly engine = new AutomationEngine<CampaignConditionContext>({
    repository: this.repository,
    integrationAdapter: this.adapter,
    ruleEvaluator: this.ruleEvaluator,
    actionRegistry: this.actionRegistry,
    triggerRegistry: this.triggerRegistry,
  });

  constructor(private readonly eventBus: IEventBus) {
    for (const triggerPlugin of createCampaignTriggerPlugins()) {
      this.engine.registerTrigger(triggerPlugin);
    }

    for (const actionPlugin of createCampaignActionPlugins(this.adapter)) {
      this.engine.registerAction(actionPlugin);
    }
  }

  subscribe(): Array<() => void> {
    return CAMPAIGN_EVENT_TYPES.map((eventType) => {
      return this.eventBus.subscribe(eventType, async (event) => {
        await this.engine.handleEvent(event);
      });
    });
  }

  async handleDomainEvent(event: DomainEvent): Promise<AutomationExecutionResult[]> {
    return this.engine.handleEvent(event);
  }
}

let singletonRuntime: CampaignAutomationRuntime | null = null;
let singletonBus: IEventBus | null = null;

export const getCampaignEventBus = (): IEventBus => {
  if (!singletonBus) {
    singletonBus = new InternalEventBus();
  }

  return singletonBus;
};

export const getCampaignAutomationRuntime = (): CampaignAutomationRuntime => {
  if (!singletonRuntime) {
    singletonRuntime = new CampaignAutomationRuntime(getCampaignEventBus());
    singletonRuntime.subscribe();
  }

  return singletonRuntime;
};
