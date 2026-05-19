import { describe, expect, it } from "vitest";
import { createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { hydrateRuntime } from "./hydrateRuntime";
import type { SaveGameData } from "./types";

const makeRuntime = (blueprints: Record<string, unknown>) =>
    new Runtime(
        createCartridge("core", { blueprints: blueprints as any }),
        "seed",
        new CommandsManager(),
    );

const makeData = (entity: Record<string, unknown>, tick = 0): SaveGameData => ({
    metadata: { version: "1", timestamp: 1, label: "save", seed: "seed" },
    state: {
        tick,
        timeScale: 1,
        entities: [entity as any],
        physics: {},
        systems: {
            automation: {
                activeCount: 0,
                nextEventMs: null,
                nextCommand: null,
            },
        },
    },
});

describe("hydrateRuntime flyweight", () => {
    it("rebuilds blueprint-backed entity from current blueprint and saved stateful data", () => {
        const runtime = makeRuntime({
            gatherwood: {
                id: "gatherwood",
                label: "Gather Wood v2",
                tags: ["job", "updated"],
                components: {
                    behavior: { rules: [{ id: "new-rule" }] },
                    state: {
                        cycle: { value: 0, max: 100 },
                        vals_prod_wood_amt_0: { value: 6000, visible: false },
                    },
                },
            },
        });
        hydrateRuntime(
            runtime,
            makeData(
                {
                    id: "job-1",
                    blueprintId: "gatherwood",
                    behavior: { rules: [{ id: "old-rule" }] },
                    state: {
                        cycle: { value: 33, max: 100 },
                        vals_prod_wood_amt_0: { value: 1, visible: false },
                    },
                    run: { blueprint_spawned: { gatherwood: 2 } },
                    permanent: { thought_seen: { intro: 1 } },
                    thought: {
                        _tag: "thought",
                        active: true,
                        thoughtId: "intro",
                        body: "Wake up.",
                        rememberScope: "run",
                        resumeStatus: "paused",
                    },
                },
                12,
            ),
        );
        const entity = runtime.getEntity("job-1") as any;
        expect(entity.label).toBe("Gather Wood v2");
        expect(entity.tags).toEqual(["job", "updated"]);
        expect(entity.state?.cycle?.value).toBe(33);
        expect(entity.state?.vals_prod_wood_amt_0?.value).toBe(6000);
        expect(entity.behavior).toBeUndefined();
        expect(entity.run?.blueprint_spawned?.gatherwood).toBe(2);
        expect(entity.permanent?.thought_seen?.intro).toBe(1);
        expect(entity.thought?.thoughtId).toBe("intro");
    });

    it("preserves blueprint-defined state entry metadata when saved state entry is partial", () => {
        const runtime = makeRuntime({
            inn: {
                id: "inn",
                label: "Inn",
                components: {
                    state: {
                        coin: {
                            value: 0,
                            max: 20,
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: false,
                            priority: 1,
                        },
                    },
                },
            },
        });
        hydrateRuntime(
            runtime,
            makeData({
                id: "inn-1",
                blueprintId: "inn",
                state: { coin: { value: 7, visible: false } },
            }),
        );
        expect(runtime.getEntity("inn-1")).toMatchObject({
            state: {
                coin: {
                    value: 7,
                    visible: false,
                    max: 20,
                    allowDeposit: true,
                    allowWithdraw: false,
                    priority: 1,
                },
            },
        });
    });

    it("ignores stale saved flyweight metadata when blueprint has newer state entry settings", () => {
        const runtime = makeRuntime({
            inn: {
                id: "inn",
                label: "Inn",
                components: {
                    state: {
                        coin: {
                            value: 0,
                            max: 50,
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 9,
                        },
                    },
                },
            },
        });
        hydrateRuntime(
            runtime,
            makeData({
                id: "inn-1",
                blueprintId: "inn",
                state: {
                    coin: {
                        value: 7,
                        visible: false,
                        max: 20,
                        allowDeposit: true,
                        allowWithdraw: false,
                        priority: 1,
                    },
                },
            }),
        );
        expect(runtime.getEntity("inn-1")).toMatchObject({
            state: {
                coin: {
                    value: 7,
                    visible: false,
                    max: 50,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 9,
                },
            },
        });
    });

    it("ignores saved null fields when blueprint provides a valid state field", () => {
        const runtime = makeRuntime({
            forge: {
                id: "forge",
                label: "Forge",
                components: {
                    state: { cycle: { value: 0, max: 50, visible: true } },
                },
            },
        });
        hydrateRuntime(
            runtime,
            makeData({
                id: "forge-1",
                blueprintId: "forge",
                state: { cycle: { value: 12, max: null } },
            }),
        );
        expect((runtime.getEntity("forge-1") as any).state.cycle).toMatchObject(
            { value: 12, max: 50 },
        );
    });
});

