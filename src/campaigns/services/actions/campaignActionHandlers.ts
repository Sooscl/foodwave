import type {
  ActionExecutionContext,
  IActionPlugin,
} from '../../../automation/contracts/automationContracts';
import type { ActionResult } from '../../../automation/types/automationTypes';
import type { CampaignConditionContext } from '../../types';
import { renderTemplate } from '../../utils/templateRenderer';
import { CampaignIntegrationAdapter } from '../campaignIntegrationService';

const actionSuccess = (executionTime: number, metadata: Record<string, unknown> = {}): ActionResult => {
  return {
    success: true,
    executionTime,
    metadata,
    errors: [],
  };
};

const actionFailure = (executionTime: number, error: string): ActionResult => {
  return {
    success: false,
    executionTime,
    metadata: {},
    errors: [error],
  };
};

const textConfig = (config: Record<string, unknown>, key: string, fallback: string): string => {
  const value = config[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

const numberConfig = (config: Record<string, unknown>, key: string, fallback: number): number => {
  const value = config[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const model = (input: {
  campaignName: string;
  campaignId: string;
  customerId: string | null;
  eventPayload: Record<string, unknown>;
  context: CampaignConditionContext;
}): Record<string, unknown> => {
  return {
    campaign: {
      name: input.campaignName,
      id: input.campaignId,
    },
    customer: {
      id: input.customerId,
    },
    payload: input.eventPayload,
    context: input.context,
  };
};

class GrantPointsActionPlugin implements IActionPlugin<CampaignConditionContext> {
  readonly type = 'grant_points';

  constructor(private readonly adapter: CampaignIntegrationAdapter) {}

  async execute(context: ActionExecutionContext<CampaignConditionContext>): Promise<ActionResult> {
    const start = Date.now();

    if (!context.event.customerId) {
      return actionFailure(Date.now() - start, 'Customer id is required for grant_points');
    }

    const visitId = textConfig(context.action.config, 'visit_id', String(context.event.payload.visit_id ?? ''));
    const totalAmount = numberConfig(context.action.config, 'total_amount', Number(context.event.payload.total_amount ?? 0));

    if (!visitId || totalAmount <= 0) {
      return actionFailure(Date.now() - start, 'grant_points requires visit_id and total_amount > 0');
    }

    const result = await this.adapter.grantPoints({
      organizationId: context.event.organizationId,
      customerId: context.event.customerId,
      visitId,
      totalAmount,
      metadata: {
        execution_id: context.executionId,
        source: 'campaigns',
      },
    });

    if (result.error) {
      return actionFailure(Date.now() - start, result.error);
    }

    return actionSuccess(Date.now() - start);
  }
}

class GrantRewardActionPlugin implements IActionPlugin<CampaignConditionContext> {
  readonly type = 'grant_reward';

  constructor(private readonly adapter: CampaignIntegrationAdapter) {}

  async execute(context: ActionExecutionContext<CampaignConditionContext>): Promise<ActionResult> {
    const start = Date.now();

    if (!context.event.customerId) {
      return actionFailure(Date.now() - start, 'Customer id is required for grant_reward');
    }

    const rewardId = textConfig(context.action.config, 'reward_id', '');
    if (!rewardId) {
      return actionFailure(Date.now() - start, 'grant_reward requires reward_id');
    }

    const result = await this.adapter.grantReward({
      organizationId: context.event.organizationId,
      customerId: context.event.customerId,
      rewardId,
      notes: 'Granted by campaign automation',
      metadata: {
        execution_id: context.executionId,
      },
    });

    if (result.error) {
      return actionFailure(Date.now() - start, result.error);
    }

    return actionSuccess(Date.now() - start);
  }
}

class GenerateCouponActionPlugin implements IActionPlugin<CampaignConditionContext> {
  readonly type = 'generate_coupon';

  constructor(private readonly adapter: CampaignIntegrationAdapter) {}

  async execute(context: ActionExecutionContext<CampaignConditionContext>): Promise<ActionResult> {
    const start = Date.now();

    if (!context.event.customerId) {
      return actionFailure(Date.now() - start, 'Customer id is required for generate_coupon');
    }

    const couponTemplate = textConfig(context.action.config, 'coupon_code_template', 'FW-{{campaign.id}}-{{customer.id}}');
    const code = renderTemplate(
      couponTemplate,
      model({
        campaignName: context.consumerId,
        campaignId: context.consumerId,
        customerId: context.event.customerId,
        eventPayload: context.event.payload,
        context: context.context,
      }),
    );

    if (!code.trim()) {
      return actionFailure(Date.now() - start, 'Unable to render coupon code');
    }

    const result = await this.adapter.generateCoupon({
      organizationId: context.event.organizationId,
      customerId: context.event.customerId,
      campaignName: context.consumerId,
      couponCode: code,
      couponValue: numberConfig(context.action.config, 'coupon_value', 0),
    });

    if (result.error) {
      return actionFailure(Date.now() - start, result.error);
    }

    return actionSuccess(Date.now() - start, { couponCode: code });
  }
}

class UpdateWalletActionPlugin implements IActionPlugin<CampaignConditionContext> {
  readonly type = 'update_wallet';

  constructor(private readonly adapter: CampaignIntegrationAdapter) {}

  async execute(context: ActionExecutionContext<CampaignConditionContext>): Promise<ActionResult> {
    const start = Date.now();

    if (!context.event.customerId) {
      return actionFailure(Date.now() - start, 'Customer id is required for update_wallet');
    }

    const result = await this.adapter.updateWallet(context.event.organizationId, context.event.customerId);

    if (result.error) {
      return actionFailure(Date.now() - start, result.error);
    }

    return actionSuccess(Date.now() - start);
  }
}

class CreateCrmTaskActionPlugin implements IActionPlugin<CampaignConditionContext> {
  readonly type = 'create_crm_task';

  constructor(private readonly adapter: CampaignIntegrationAdapter) {}

  async execute(context: ActionExecutionContext<CampaignConditionContext>): Promise<ActionResult> {
    const start = Date.now();

    if (!context.event.customerId) {
      return actionFailure(Date.now() - start, 'Customer id is required for create_crm_task');
    }

    const taskTemplate = textConfig(context.action.config, 'task_message', 'Follow up campaign {{campaign.name}}');
    const taskMessage = renderTemplate(
      taskTemplate,
      model({
        campaignName: context.consumerId,
        campaignId: context.consumerId,
        customerId: context.event.customerId,
        eventPayload: context.event.payload,
        context: context.context,
      }),
    );

    const result = await this.adapter.createCrmTask({
      customerId: context.event.customerId,
      campaignName: context.consumerId,
      taskMessage,
    });

    if (result.error) {
      return actionFailure(Date.now() - start, result.error);
    }

    return actionSuccess(Date.now() - start);
  }
}

class SendNotificationActionPlugin implements IActionPlugin<CampaignConditionContext> {
  readonly type = 'send_notification';

  constructor(private readonly adapter: CampaignIntegrationAdapter) {}

  async execute(context: ActionExecutionContext<CampaignConditionContext>): Promise<ActionResult> {
    const start = Date.now();

    if (!context.event.customerId) {
      return actionFailure(Date.now() - start, 'Customer id is required for send_notification');
    }

    const title = textConfig(context.action.config, 'title', context.consumerId);
    const bodyTemplate = textConfig(context.action.config, 'body', 'FoodWave has a new update for you.');
    const body = renderTemplate(
      bodyTemplate,
      model({
        campaignName: context.consumerId,
        campaignId: context.consumerId,
        customerId: context.event.customerId,
        eventPayload: context.event.payload,
        context: context.context,
      }),
    );

    const result = await this.adapter.sendNotification({
      customerId: context.event.customerId,
      campaignName: context.consumerId,
      title,
      body,
    });

    if (result.error) {
      return actionFailure(Date.now() - start, result.error);
    }

    return actionSuccess(Date.now() - start);
  }
}

class LogExecutionActionPlugin implements IActionPlugin<CampaignConditionContext> {
  readonly type = 'log_execution';

  async execute(): Promise<ActionResult> {
    return actionSuccess(0, { message: 'execution logged' });
  }
}

export const createCampaignActionPlugins = (
  adapter: CampaignIntegrationAdapter,
): IActionPlugin<CampaignConditionContext>[] => {
  return [
    new GrantPointsActionPlugin(adapter),
    new GrantRewardActionPlugin(adapter),
    new GenerateCouponActionPlugin(adapter),
    new UpdateWalletActionPlugin(adapter),
    new CreateCrmTaskActionPlugin(adapter),
    new SendNotificationActionPlugin(adapter),
    new LogExecutionActionPlugin(),
  ];
};
