import { describe, expect, it } from "vitest";
import { createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { serializeFlyweightEntity } from "./flyweightPersistence";

const makeRuntime = (blueprints: Record<string, unknown>) =>
    new Runtime(
        createCartridge("core", { blueprints: blueprints as any }),
        "seed",
        new CommandsManager(),
    );

describe("serializeFlyweightEntity", () => {
    it("persists only runtime-owned state fields for blueprint-backed entries", () => {
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
        runtime.addEntity({
            id: "inn-1",
            blueprintId: "inn",
            state: {
                coin: {
                    value: 7,
                    max: 20,
                    visible: false,
                    allowDeposit: true,
                    allowWithdraw: false,
                    priority: 1,
                },
            },
        } as any);

        expect(
            serializeFlyweightEntity(
                runtime,
                runtime.getEntity("inn-1") as any,
            ),
        ).toEqual({
            id: "inn-1",
            blueprintId: "inn",
            state: { coin: { value: 7, visible: false } },
        });
    });

    it("keeps full state entries that do not come from the blueprint", () => {
        const runtime = makeRuntime({
            inn: { id: "inn", label: "Inn", components: { state: {} } },
        });
        runtime.addEntity({
            id: "inn-1",
            blueprintId: "inn",
            state: { draft_flag: { value: true, visible: false, max: 2 } },
        } as any);

        expect(
            serializeFlyweightEntity(
                runtime,
                runtime.getEntity("inn-1") as any,
            ),
        ).toEqual({
            id: "inn-1",
            blueprintId: "inn",
            state: { draft_flag: { value: true, visible: false, max: 2 } },
        });
    });
});
