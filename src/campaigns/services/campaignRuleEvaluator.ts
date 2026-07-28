import type {
  IRuleEvaluator,
  RuleEvaluationDetail,
  RuleEvaluationResult,
} from '../../automation/contracts/automationContracts';
import type { ConditionDefinition } from '../../automation/types/automationTypes';
import type { CampaignConditionContext } from '../types';
import { evaluateConditionGroups } from '../utils/conditionEvaluator';

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const compareValue = (left: unknown, operator: string, right: unknown): boolean => {
  if (operator === 'exists') {
    return left !== null && left !== undefined;
  }

  if (operator === 'contains') {
    if (Array.isArray(left)) {
      return left.includes(right);
    }

    if (typeof left === 'string' && typeof right === 'string') {
      return left.toLowerCase().includes(right.toLowerCase());
    }

    return false;
  }

  if (operator === 'in' || operator === 'nin') {
    const rightValues = Array.isArray(right) ? right : [right];
    const contains = rightValues.includes(left);
    return operator === 'in' ? contains : !contains;
  }

  const leftNumber = asNumber(left);
  const rightNumber = asNumber(right);

  if (leftNumber !== null && rightNumber !== null) {
    if (operator === 'gt') return leftNumber > rightNumber;
    if (operator === 'gte') return leftNumber >= rightNumber;
    if (operator === 'lt') return leftNumber < rightNumber;
    if (operator === 'lte') return leftNumber <= rightNumber;
  }

  if (operator === 'eq') {
    return left === right;
  }

  if (operator === 'neq') {
    return left !== right;
  }

  return false;
};

const contextValue = (context: CampaignConditionContext, field: string): unknown => {
  return (context as unknown as { [key: string]: unknown })[field];
};

const mapConditionDefinitionToCampaignCondition = (condition: ConditionDefinition) => {
  return {
    id: condition.id,
    organization_id: condition.organizationId,
    campaign_id: condition.consumerId,
    field: condition.field as keyof CampaignConditionContext,
    operator: condition.operator as
      | 'eq'
      | 'neq'
      | 'gt'
      | 'gte'
      | 'lt'
      | 'lte'
      | 'in'
      | 'nin'
      | 'contains'
      | 'exists',
    value: condition.value,
    logical_group: condition.group,
    created_at: '',
    updated_at: '',
  };
};

export class CampaignRuleEvaluator implements IRuleEvaluator<CampaignConditionContext> {
  evaluate(conditions: ConditionDefinition[], context: CampaignConditionContext): RuleEvaluationResult {
    const details: RuleEvaluationDetail[] = conditions.map((condition) => ({
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      matched: compareValue(contextValue(context, condition.field), condition.operator, condition.value),
    }));

    const typedConditions = conditions.map((condition) => mapConditionDefinitionToCampaignCondition(condition));
    const passed = evaluateConditionGroups(typedConditions, context);

    return {
      passed,
      details,
    };
  }
}
