import { describe, expect, it } from "vitest";
import snapshot from "../../../../public/bootstrap/vfs-prod.json";
import { CompilerService } from "../CompilerService";
import { createCartridge, createImpulseConfig } from "../../test/factories";
import { CommandsManager } from "../../runtime/CommandsManager";
import { Runtime } from "../../runtime/Runtime";
import { Snapshot } from "../../runtime/Snapshot";
import { ImpulseEngine } from "../../physics/impulse/ImpulseEngine";
import { hydrateRuntime } from "../../runtime/persistence/hydrateRuntime";
import { resolveSmartSource } from "../../runtime/systems/behavior/targetSelector";

const files = structuredClone(snapshot as unknown as Record<string, unknown>);
const source = (path: string) => {
    const file = structuredClone(files[path]) as any;
    if (!file?.blueprints) return file;
    const blueprintId = file.metadata?.id ?? Object.keys(file.blueprints)[0];
    return file.blueprints[blueprintId];
};
const compile = (path: string) =>
    new CompilerService().compile(source(path) as never) as any;
const buildSnapshot = (entities: any[]) =>
    new Snapshot(entities, new ImpulseEngine(createImpulseConfig()));
const toEntity = (path: string) => {
    const blueprint = compile(path);
    return {
        id: blueprint.id,
        blueprintId: blueprint.id,
        tags: blueprint.tags,
        ...blueprint.components,
    };
};

describe("Hommlet blueprint hydration", () => {
    it("rehydrates stale Hommlet and buy coin chest state from current blueprints", () => {
        const runtime = new Runtime(
            createCartridge("core", {
                blueprints: {
                    lodging_hommlet: compile(
                        "example/modules/lodging_hommlet.bp",
                    ),
                    buycoinchest: compile("example/modules/buycoinchest.bp"),
                } as any,
            }),
            "seed",
            new CommandsManager(),
        );
        hydrateRuntime(runtime, {
            metadata: {
                version: "1",
                timestamp: 1,
                label: "save",
                seed: "seed",
            },
            state: {
                tick: 0,
                timeScale: 1,
                entities: [
                    {
                        id: "lodging_hommlet",
                        blueprintId: "lodging_hommlet",
                        state: {
                            food: { value: 10, priority: 0 },
                            heat: { value: 10, priority: 0 },
                        },
                    },
                    {
                        id: "buycoinchest",
                        blueprintId: "buycoinchest",
                        state: {
                            cycle: { value: 25, max: null },
                            coin: {
                                value: 92.6,
                                priority: 1,
                                allowWithdraw: false,
                            },
                        },
                    },
                ],
                physics: {},
                systems: {
                    automation: {
                        activeCount: 0,
                        nextEventMs: null,
                        nextCommand: null,
                    },
                },
            },
        } as any);
        const self = { id: "sys_world" } as any;
        const lodging = runtime.getEntity("lodging_hommlet") as any;
        const butcher = toEntity("example/modules/butcher.bp");
        const hearth = toEntity("example/modules/hearth.bp");
        butcher.state.food.value = 100;
        hearth.state.heat.value = 100;
        expect(lodging.state.food.priority).toBe(10);
        expect(lodging.state.heat.priority).toBe(10);
        expect((runtime.getEntity("buycoinchest") as any).state).toMatchObject({
            cycle: { value: 25, max: 200 },
            coin: { value: 92.6, allowWithdraw: false },
        });
        const snapshot = buildSnapshot([self, lodging, butcher, hearth]);
        expect(
            resolveSmartSource("tag:storage:food", "food", { self, snapshot }),
        ).toBe("lodging_hommlet");
        expect(
            resolveSmartSource("tag:storage:heat", "heat", { self, snapshot }),
        ).toBe("lodging_hommlet");
    });
});
