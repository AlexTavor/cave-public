import type { RuntimeEntity } from "../../engine/runtime/types";
import type { FactsComponent } from "../../data/schemas/components/facts";
import type { FactScope, FactType } from "../../data/schemas/conditions";

const ensureFacts = (
    world: RuntimeEntity,
    scope: FactScope,
): FactsComponent => {
    const existing = (world as Record<FactScope, FactsComponent | undefined>)[
        scope
    ];
    if (existing) return existing;
    const created: FactsComponent = {};
    (world as Record<FactScope, FactsComponent>)[scope] = created;
    return created;
};

const ensureFactType = (
    world: RuntimeEntity,
    scope: FactScope,
    factType: FactType,
): Record<string, number> => {
    const facts = ensureFacts(world, scope);
    facts[factType] ??= {};
    return facts[factType];
};

export const getFactValue = (
    world: RuntimeEntity,
    scope: FactScope,
    factType: FactType,
    factAbout: string,
): number => ensureFacts(world, scope)[factType]?.[factAbout] ?? 0;

export const adjustFact = (
    world: RuntimeEntity,
    scope: FactScope,
    factType: FactType,
    factAbout: string,
    delta: number,
): number => {
    const factValues = ensureFactType(world, scope, factType);
    const nextValue = Math.max(0, (factValues[factAbout] ?? 0) + delta);
    factValues[factAbout] = nextValue;
    return nextValue;
};
