export class NoActiveCustomerIntelligenceAlgorithmVersionError extends Error {
  constructor() {
    super('No active Customer Intelligence algorithm version found.');
    this.name = 'NoActiveCustomerIntelligenceAlgorithmVersionError';
  }
}
