import { compileConditionText } from "../../../lib/logic/compileConditionText";
import { StructuredConditionSchema } from "../../../data/schemas/conditions";

type WithConditions = { conditions?: unknown[] };

const isLegacyCondition = (line: unknown): line is string =>
    typeof line === "string";

const isValidCondition = (line: string): boolean => {
    if (!line?.trim()) return false;
    return compileConditionText(line).ok;
};

const sanitizeLegacyConditions = (conditions: string[]) => {
    const valid = conditions.filter(isValidCondition);
    return { valid, removed: conditions.length - valid.length };
};

const sanitizeStructuredConditions = (conditions: unknown[]) => {
    let removed = 0;
    const valid = conditions.flatMap((condition) => {
        const parsed = StructuredConditionSchema.safeParse(condition);
        if (!parsed.success) {
            removed += 1;
            return [];
        }
        return [parsed.data];
    });
    return { valid, removed };
};

const stripInvalidConditions = <T extends WithConditions>(
    entry: T,
): { entry: T; removed: number } => {
    const conditions = entry.conditions;
    if (!Array.isArray(conditions) || conditions.length === 0) {
        return { entry, removed: 0 };
    }
    const { valid, removed } = conditions.every(isLegacyCondition)
        ? sanitizeLegacyConditions(conditions)
        : sanitizeStructuredConditions(conditions);
    if (removed === 0) return { entry, removed: 0 };
    return { entry: { ...entry, conditions: valid } as T, removed };
};

export const sanitizeConditionsInList = <T extends WithConditions>(
    list: T[] | undefined,
): { list: T[] | undefined; removed: number } => {
    if (!Array.isArray(list) || list.length === 0) {
        return { list, removed: 0 };
    }
    let totalRemoved = 0;
    const sanitized = list.map((entry) => {
        const result = stripInvalidConditions(entry);
        totalRemoved += result.removed;
        return result.entry;
    });
    if (totalRemoved === 0) return { list, removed: 0 };
    return { list: sanitized, removed: totalRemoved };
};

export const sanitizeConditionsInCycle = <T extends WithConditions>(
    cycle: T | undefined,
): { cycle: T | undefined; removed: number } => {
    if (!cycle) return { cycle, removed: 0 };
    const result = stripInvalidConditions(cycle);
    if (result.removed === 0) return { cycle, removed: 0 };
    return { cycle: result.entry, removed: result.removed };
};

