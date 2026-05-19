import { beforeEach, describe, expect, it } from "vitest";
import { DisplayInstanceManager } from "./DisplayInstanceManager";
import { createFakeDeps } from "./DisplayInstanceManager.testUtils";
import {
    readNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../node-overlay/nodeOverlayDisplayBoundsStore";

const makeEntity = (id: string) => ({
    id,
    blueprintId: "bp1",
    tags: [],
    state: {},
    display: { display_key: "k", label: "L" },
});
const publishingModule = {
    id: "PublishBounds",
    create: () => ({
        id: "PublishBounds",
        tick: (ctx: any) => {
            ctx.scratch.nodeOverlayDisplayBounds = {
                entityId: ctx.spec.entityId,
                centerX: 4,
                topY: 5,
                bottomY: 6,
            };
        },
        destroy() {},
    }),
};

describe("DisplayInstanceManager node overlay bounds", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());

    it("publishes bounds after ticking an instance", () => {
        const deps = createFakeDeps([makeEntity("e1")]);
        deps.displayRegistry = {
            resolve: () => ({
                display_key: "k",
                moduleStack: [publishingModule],
            }),
        } as any;
        new DisplayInstanceManager(deps).tick(0, 16);
        expect(readNodeOverlayDisplayBounds("e1")).toEqual({
            entityId: "e1",
            centerX: 4,
            topY: 5,
            bottomY: 6,
        });
    });

    it("removes bounds when an entity stops rendering or becomes stale", () => {
        const entities = [makeEntity("e1")];
        const deps = createFakeDeps(entities);
        deps.displayRegistry = {
            resolve: () => ({
                display_key: "k",
                moduleStack: [publishingModule],
            }),
        } as any;
        deps.shouldRenderEntity = (entity: any) => entity.id !== "e1";
        const manager = new DisplayInstanceManager(deps);
        manager.tick(0, 16);
        expect(readNodeOverlayDisplayBounds("e1")).toBeNull();

        deps.shouldRenderEntity = undefined;
        entities.push(makeEntity("e2"));
        manager.tick(16, 16);
        entities.length = 0;
        manager.tick(32, 16);
        expect(readNodeOverlayDisplayBounds("e2")).toBeNull();
    });

    it("clears the store on destroyAll", () => {
        const deps = createFakeDeps([makeEntity("e1")]);
        deps.displayRegistry = {
            resolve: () => ({
                display_key: "k",
                moduleStack: [publishingModule],
            }),
        } as any;
        const manager = new DisplayInstanceManager(deps);
        manager.tick(0, 16);
        manager.destroyAll();
        expect(readNodeOverlayDisplayBounds("e1")).toBeNull();
    });
});
