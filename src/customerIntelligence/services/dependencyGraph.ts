import type { ICustomerIntelligenceProjectionEventClassifier, ICustomerIntelligenceProjectionEventPublisher, ICustomerIntelligenceProjectionPatchBuilder } from '../contracts/projectionContracts';
import type { ICustomerIntelligenceRfmCalculator } from '../contracts/scoreCalculatorContracts';
import type { ICustomerSegmentationResolver } from '../contracts/segmentationContracts';
import type { ICustomerIntelligenceRefreshCoordinator } from '../contracts/refreshContracts';
import type { ICustomerIntelligenceAlgorithmVersionRepository } from '../repositories/algorithmVersionRepository';
import type { ICustomerInsightRepository } from '../repositories/customerInsightRepository';
import type { ICustomerIntelligenceSnapshotRepository } from '../repositories/customerIntelligenceSnapshotRepository';
import type { IProjectionRefreshJobRepository } from '../repositories/projectionRefreshJobRepository';
import { RfmCalculator } from '../calculators/rfmCalculator';
import { CustomerIntelligenceProjectionEventClassifier } from './customerIntelligenceProjectionEventClassifier';
import { CustomerIntelligenceProjectionPatchBuilder } from './customerIntelligenceProjectionPatchBuilder';
import { CustomerIntelligenceSegmentationPatchBuilder } from './customerIntelligenceSegmentationPatchBuilder';
import { SegmentResolver } from '../segmentation/segmentResolver';
import { CrmCustomerIntelligenceVisitSource, type ICustomerIntelligenceVisitSource } from './customerIntelligenceVisitSource';
import { CustomerIntelligenceProjectionService } from './customerIntelligenceProjectionService';
import { CustomerIntelligenceReadService } from './customerIntelligenceReadService';
import { CustomerIntelligenceRefreshCoordinator } from './customerIntelligenceRefreshCoordinator';
import { CustomerIntelligenceRebuildService } from './customerIntelligenceRebuildService';
import { CustomerIntelligenceRefreshService } from './customerIntelligenceRefreshService';

export type CustomerIntelligenceServiceDependencies = {
  snapshotRepository: ICustomerIntelligenceSnapshotRepository;
  insightRepository: ICustomerInsightRepository;
  eventClassifier?: ICustomerIntelligenceProjectionEventClassifier;
  patchBuilder?: ICustomerIntelligenceProjectionPatchBuilder;
  eventPublisher: ICustomerIntelligenceProjectionEventPublisher;
  algorithmVersionRepository: ICustomerIntelligenceAlgorithmVersionRepository;
  refreshJobRepository: IProjectionRefreshJobRepository;
  visitSource?: ICustomerIntelligenceVisitSource;
  rfmCalculator?: ICustomerIntelligenceRfmCalculator;
  segmentationResolver?: ICustomerSegmentationResolver;
  refreshCoordinator?: ICustomerIntelligenceRefreshCoordinator;
};

export const createCustomerIntelligenceServices = (deps: CustomerIntelligenceServiceDependencies) => {
  const visitSource = deps.visitSource ?? new CrmCustomerIntelligenceVisitSource();
  const rfmCalculator = deps.rfmCalculator ?? new RfmCalculator();
  const eventClassifier = deps.eventClassifier ?? new CustomerIntelligenceProjectionEventClassifier();
  const segmentationResolver = deps.segmentationResolver ?? new SegmentResolver();
  const patchBuilder =
    deps.patchBuilder ??
    new CustomerIntelligenceProjectionPatchBuilder({
      visitSource,
      rfmCalculator,
    });
  const segmentationPatchBuilder = new CustomerIntelligenceSegmentationPatchBuilder({
    snapshotRepository: deps.snapshotRepository,
    segmentationResolver,
  });

  const refreshCoordinator =
    deps.refreshCoordinator ??
    new CustomerIntelligenceRefreshCoordinator({
      algorithmVersionRepository: deps.algorithmVersionRepository,
      refreshJobRepository: deps.refreshJobRepository,
    });

  const readService = new CustomerIntelligenceReadService({
    snapshotRepository: deps.snapshotRepository,
    insightRepository: deps.insightRepository,
  });

  const projectionService = new CustomerIntelligenceProjectionService({
    snapshotRepository: deps.snapshotRepository,
    eventClassifier,
    patchBuilder,
    segmentationPatchBuilder,
    eventPublisher: deps.eventPublisher,
    algorithmVersionRepository: deps.algorithmVersionRepository,
  });

  const refreshService = new CustomerIntelligenceRefreshService({
    refreshCoordinator,
  });

  const rebuildService = new CustomerIntelligenceRebuildService({
    refreshCoordinator,
  });

  return {
    readService,
    projectionService,
    refreshService,
    rebuildService,
  };
};
