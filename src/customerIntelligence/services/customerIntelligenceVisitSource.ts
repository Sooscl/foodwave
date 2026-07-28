import { listCustomerVisits } from '../../crm/services/customerVisitsService';
import type { CustomerIntelligenceVisitFact } from '../contracts/scoreCalculatorContracts';

export interface ICustomerIntelligenceVisitSource {
  listCustomerVisits(input: {
    organizationId: string;
    customerId: string;
  }): Promise<CustomerIntelligenceVisitFact[]>;
}

export class CrmCustomerIntelligenceVisitSource implements ICustomerIntelligenceVisitSource {
  async listCustomerVisits(input: {
    organizationId: string;
    customerId: string;
  }): Promise<CustomerIntelligenceVisitFact[]> {
    const result = await listCustomerVisits(input.customerId);

    if (result.error || !result.data) {
      throw new Error(result.error ?? 'Unable to load customer visits for RFM calculation');
    }

    return result.data
      .filter((visit) => visit.organization_id === input.organizationId)
      .map((visit) => ({
        visitAt: visit.visit_at,
        amountSpent: Number(visit.amount_spent ?? 0),
      }));
  }
}
