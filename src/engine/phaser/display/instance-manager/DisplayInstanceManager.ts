import type { RuntimeEntity } from "../../../runtime/types";
import type { DisplayInstanceManagerStats } from "../../debug/phaserDebugStats";
import type { DisplaySpec, DisplayStructureSyncState } from "../types";
import type { DisplayInstanceManagerDeps } from "./DisplayInstanceManager.types";
import { EntityVisualInstance } from "../visual-instance/EntityVisualInstance";
import { resetNodeOverlayDisplayBounds } from "../node-overlay/nodeOverlayDisplayBoundsStore";
import { tickDisplayManagerEntities } from "./DisplayInstanceManager.entities";
import { syncDisplayStructure } from "./DisplayInstanceManager.structural";
import {
    clearDisplayRegistries,
    destroyManagedInstance,
    syncDisplayEpochs,
} from "./DisplayInstanceManager.lifecycle";
import { buildDisplayInstanceManagerStats } from "./DisplayInstanceManager.stats";

type InstanceRecord = { spec: DisplaySpec; entity: RuntimeEntity };

export class DisplayInstanceManager {
    private readonly instances = new Map<string, EntityVisualInstance>();
    private readonly last = new Map<string, InstanceRecord>();
    private readonly structuralRecords = new Map<string, any>();
    private readonly syncState: DisplayStructureSyncState = {
        runtime: null,
        worldRevision: -1,
        entityListRevision: -1,
        blueprintRevision: -1,
        mutationRevision: -1,
    };
    constructor(private readonly deps: DisplayInstanceManagerDeps) {}

    public tick(timeMs: number, deltaMs: number): void {
        const runtime = this.deps.getRuntime();
        if (!runtime) {
            clearDisplayRegistries(this.deps);
            this.destroyAll();
            this.deps.pools.destroyAll();
            return;
        }
        syncDisplayEpochs(this.deps, runtime);
        syncDisplayStructure({
            runtime,
            records: this.structuralRecords,
            destroyInstance: (entityId) => this.destroyInstance(entityId),
            syncState: this.syncState,
        });
        tickDisplayManagerEntities({
            deps: this.deps,
            structuralRecords: this.structuralRecords,
            instances: this.instances,
            last: this.last,
            ensureInstance: (spec, entity) => this.ensureInstance(spec, entity),
            destroyInstance: (entityId) => this.destroyInstance(entityId),
            timeMs,
            deltaMs,
        });
    }

    public destroyAll(): void {
        for (const id of this.instances.keys()) {
            destroyManagedInstance(id, this.instances, this.last);
        }
        this.instances.clear();
        this.last.clear();
        this.structuralRecords.clear();
        this.syncState.runtime = null;
        this.syncState.worldRevision = -1;
        this.syncState.entityListRevision = -1;
        this.syncState.blueprintRevision = -1;
        this.syncState.mutationRevision = -1;
        resetNodeOverlayDisplayBounds();
    }

    public getStats(): DisplayInstanceManagerStats {
        return buildDisplayInstanceManagerStats(
            this.instances.size,
            this.last.values(),
            this.deps,
        );
    }

    private ensureInstance(spec: DisplaySpec, entity: RuntimeEntity): void {
        if (this.instances.has(spec.entityId)) return;
        const { scene, layers, pools, textureManager, pulseEngine } = this.deps;
        const instance = new EntityVisualInstance(
            scene,
            layers,
            pools,
            textureManager,
            pulseEngine,
            this.deps.runtimeVisualEffects as any,
            spec,
            entity,
            this.deps.displayRegistry,
            this.deps.getSelectedEntityId(),
            this.deps.selectEntity,
        );
        this.instances.set(spec.entityId, instance);
    }

    private destroyInstance(entityId: string): void {
        destroyManagedInstance(entityId, this.instances, this.last);
    }
}

