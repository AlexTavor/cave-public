import { describe, expect, it } from "vitest";
import { createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { serialize } from "./RuntimeSerializer";

describe("RuntimeSerializer flyweight", () => {
    it("strips definition components for blueprint-backed entities", () => {
        const runtime = new Runtime(
            createCartridge("core", {
                blueprints: {
                    gatherwood: {
                        id: "gatherwood",
                        label: "Gather Wood",
                        tags: ["job"],
                        components: {
                            behavior: { rules: [{ id: "new-rule" }] },
                            state: { cycle: { value: 0, max: 100 } },
                        },
                    } as any,
                },
            }),
            "seed",
            new CommandsManager(),
        );

        runtime.addEntity({
            id: "job-1",
            blueprintId: "gatherwood",
            behavior: { rules: [{ id: "old-rule" }] },
            display: { label: "Old Display", display_key: "unknown" },
            state: {
                cycle: { value: 7, max: 100 },
                vals_prod_wood_amt_0: { value: 1, visible: false },
            },
        } as any);

        const saved = serialize(runtime, "save");
        const entity = saved.state.entities.find(
            (entry) => entry.id === "job-1",
        ) as any;

        expect(entity.blueprintId).toBe("gatherwood");
        expect(entity.state?.cycle?.value).toBe(7);
        expect(entity.state?.vals_prod_wood_amt_0).toBeUndefined();
        expect(entity.behavior).toBeUndefined();
        expect(entity.display).toBeUndefined();
    });
});
