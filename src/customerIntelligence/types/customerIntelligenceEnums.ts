export type CustomerIntelligenceProjectionStatus =
  | 'pending'
  | 'processing'
  | 'active'
  | 'stale'
  | 'rebuilding'
  | 'failed';

export type CustomerIntelligenceInsightSeverity = 'low' | 'medium' | 'high' | 'critical';

export type CustomerIntelligenceInsightStatus = 'active' | 'resolved' | 'archived';

export type CustomerIntelligenceRefreshMode = 'incremental' | 'full_rebuild' | 'repair' | 'algorithm_upgrade' | 'nightly_maintenance';

export type CustomerIntelligenceRefreshJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export type CustomerIntelligenceRefreshCheckpointStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type CustomerIntelligenceSegmentCode =
  | 'vip'
  | 'loyal'
  | 'frequent'
  | 'new'
  | 'occasional'
  | 'at_risk'
  | 'lost';

export type CustomerIntelligenceChurnRiskBand = 'low' | 'medium' | 'high' | 'critical';

export type CustomerIntelligenceMetricFamily = 'rfm' | 'clv' | 'churn' | 'segmentation' | 'insights';
