import type {
  CampaignConditionContext,
  CampaignConditionOperator,
  CampaignConditionRecord,
} from '../types';

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

const compareValues = (left: unknown, operator: CampaignConditionOperator, right: unknown): boolean => {
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
    const haystack = Array.isArray(right) ? right : [right];
    const contains = haystack.includes(left);
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

const evaluateCondition = (condition: CampaignConditionRecord, context: CampaignConditionContext): boolean => {
  const fieldValue = context[condition.field];
  return compareValues(fieldValue, condition.operator, condition.value);
};

export const evaluateConditionGroups = (
  conditions: CampaignConditionRecord[],
  context: CampaignConditionContext,
): boolean => {
  if (conditions.length === 0) {
    return true;
  }

  const grouped = new Map<string, CampaignConditionRecord[]>();

  for (const condition of conditions) {
    const key = condition.logical_group.trim() || 'default';
    const current = grouped.get(key) ?? [];
    current.push(condition);
    grouped.set(key, current);
  }

  for (const groupConditions of grouped.values()) {
    const everyConditionPasses = groupConditions.every((condition) => evaluateCondition(condition, context));
    if (everyConditionPasses) {
      return true;
    }
  }

  return false;
};
