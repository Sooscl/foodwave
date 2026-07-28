import type { CustomerRfmProjection, ISODateString } from '../types/customerIntelligenceTypes';

export interface CustomerIntelligenceVisitFact {
  visitAt: ISODateString;
  amountSpent: number;
}

export interface RfmCalculationInput {
  visits: CustomerIntelligenceVisitFact[];
  referenceAt?: ISODateString;
}

export interface ICustomerIntelligenceRfmCalculator {
  calculate(input: RfmCalculationInput): CustomerRfmProjection;
}
