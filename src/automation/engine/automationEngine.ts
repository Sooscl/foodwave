import type {
  IActionPlugin,
  IAutomationRepository,
  IIntegrationAdapter,
  IRuleEvaluator,
  ITriggerPlugin,
} from '../contracts/automationContracts';
import type {
  ActionResult,
  AutomationExecutionResult,
  AutomationLogPayload,
  DomainEvent,
} from '../types/automationTypes';
import { ActionRegistry, TriggerRegistry } from '../registries/pluginRegistries';
import { buildExecutionKey } from '../utils/executionKey';

type EngineDependencies<TContext extends object> = {
  repository: IAutomationRepository;
  integrationAdapter: IIntegrationAdapter<TContext>;
  ruleEvaluator: IRuleEvaluator<TContext>;
  actionRegistry: ActionRegistry;
  triggerRegistry: TriggerRegistry;
};

const nowMs = (): number => Date.now();

export class AutomationEngine<TContext extends object> {
  constructor(private readonly deps: EngineDependencies<TContext>) {}

  registerTrigger(plugin: ITriggerPlugin): void {
    this.deps.triggerRegistry.register(plugin);
  }

  registerAction(plugin: IActionPlugin<TContext>): void {
    this.deps.actionRegistry.register(plugin as IActionPlugin);
  }

  async handleEvent(event: DomainEvent): Promise<AutomationExecutionResult[]> {
    const startedAt = nowMs();
    const bundles = await this.deps.repository.listBundlesForEvent(event.organizationId, event.type, event.occurredAt);

    const results: AutomationExecutionResult[] = [];

    for (const bundle of bundles) {
      const triggerPlugin = this.deps.triggerRegistry.resolve(bundle.trigger.triggerType);
      if (!triggerPlugin) {
        results.push({
          executionId: null,
          status: 'skipped',
          reason: `No trigger plugin registered for ${bundle.trigger.triggerType}`,
        });
        continue;
      }

      const triggerMatched = await triggerPlugin.execute({
        event,
        trigger: bundle.trigger,
        consumerId: bundle.consumer.id,
      });

      if (!triggerMatched) {
        results.push({
          executionId: null,
          status: 'skipped',
          reason: 'Trigger plugin did not match event',
        });
        continue;
      }

      const contextResult = await this.deps.integrationAdapter.resolveContext(event);
      if (contextResult.error || !contextResult.data) {
        results.push({
          executionId: null,
          status: 'failed',
          reason: contextResult.error ?? 'Unable to resolve context',
        });
        continue;
      }

      const evaluationResult = this.deps.ruleEvaluator.evaluate(bundle.conditions, contextResult.data);
      if (!evaluationResult.passed) {
        results.push({
          executionId: null,
          status: 'skipped',
          reason: 'Conditions did not pass',
        });
        continue;
      }

      const executionKey = buildExecutionKey(bundle.consumer.id, event);
      const execution = await this.deps.repository.createExecution({
        organizationId: event.organizationId,
        consumerId: bundle.consumer.id,
        customerId: event.customerId,
        triggerType: event.type,
        triggerEventId: event.id,
        executionKey,
        contextPayload: {
          event,
          context: contextResult.data,
        },
      });

      if (execution.duplicate) {
        results.push({ executionId: execution.data?.id ?? null, status: 'skipped', reason: 'Duplicate execution prevented' });
        continue;
      }

      if (execution.error || !execution.data) {
        results.push({ executionId: null, status: 'failed', reason: execution.error ?? 'Unable to create execution' });
        continue;
      }

      await this.deps.repository.updateExecutionStatus(execution.data.id, 'processing', null);

      const actionResults: Array<{ actionType: string; result: ActionResult }> = [];
      let finalStatus: 'completed' | 'failed' = 'completed';

      for (const action of bundle.actions) {
        const actionPlugin = this.deps.actionRegistry.resolve(action.actionType);
        if (!actionPlugin) {
          actionResults.push({
            actionType: action.actionType,
            result: {
              success: false,
              executionTime: 0,
              metadata: {},
              errors: [`No action plugin registered for ${action.actionType}`],
            },
          });
          finalStatus = 'failed';
          continue;
        }

        const actionStart = nowMs();
        const actionResult = await actionPlugin.execute({
          event,
          action,
          consumerId: bundle.consumer.id,
          executionId: execution.data.id,
          context: contextResult.data,
        });
        const measured = nowMs() - actionStart;

        const normalized: ActionResult = {
          success: actionResult.success,
          executionTime: actionResult.executionTime > 0 ? actionResult.executionTime : measured,
          metadata: actionResult.metadata ?? {},
          errors: actionResult.errors ?? [],
        };

        if (!normalized.success) {
          finalStatus = 'failed';
        }

        actionResults.push({ actionType: action.actionType, result: normalized });
      }

      const executionTime = nowMs() - startedAt;
      await this.deps.repository.updateExecutionStatus(
        execution.data.id,
        finalStatus,
        finalStatus === 'failed' ? 'One or more actions failed' : null,
      );

      const structuredLog: AutomationLogPayload = {
        executionId: execution.data.id,
        consumerId: bundle.consumer.id,
        organizationId: event.organizationId,
        customerId: event.customerId,
        trigger: bundle.trigger.triggerType,
        conditionsEvaluated: evaluationResult.details,
        actionsExecuted: actionResults.map((entry) => ({
          actionType: entry.actionType,
          success: entry.result.success,
          executionTime: entry.result.executionTime,
          errors: entry.result.errors,
          metadata: entry.result.metadata,
        })),
        executionTime,
        status: finalStatus,
      };

      await this.deps.repository.createStructuredLog({
        organizationId: event.organizationId,
        executionId: execution.data.id,
        consumerId: bundle.consumer.id,
        level: finalStatus === 'completed' ? 'info' : 'error',
        message: `Automation execution ${finalStatus}`,
        payload: structuredLog as unknown as Record<string, unknown>,
      });

      results.push({ executionId: execution.data.id, status: finalStatus });
    }

    return results;
  }
}
