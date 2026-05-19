import { World } from "miniplex";
import type { RuntimeEntity } from "./types";
import { createDirtyWorld } from "./worldUtils";
import {
    recordDirtyMark,
    recordEntitySort,
} from "./debug/runtimeActivityStats";

export class RuntimeEntityStore {
    private readonly world: World<RuntimeEntity>;
    private readonly commandWorld: World<RuntimeEntity>;
    private readonly entityIndex = new Map<string, RuntimeEntity>();
    private cachedSortedEntities: RuntimeEntity[] = [];
    private isEntityListDirty = true;

    constructor() {
        this.world = new World<RuntimeEntity>();

        this.world.onEntityAdded.subscribe((entity) => {
            if (entity.id) this.entityIndex.set(entity.id, entity);
        });
        this.world.onEntityRemoved.subscribe((entity) => {
            if (entity.id) this.entityIndex.delete(entity.id);
        });

        this.commandWorld = createDirtyWorld(this.world, () =>
            this.markDirty(),
        );
    }

    public getWorld(): World<RuntimeEntity> {
        return this.world;
    }

    public getCommandWorld(): World<RuntimeEntity> {
        return this.commandWorld;
    }

    public addEntity(entity: RuntimeEntity): void {
        this.world.add(entity);
        this.markDirty();
    }

    public getEntity(id: string): RuntimeEntity | undefined {
        return this.entityIndex.get(id);
    }

    public getEntities(): ReadonlyArray<RuntimeEntity> {
        return this.getSortedEntities();
    }

    public getEntityCount(): number {
        return this.world.entities.length;
    }

    public clear(): void {
        this.world.clear();
        this.entityIndex.clear();
        this.markDirty();
    }

    public markDirty(): void {
        this.isEntityListDirty = true;
        recordDirtyMark();
    }

    private getSortedEntities(): ReadonlyArray<RuntimeEntity> {
        if (!this.isEntityListDirty) return this.cachedSortedEntities;

        const sorted = [...this.world.entities].sort((left, right) => {
            const leftId = left.id ?? "";
            const rightId = right.id ?? "";
            if (leftId === rightId) return 0;
            if (!leftId) return 1;
            if (!rightId) return -1;
            return leftId.localeCompare(rightId);
        });

        recordEntitySort();
        this.cachedSortedEntities = sorted;
        this.isEntityListDirty = false;
        return this.cachedSortedEntities;
    }
}

