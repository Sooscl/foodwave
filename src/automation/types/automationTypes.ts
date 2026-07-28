export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  organizationId: string;
  type: string;
  occurredAt: string;
  customerId: string | null;
  payload: TPayload;
}

export interface TriggerDefinition {
  id: string;
  organizationId: string;
  consumerId: string;
  triggerType: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ConditionDefinition {
  id: string;
  organizationId: string;
  consumerId: string;
  field: string;
  operator: string;
  value: unknown;
  group: string;
}

export interface ActionDefinition {
  id: string;
  organizationId: string;
  consumerId: string;
  actionType: string;
  order: number;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ConsumerDefinition {
  id: string;
  organizationId: string;
  status: string;
  enabled: boolean;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  metadata: Record<string, unknown>;
}

export interface AutomationBundle {
  consumer: ConsumerDefinition;
  trigger: TriggerDefinition;
  conditions: ConditionDefinition[];
  actions: ActionDefinition[];
}

export type AutomationExecutionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface ActionResult {
  success: boolean;
  executionTime: number;
  metadata: Record<string, unknown>;
  errors: string[];
}

export interface AutomationExecutionRecord {
  id: string;
  organizationId: string;
  consumerId: string;
  customerId: string | null;
  triggerType: string;
  triggerEventId: string | null;
  executionKey: string;
  status: AutomationExecutionStatus;
  contextPayload: Record<string, unknown>;
}

export interface AutomationLogPayload {
  executionId: string;
  consumerId: string;
  organizationId: string;
  customerId: string | null;
  trigger: string;
  conditionsEvaluated: Array<{
    field: string;
    operator: string;
    value: unknown;
    matched: boolean;
  }>;
  actionsExecuted: Array<{
    actionType: string;
    success: boolean;
    executionTime: number;
    errors: string[];
    metadata: Record<string, unknown>;
  }>;
  executionTime: number;
  status: AutomationExecutionStatus;
}

export interface AutomationExecutionResult {
  executionId: string | null;
  status: AutomationExecutionStatus;
  reason?: string;
}
