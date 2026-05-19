import type { RuntimeEntity } from "./types";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { PhysicsBody } from "../physics/impulse/types";
import type { Blueprint } from "../../data/schemas/blueprint";

export type QueryCriteria = {
    tag: string;
};

export class Snapshot {
    private entities: ReadonlyArray<Readonly<RuntimeEntity>> = [];
    private readonly entityIndex = new Map<string, Readonly<RuntimeEntity>>();
    private readonly physicsIndex = new Map<string, Readonly<PhysicsBody>>();
    private readonly queryCache = new Map<
        string,
        ReadonlyArray<Readonly<RuntimeEntity>>
    >();
    private blueprints: Record<string, Blueprint> = {};

    constructor(
        entities: ReadonlyArray<RuntimeEntity>,
        physics: ImpulseEngine,
        blueprints: Record<string, Blueprint> = {},
    ) {
        this.reset(entities, physics, blueprints);
    }

    public reset(
        entities: ReadonlyArray<RuntimeEntity>,
        physics: ImpulseEngine,
        blueprints: Record<string, Blueprint> = {},
    ): this {
        this.entities = entities as ReadonlyArray<Readonly<RuntimeEntity>>;
        this.blueprints = blueprints;
        this.entityIndex.clear();
        this.physicsIndex.clear();
        this.queryCache.clear();

        for (const entity of entities) {
            if (entity.id) {
                this.entityIndex.set(
                    entity.id,
                    entity as Readonly<RuntimeEntity>,
                );
            }
        }

        for (const entity of entities) {
            if (!entity.id) continue;
            const body = physics.getBody(entity.id);
            if (!body) continue;
            this.physicsIndex.set(entity.id, body);
        }

        return this;
    }

    public query(
        criteria: QueryCriteria,
    ): ReadonlyArray<Readonly<RuntimeEntity>> {
        const key = `tag:${criteria.tag}`;
        const cached = this.queryCache.get(key);
        if (cached) return cached;

        const results = this.entities.filter((entity) => {
            const tags = (entity as { tags?: string[] }).tags;
            return Array.isArray(tags) && tags.includes(criteria.tag);
        });

        this.queryCache.set(key, results);
        return results;
    }

    public getEntities(): ReadonlyArray<Readonly<RuntimeEntity>> {
        return this.entities;
    }

    public getEntity(id: string): Readonly<RuntimeEntity> | undefined {
        return this.entityIndex.get(id);
    }

    public getGlobal(key: string): number {
        const worldEntity = this.entityIndex.get("sys_world");
        if (!worldEntity) return 0;
        const state = (worldEntity as { state?: Record<string, unknown> })
            .state;
        if (!state || typeof state !== "object") return 0;
        const entry = state[key] as { value?: number } | undefined;
        return typeof entry?.value === "number" ? entry.value : 0;
    }

    public getPhysicsBody(id: string): Readonly<PhysicsBody> | undefined {
        return this.physicsIndex.get(id);
    }

    public getBlueprint(id: string): Blueprint | undefined {
        return this.blueprints[id];
    }
}

