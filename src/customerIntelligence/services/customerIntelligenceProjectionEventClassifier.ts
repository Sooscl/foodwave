import type { ICustomerIntelligenceProjectionEventClassifier } from '../contracts/projectionContracts';
import type { CustomerIntelligenceProjectionEvent, CustomerIntelligenceProjectionPatch } from '../types/customerIntelligenceTypes';

const RFM_EVENT_TYPES = new Set<string>([
  'first_visit',
  'visit_registered',
  'visit_updated',
  'visit_archived',
  'customer_returned',
  'customer_inactive',
]);

const SEGMENTATION_EVENT_TYPES = new Set<string>([
  'visit_registered',
  'visit_updated',
  'visit_archived',
  'customer_returned',
  'customer_inactive',
]);

export class CustomerIntelligenceProjectionEventClassifier
  implements ICustomerIntelligenceProjectionEventClassifier
{
  classify(event: CustomerIntelligenceProjectionEvent): CustomerIntelligenceProjectionPatch['affectedMetricFamilies'] {
    const metrics: CustomerIntelligenceProjectionPatch['affectedMetricFamilies'] = [];

    if (RFM_EVENT_TYPES.has(event.type)) {
      metrics.push('rfm');
    }

    if (SEGMENTATION_EVENT_TYPES.has(event.type)) {
      metrics.push('segmentation');
    }

    return metrics;
  }
}
