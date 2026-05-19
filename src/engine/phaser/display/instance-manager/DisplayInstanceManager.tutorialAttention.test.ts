import { describe, expect, it } from "vitest";
import { DisplayInstanceManager } from "./DisplayInstanceManager";
import { createFakeDeps } from "./DisplayInstanceManager.testUtils";

const makeEntity = (id: string) => ({
    id,
    blueprintId: "bp1",
    tags: [],
    state: {},
    display: { display_key: "k", label: id },
});

describe("DisplayInstanceManager tutorial attention", () => {
    it("dims, blocks, and light-suppresses only non-focused entities", () => {
        const entities = [
            {
                id: "sys_world",
                tutorial: {
                    active: true,
                    attention: {
                        focusEntityIds: ["focused"],
                        blockNonFocusedInteraction: true,
                    },
                },
            },
            makeEntity("focused"),
            makeEntity("other"),
        ];
        const deps = createFakeDeps(entities as any);
        const seen: Record<string, any> = {};
        (deps as any).displayRegistry = {
            resolve: () => ({
                display_key: "k",
                moduleStack: [
                    {
                        create: () => ({
                            id: "probe",
                            tick: (ctx: any) =>
                                (seen[ctx.entity.id] = ctx.entity),
                            destroy() {},
                        }),
                    },
                ],
            }),
        };
        const manager = new DisplayInstanceManager(deps);

        manager.tick(0, 16);

        expect((deps as any).__createdRoots[0].alpha).toBe(1);
        expect((deps as any).__createdRoots[1].alpha).toBe(0.35);
        expect((deps as any).__createdRoots[0].interactiveEnabled).toBe(true);
        expect((deps as any).__createdRoots[1].interactiveEnabled).toBe(false);
        expect(seen.focused.__attentionLightSuppressed).toBeUndefined();
        expect(seen.other.__attentionLightSuppressed).toBe(true);
    });

    it("clears suppression and avoids mutating source runtime entities", () => {
        const entities = [
            { id: "sys_world", tutorial: { active: false, attention: {} } },
            makeEntity("focused"),
        ];
        const deps = createFakeDeps(entities as any);
        const seen: Record<string, any> = {};
        (deps as any).displayRegistry = {
            resolve: () => ({
                display_key: "k",
                moduleStack: [
                    {
                        create: () => ({
                            id: "probe",
                            tick: (ctx: any) =>
                                (seen[ctx.entity.id] = ctx.entity),
                            destroy() {},
                        }),
                    },
                ],
            }),
        };
        const manager = new DisplayInstanceManager(deps);

        manager.tick(0, 16);

        expect((deps as any).__createdRoots[0].alpha).toBe(1);
        expect((deps as any).__createdRoots[0].interactiveEnabled).toBe(true);
        expect(seen.focused.__attentionLightSuppressed).toBeUndefined();
        expect((entities[1] as any).__attentionLightSuppressed).toBeUndefined();
    });
});
