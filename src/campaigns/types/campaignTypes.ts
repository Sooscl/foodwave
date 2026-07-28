export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';

export type CampaignTriggerType =
  | 'customer_created'
  | 'first_visit'
  | 'visit_registered'
  | 'birthday'
  | 'customer_inactive'
  | 'customer_returned'
  | 'points_earned'
  | 'reward_available'
  | 'level_changed'
  | 'wallet_installed'
  | 'wallet_updated';

export type CampaignConditionField =
  | 'customer_level'
  | 'visit_count'
  | 'points'
  | 'lifetime_spend'
  | 'average_ticket'
  | 'days_since_last_visit'
  | 'birthday_month'
  | 'wallet_installed'
  | 'reward_available'
  | 'segment';

export type CampaignConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'exists';

export type CampaignActionType =
  | 'grant_points'
  | 'grant_reward'
  | 'generate_coupon'
  | 'update_wallet'
  | 'create_crm_task'
  | 'send_notification'
  | 'log_execution';

export type CampaignExecutionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export type CampaignQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type CampaignLogLevel = 'info' | 'warning' | 'error';

export interface CampaignRecord {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  enabled: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignTriggerRecord {
  id: string;
  organization_id: string;
  campaign_id: string;
  trigger_type: CampaignTriggerType;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignConditionRecord {
  id: string;
  organization_id: string;
  campaign_id: string;
  field: CampaignConditionField;
  operator: CampaignConditionOperator;
  value: unknown;
  logical_group: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignActionRecord {
  id: string;
  organization_id: string;
  campaign_id: string;
  action_type: CampaignActionType;
  execution_order: number;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignTemplateRecord {
  id: string;
  organization_id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignExecutionRecord {
  id: string;
  organization_id: string;
  campaign_id: string;
  customer_id: string | null;
  trigger_event_type: CampaignTriggerType;
  trigger_event_id: string | null;
  execution_key: string;
  status: CampaignExecutionStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  context_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignQueueRecord {
  id: string;
  organization_id: string;
  campaign_execution_id: string;
  campaign_action_id: string;
  status: CampaignQueueStatus;
  scheduled_for: string;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  processed_at: string | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignLogRecord {
  id: string;
  organization_id: string;
  campaign_execution_id: string | null;
  campaign_id: string | null;
  level: CampaignLogLevel;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignEvent {
  organization_id: string;
  event_type: CampaignTriggerType;
  event_id?: string | null;
  customer_id?: string | null;
  occurred_at?: string;
  payload?: Record<string, unknown>;
}

export interface CampaignConditionContext {
  customer_level: string | null;
  visit_count: number;
  points: number;
  lifetime_spend: number;
  average_ticket: number;
  days_since_last_visit: number | null;
  birthday_month: number | null;
  wallet_installed: boolean;
  reward_available: boolean;
  segment: string | null;
}

export interface CampaignExecutionResult {
  executionId: string | null;
  status: CampaignExecutionStatus;
  reason?: string;
}
