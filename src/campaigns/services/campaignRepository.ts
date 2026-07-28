import { supabase } from '../../shared/lib/supabase';
import type { IAutomationRepository } from '../../automation/contracts/automationContracts';
import type {
  ActionDefinition,
  AutomationBundle,
  AutomationExecutionRecord,
  AutomationExecutionStatus,
  ConditionDefinition,
  ConsumerDefinition,
  TriggerDefinition,
} from '../../automation/types/automationTypes';

type SupabaseErrorLike = {
  message: string;
  code?: string;
};

const CAMPAIGN_COLUMNS =
  'id, organization_id, status, enabled, priority, start_date, end_date, metadata, created_at, updated_at';
const TRIGGER_COLUMNS = 'id, organization_id, campaign_id, trigger_type, enabled, config, created_at, updated_at';
const CONDITION_COLUMNS = 'id, organization_id, campaign_id, field, operator, value, logical_group, created_at, updated_at';
const ACTION_COLUMNS = 'id, organization_id, campaign_id, action_type, execution_order, enabled, config, created_at, updated_at';
const EXECUTION_COLUMNS =
  'id, organization_id, campaign_id, customer_id, trigger_event_type, trigger_event_id, execution_key, status, context_payload, created_at, updated_at';

const mapConsumer = (row: Record<string, unknown>): ConsumerDefinition => {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    status: String(row.status),
    enabled: Boolean(row.enabled),
    priority: Number(row.priority ?? 0),
    startAt: typeof row.start_date === 'string' ? row.start_date : null,
    endAt: typeof row.end_date === 'string' ? row.end_date : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
};

const mapTrigger = (row: Record<string, unknown>): TriggerDefinition => {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    consumerId: String(row.campaign_id),
    triggerType: String(row.trigger_type),
    enabled: Boolean(row.enabled),
    config: (row.config as Record<string, unknown>) ?? {},
  };
};

const mapCondition = (row: Record<string, unknown>): ConditionDefinition => {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    consumerId: String(row.campaign_id),
    field: String(row.field),
    operator: String(row.operator),
    value: row.value,
    group: typeof row.logical_group === 'string' ? row.logical_group : 'default',
  };
};

const mapAction = (row: Record<string, unknown>): ActionDefinition => {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    consumerId: String(row.campaign_id),
    actionType: String(row.action_type),
    order: Number(row.execution_order ?? 0),
    enabled: Boolean(row.enabled),
    config: (row.config as Record<string, unknown>) ?? {},
  };
};

const mapExecution = (row: Record<string, unknown>): AutomationExecutionRecord => {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    consumerId: String(row.campaign_id),
    customerId: typeof row.customer_id === 'string' ? row.customer_id : null,
    triggerType: String(row.trigger_event_type),
    triggerEventId: typeof row.trigger_event_id === 'string' ? row.trigger_event_id : null,
    executionKey: String(row.execution_key),
    status: row.status as AutomationExecutionStatus,
    contextPayload: (row.context_payload as Record<string, unknown>) ?? {},
  };
};

const isUniqueViolation = (error: SupabaseErrorLike | null): boolean => {
  return Boolean(error && error.code === '23505');
};

const isWithinWindow = (consumer: ConsumerDefinition, occurredAt: string): boolean => {
  const timestamp = Date.parse(occurredAt);
  if (!Number.isFinite(timestamp)) {
    return true;
  }

  if (consumer.startAt) {
    const start = Date.parse(consumer.startAt);
    if (Number.isFinite(start) && timestamp < start) {
      return false;
    }
  }

  if (consumer.endAt) {
    const end = Date.parse(consumer.endAt);
    if (Number.isFinite(end) && timestamp > end) {
      return false;
    }
  }

  return true;
};

export class CampaignRepository implements IAutomationRepository {
  async listBundlesForEvent(organizationId: string, eventType: string, occurredAt: string): Promise<AutomationBundle[]> {
    const triggerQuery = await supabase
      .from('campaign_triggers')
      .select(TRIGGER_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('trigger_type', eventType)
      .eq('enabled', true);

    if (triggerQuery.error || !triggerQuery.data) {
      return [];
    }

    const triggers = (triggerQuery.data as Record<string, unknown>[]).map((row) => mapTrigger(row));
    if (triggers.length === 0) {
      return [];
    }

    const campaignIds = Array.from(new Set(triggers.map((trigger) => trigger.consumerId)));

    const campaignQuery = await supabase
      .from('campaigns')
      .select(CAMPAIGN_COLUMNS)
      .eq('organization_id', organizationId)
      .in('id', campaignIds)
      .eq('enabled', true)
      .in('status', ['scheduled', 'active']);

    if (campaignQuery.error || !campaignQuery.data) {
      return [];
    }

    const consumers = (campaignQuery.data as Record<string, unknown>[])
      .map((row) => mapConsumer(row))
      .filter((consumer) => isWithinWindow(consumer, occurredAt));

    if (consumers.length === 0) {
      return [];
    }

    const activeIds = consumers.map((consumer) => consumer.id);

    const [conditionQuery, actionQuery] = await Promise.all([
      supabase
        .from('campaign_conditions')
        .select(CONDITION_COLUMNS)
        .eq('organization_id', organizationId)
        .in('campaign_id', activeIds),
      supabase
        .from('campaign_actions')
        .select(ACTION_COLUMNS)
        .eq('organization_id', organizationId)
        .in('campaign_id', activeIds)
        .eq('enabled', true)
        .order('execution_order', { ascending: true }),
    ]);

    const conditions = conditionQuery.error
      ? []
      : (conditionQuery.data as Record<string, unknown>[]).map((row) => mapCondition(row));
    const actions = actionQuery.error
      ? []
      : (actionQuery.data as Record<string, unknown>[]).map((row) => mapAction(row));

    const consumersById = new Map(consumers.map((consumer) => [consumer.id, consumer]));
    const conditionsByConsumer = new Map<string, ConditionDefinition[]>();
    const actionsByConsumer = new Map<string, ActionDefinition[]>();

    for (const condition of conditions) {
      const current = conditionsByConsumer.get(condition.consumerId) ?? [];
      current.push(condition);
      conditionsByConsumer.set(condition.consumerId, current);
    }

    for (const action of actions) {
      const current = actionsByConsumer.get(action.consumerId) ?? [];
      current.push(action);
      actionsByConsumer.set(action.consumerId, current);
    }

    return triggers
      .map((trigger) => {
        const consumer = consumersById.get(trigger.consumerId);
        if (!consumer) {
          return null;
        }

        return {
          consumer,
          trigger,
          conditions: conditionsByConsumer.get(consumer.id) ?? [],
          actions: actionsByConsumer.get(consumer.id) ?? [],
        };
      })
      .filter((bundle): bundle is AutomationBundle => bundle !== null)
      .sort((left, right) => right.consumer.priority - left.consumer.priority);
  }

  async createExecution(input: {
    organizationId: string;
    consumerId: string;
    customerId: string | null;
    triggerType: string;
    triggerEventId: string | null;
    executionKey: string;
    contextPayload: Record<string, unknown>;
  }): Promise<{ data: AutomationExecutionRecord | null; duplicate: boolean; error: string | null }> {
    const inserted = await supabase
      .from('campaign_executions')
      .insert({
        organization_id: input.organizationId,
        campaign_id: input.consumerId,
        customer_id: input.customerId,
        trigger_event_type: input.triggerType,
        trigger_event_id: input.triggerEventId,
        execution_key: input.executionKey,
        status: 'pending',
        context_payload: input.contextPayload,
      })
      .select(EXECUTION_COLUMNS)
      .single();

    if (inserted.error) {
      if (isUniqueViolation(inserted.error as SupabaseErrorLike)) {
        const existing = await supabase
          .from('campaign_executions')
          .select(EXECUTION_COLUMNS)
          .eq('organization_id', input.organizationId)
          .eq('execution_key', input.executionKey)
          .maybeSingle();

        if (existing.error || !existing.data) {
          return { data: null, duplicate: true, error: null };
        }

        return {
          data: mapExecution(existing.data as Record<string, unknown>),
          duplicate: true,
          error: null,
        };
      }

      return { data: null, duplicate: false, error: inserted.error.message };
    }

    return {
      data: mapExecution(inserted.data as Record<string, unknown>),
      duplicate: false,
      error: null,
    };
  }

  async updateExecutionStatus(
    executionId: string,
    status: AutomationExecutionStatus,
    errorMessage: string | null,
  ): Promise<string | null> {
    const payload: {
      status: AutomationExecutionStatus;
      started_at?: string;
      completed_at?: string;
      error_message: string | null;
    } = {
      status,
      error_message: errorMessage,
    };

    if (status === 'processing') {
      payload.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed' || status === 'skipped') {
      payload.completed_at = new Date().toISOString();
    }

    const result = await supabase.from('campaign_executions').update(payload).eq('id', executionId);
    return result.error ? result.error.message : null;
  }

  async createStructuredLog(input: {
    organizationId: string;
    executionId: string;
    consumerId: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    payload: Record<string, unknown>;
  }): Promise<string | null> {
    const result = await supabase.from('campaign_logs').insert({
      organization_id: input.organizationId,
      campaign_execution_id: input.executionId,
      campaign_id: input.consumerId,
      level: input.level,
      message: input.message,
      metadata: input.payload,
    });

    return result.error ? result.error.message : null;
  }
}
