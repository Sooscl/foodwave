import type { CustomerIntelligenceSnapshot, CustomerSegmentationProjection } from '../types/customerIntelligenceTypes';

export interface CustomerSegmentationContext {
  snapshot: Pick<CustomerIntelligenceSnapshot, 'rfm' | 'segmentation'>;
}

export interface ICustomerSegmentationResolver {
  resolve(context: CustomerSegmentationContext): CustomerSegmentationProjection;
}
