import type {
  ActionDefinition,
  ActionResult,
  AutomationBundle,
  AutomationExecutionRecord,
  AutomationExecutionStatus,
  ConditionDefinition,
  DomainEvent,
  TriggerDefinition,
} from '../types/automationTypes';

export interface RuleEvaluationDetail {
  field: string;
  operator: string;
  value: unknown;
  matched: boolean;
}

export interface RuleEvaluationResult {
  passed: boolean;
  details: RuleEvaluationDetail[];
}

export interface TriggerExecutionContext<TEvent extends DomainEvent = DomainEvent> {
  event: TEvent;
  trigger: TriggerDefinition;
  consumerId: string;
}

export interface ActionExecutionContext<TContext extends object = object, TEvent extends DomainEvent = DomainEvent> {
  event: TEvent;
  action: ActionDefinition;
  consumerId: string;
  executionId: string;
  context: TContext;
}

export interface ITriggerPlugin {
  type: string;
  execute(context: TriggerExecutionContext): Promise<boolean>;
}

export interface IActionPlugin<TContext extends object = object, TEvent extends DomainEvent = DomainEvent> {
  type: string;
  execute(context: ActionExecutionContext<TContext, TEvent>): Promise<ActionResult>;
}

export interface IRuleEvaluator<TContext extends object = object> {
  evaluate(conditions: ConditionDefinition[], context: TContext): RuleEvaluationResult;
}

export interface IIntegrationAdapter<TContext extends object = object, TEvent extends DomainEvent = DomainEvent> {
  resolveContext(event: TEvent): Promise<{ data: TContext | null; error: string | null }>;
}

export interface IAutomationRepository {
  listBundlesForEvent(organizationId: string, eventType: string, occurredAt: string): Promise<AutomationBundle[]>;
  createExecution(input: {
    organizationId: string;
    consumerId: string;
    customerId: string | null;
    triggerType: string;
    triggerEventId: string | null;
    executionKey: string;
    contextPayload: Record<string, unknown>;
  }): Promise<{ data: AutomationExecutionRecord | null; duplicate: boolean; error: string | null }>;
  updateExecutionStatus(executionId: string, status: AutomationExecutionStatus, errorMessage: string | null): Promise<string | null>;
  createStructuredLog(input: {
    organizationId: string;
    executionId: string;
    consumerId: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    payload: Record<string, unknown>;
  }): Promise<string | null>;
}

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

export interface IEventBus {
  subscribe(eventType: string, handler: DomainEventHandler): () => void;
  publish<TPayload extends Record<string, unknown>>(event: DomainEvent<TPayload>): Promise<void>;
}
