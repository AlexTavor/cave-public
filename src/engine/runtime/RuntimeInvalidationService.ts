import {
    EMPTY_RUNTIME_INVALIDATION_SUMMARY,
    mergeRuntimeInvalidationSummaries,
    type RuntimeInvalidationSummary,
} from "./runtimeInvalidationSummary";
import {
    applyInvalidationSummary,
    createRuntimeInvalidationState,
    notifyInvalidationListeners,
} from "./runtimeInvalidationService.helpers";
import type {
    RuntimeInvalidationReader,
    RuntimeInvalidationScope,
} from "./runtimeInvalidationTypes";

export type {
    RuntimeInvalidationReader,
    RuntimeInvalidationScope,
} from "./runtimeInvalidationTypes";

export class RuntimeInvalidationService {
    private pending = EMPTY_RUNTIME_INVALIDATION_SUMMARY;
    private readonly state = createRuntimeInvalidationState();
    private readonly listeners = new Map<
        RuntimeInvalidationScope,
        Set<() => void>
    >();

    public readonly reader: RuntimeInvalidationReader = {
        subscribe: (scopes, listener) => this.subscribe(scopes, listener),
        getWorldRevision: () => this.state.worldRevision,
        getFrameRevision: () => this.state.frameRevision,
        getMutationRevision: () => this.state.mutationRevision,
        getEntityListRevision: () => this.state.entityListRevision,
        getBlueprintRevision: () => this.state.blueprintRevision,
        getEntityRevision: (id) => this.state.entityRevisionById[id] ?? 0,
        getLastChangedEntityIds: () => [...this.state.lastChangedEntityIds],
    };

    public bufferSummary(summary: RuntimeInvalidationSummary): void {
        this.pending = mergeRuntimeInvalidationSummaries(this.pending, summary);
    }

    public publishMutationSummary(summary: RuntimeInvalidationSummary): void {
        this.publish(new Set(), summary);
    }

    public publishFrame(frameRevision: number): void {
        const scopes = new Set<RuntimeInvalidationScope>();
        if (this.state.frameRevision !== frameRevision) {
            this.state.frameRevision = frameRevision;
            scopes.add("frame");
        }
        this.publish(scopes, this.pending);
        this.pending = EMPTY_RUNTIME_INVALIDATION_SUMMARY;
    }

    public publishWorldReset(frameRevision = 0): void {
        this.state.worldRevision += 1;
        this.state.frameRevision = frameRevision;
        this.state.entityRevisionById = {};
        this.state.lastChangedEntityIds = [];
        this.pending = EMPTY_RUNTIME_INVALIDATION_SUMMARY;
        notifyInvalidationListeners(this.listeners, new Set(["world"]));
    }

    private publish(
        scopes: Set<RuntimeInvalidationScope>,
        summary: RuntimeInvalidationSummary,
    ): void {
        applyInvalidationSummary(this.state, scopes, summary);
        notifyInvalidationListeners(this.listeners, scopes);
    }

    private subscribe(
        scopes: RuntimeInvalidationScope[],
        listener: () => void,
    ): () => void {
        const uniqueScopes = [...new Set(scopes)];
        uniqueScopes.forEach((scope) => {
            const listeners = this.listeners.get(scope) ?? new Set();
            listeners.add(listener);
            this.listeners.set(scope, listeners);
        });
        return () =>
            uniqueScopes.forEach((scope) =>
                this.listeners.get(scope)?.delete(listener),
            );
    }
}
