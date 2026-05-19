import type { RuntimeInvalidationSummary } from "./runtimeInvalidationSummary";
import type {
    RuntimeInvalidationScope,
    RuntimeInvalidationState,
} from "./runtimeInvalidationTypes";

export const createRuntimeInvalidationState = (): RuntimeInvalidationState => ({
    worldRevision: 0,
    frameRevision: 0,
    mutationRevision: 0,
    entityListRevision: 0,
    blueprintRevision: 0,
    entityRevisionById: {},
    lastChangedEntityIds: [],
});

export const summaryIsEmpty = (summary: RuntimeInvalidationSummary) =>
    summary.changedEntityIds.length === 0 &&
    !summary.entityListChanged &&
    !summary.blueprintChanged;

export const applyInvalidationSummary = (
    state: RuntimeInvalidationState,
    scopes: Set<RuntimeInvalidationScope>,
    summary: RuntimeInvalidationSummary,
): void => {
    if (summaryIsEmpty(summary)) return;
    state.mutationRevision += 1;
    state.lastChangedEntityIds = summary.changedEntityIds;
    scopes.add("mutation");
    summary.changedEntityIds.forEach((id) => {
        state.entityRevisionById[id] = (state.entityRevisionById[id] ?? 0) + 1;
        scopes.add(`entity:${id}`);
    });
    if (summary.entityListChanged) {
        state.entityListRevision += 1;
        scopes.add("entity-list");
    }
    if (summary.blueprintChanged) {
        state.blueprintRevision += 1;
        scopes.add("blueprint");
    }
};

export const notifyInvalidationListeners = (
    listenersByScope: Map<RuntimeInvalidationScope, Set<() => void>>,
    scopes: Set<RuntimeInvalidationScope>,
): void => {
    if (scopes.size === 0) return;
    const listeners = new Set<() => void>();
    scopes.forEach((scope) =>
        listenersByScope
            .get(scope)
            ?.forEach((listener) => listeners.add(listener)),
    );
    listeners.forEach((listener) => listener());
};
