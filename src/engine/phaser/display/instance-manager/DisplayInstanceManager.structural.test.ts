import { describe, expect, it, vi } from "vitest";
import { syncDisplayStructure } from "./DisplayInstanceManager.structural";

const makeEntity = (label = "L") => ({
    id: "e1",
    blueprintId: "bp1",
    tags: [],
    state: {},
    display: { display_key: "k", label },
});

const makeRuntime = (entities: any[], revisions?: Partial<any>) => ({
    getEntities: vi.fn(() => entities),
    getEntity: (id: string) =>
        entities.find((entity) => entity.id === id) ?? null,
    getCartridge: () => ({
        blueprints: {
            bp1: { components: { display: { display_key: "k", label: "L" } } },
        },
        assets: {
            displays: { k: { type: "body" }, unknown: { type: "body" } },
            styles: {},
        },
    }),
    getPhysicsBody: () => ({ x: 1, y: 2, radius: 3 }),
    getState: () => ({ tick: 0, seed: "seed", status: "running" }),
    ...(revisions
        ? {
              getInvalidation: () => ({
                  getWorldRevision: () => revisions.world ?? 0,
                  getEntityListRevision: () => revisions.list ?? 0,
                  getBlueprintRevision: () => revisions.blueprint ?? 0,
                  getMutationRevision: () => revisions.mutation ?? 0,
                  getLastChangedEntityIds: () => revisions.changed ?? [],
              }),
          }
        : {}),
});

const makeSyncState = () => ({
    runtime: null,
    worldRevision: -1,
    entityListRevision: -1,
    blueprintRevision: -1,
    mutationRevision: -1,
});

describe("DisplayInstanceManager structural sync", () => {
    it("falls back to a full rebuild when invalidation is unavailable", () => {
        const runtime = makeRuntime([makeEntity()]);
        const records = new Map();
        syncDisplayStructure({
            runtime: runtime as any,
            records,
            destroyInstance: vi.fn(),
            syncState: makeSyncState(),
        });
        syncDisplayStructure({
            runtime: runtime as any,
            records,
            destroyInstance: vi.fn(),
            syncState: makeSyncState(),
        });
        expect(runtime.getEntities).toHaveBeenCalledTimes(2);
        expect(records.has("e1")).toBe(true);
    });

    it("skips runtime.getEntities on a steady-state structural sync", () => {
        const entity = makeEntity();
        const runtime = makeRuntime([entity], {});
        const records = new Map();
        const syncState = makeSyncState();
        syncDisplayStructure({
            runtime: runtime as any,
            records,
            destroyInstance: vi.fn(),
            syncState,
        });
        runtime.getEntities.mockClear();
        syncDisplayStructure({
            runtime: runtime as any,
            records,
            destroyInstance: vi.fn(),
            syncState,
        });
        expect(runtime.getEntities).not.toHaveBeenCalled();
    });

    it("updates only changed ids on mutation-only sync", () => {
        const entity = makeEntity();
        const revisions = {
            world: 0,
            list: 0,
            blueprint: 0,
            mutation: 0,
            changed: [] as string[],
        };
        const runtime = makeRuntime([entity], revisions);
        const records = new Map();
        const syncState = makeSyncState();
        syncDisplayStructure({
            runtime: runtime as any,
            records,
            destroyInstance: vi.fn(),
            syncState,
        });
        entity.display.label = "Next";
        revisions.mutation = 1;
        revisions.changed = ["e1"];
        runtime.getEntities.mockClear();
        syncDisplayStructure({
            runtime: runtime as any,
            records,
            destroyInstance: vi.fn(),
            syncState,
        });
        expect(runtime.getEntities).not.toHaveBeenCalled();
        expect(records.get("e1")?.entity.display.label).toBe("Next");
    });
});
