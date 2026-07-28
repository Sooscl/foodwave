import type {
  ICustomerIntelligenceProjectionPatchBuilder,
} from '../contracts/projectionContracts';
import type { ICustomerIntelligenceRfmCalculator } from '../contracts/scoreCalculatorContracts';
import type {
  CustomerIntelligenceProjectionEvent,
  CustomerIntelligenceProjectionPatch,
} from '../types/customerIntelligenceTypes';
import type { ICustomerIntelligenceVisitSource } from './customerIntelligenceVisitSource';

const RFM_EVENT_TYPES = new Set<string>([
  'first_visit',
  'visit_registered',
  'visit_updated',
  'visit_archived',
  'customer_returned',
  'customer_inactive',
]);

export type CustomerIntelligenceProjectionPatchBuilderDependencies = {
  visitSource: ICustomerIntelligenceVisitSource;
  rfmCalculator: ICustomerIntelligenceRfmCalculator;
};

export class CustomerIntelligenceProjectionPatchBuilder
  implements ICustomerIntelligenceProjectionPatchBuilder
{
  constructor(private readonly deps: CustomerIntelligenceProjectionPatchBuilderDependencies) {}

  async buildPatch(event: CustomerIntelligenceProjectionEvent): Promise<CustomerIntelligenceProjectionPatch> {
    if (!RFM_EVENT_TYPES.has(event.type)) {
      return {
        organizationId: event.organizationId,
        customerId: event.customerId,
        sourceEventId: event.id,
        sourceEventAt: event.occurredAt,
        affectedMetricFamilies: [],
        patch: {},
      };
    }

    const visits = await this.deps.visitSource.listCustomerVisits({
      organizationId: event.organizationId,
      customerId: event.customerId,
    });

    const rfm = this.deps.rfmCalculator.calculate({
      visits,
      referenceAt: event.occurredAt,
    });

    const timestamp = new Date().toISOString();

    return {
      organizationId: event.organizationId,
      customerId: event.customerId,
      sourceEventId: event.id,
      sourceEventAt: event.occurredAt,
      affectedMetricFamilies: ['rfm'],
      patch: {
        projectionStatus: 'active',
        refreshedAt: timestamp,
        computedAt: timestamp,
        rfm,
      },
    };
  }
}
