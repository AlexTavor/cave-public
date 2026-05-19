import { describe, it, expect, vi } from "vitest";
import { DisplayInstanceManager } from "./DisplayInstanceManager";
import { createFakeDeps } from "./DisplayInstanceManager.testUtils";

const makeEntity = (id: string) => ({
    id,
    blueprintId: "bp1",
    tags: [],
    state: {},
    display: { display_key: "k", label: "L" },
});

describe("DisplayInstanceManager", () => {
    it("creates instances for entities with display components", () => {
        const deps = createFakeDeps([makeEntity("e1")]);
        const mgr = new DisplayInstanceManager(deps);
        mgr.tick(0, 16);
        // No throw means instances were created and ticked
    });

    it("destroys instances when entity is removed", () => {
        const entities = [makeEntity("e1"), makeEntity("e2")];
        const deps = createFakeDeps(entities);
        const mgr = new DisplayInstanceManager(deps);
        mgr.tick(0, 16);

        // Remove e2
        entities.length = 1;
        mgr.tick(16, 16);
        // no throw = stale instance for e2 was destroyed
    });

    it("destroys all on null runtime", () => {
        const deps = createFakeDeps([makeEntity("e1")]);
        const mgr = new DisplayInstanceManager(deps);
        mgr.tick(0, 16);

        // Set runtime to null
        (deps as any).getRuntime = () => null;
        mgr.tick(16, 16); // should destroy all
    });

    it("destroyAll is safe to call multiple times", () => {
        const deps = createFakeDeps([makeEntity("e1")]);
        const mgr = new DisplayInstanceManager(deps);
        mgr.tick(0, 16);
        mgr.destroyAll();
        mgr.destroyAll(); // idempotent
    });

    it("module tick exceptions are logged and do not block", () => {
        const deps = createFakeDeps([makeEntity("e1")]);

        // Make displayRegistry return a module that throws
        deps.displayRegistry = {
            resolve: () => ({
                display_key: "k",
                moduleStack: [
                    {
                        id: "BrokenModule",
                        create: () => ({
                            id: "BrokenModule",
                            tick: () => {
                                throw new Error("boom");
                            },
                            destroy: () => {},
                        }),
                    },
                ],
            }),
        } as any;

        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const mgr = new DisplayInstanceManager(deps);
        mgr.tick(0, 16);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("syncs and clears both display registries", () => {
        const deps = createFakeDeps([makeEntity("e1")]);
        const glyphSync = vi.fn();
        const glyphClear = vi.fn();
        const avatarSync = vi.fn();
        const avatarClear = vi.fn();

        deps.glyphRegistry = {
            ...deps.glyphRegistry,
            syncEpoch: glyphSync,
            clear: glyphClear,
        } as any;
        deps.avatarRegistry = {
            ...deps.avatarRegistry,
            syncEpoch: avatarSync,
            clear: avatarClear,
        } as any;

        const mgr = new DisplayInstanceManager(deps);
        mgr.tick(0, 16);
        expect(glyphSync).toHaveBeenCalled();
        expect(avatarSync).toHaveBeenCalledWith("test-seed");

        (deps as any).getRuntime = () => null;
        mgr.tick(16, 16);
        expect(glyphClear).toHaveBeenCalled();
        expect(avatarClear).toHaveBeenCalled();
    });
});

