import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { Scanner } from "./Scanner";

describe("Scanner", () => {
    it("collects settings, state, and behavior levers", () => {
        const cartridge: ModuleCartridge = {
            metadata: { id: "scan.json", name: "Scan", version: "0.0.1" },
            blueprints: {
                depot: {
                    id: "depot",
                    label: "Depot",
                    tags: [],
                    components: {
                        state: {
                            wood: { value: 5, max: 10, visible: false },
                            heat: { value: 1, min: 0, visible: false },
                        },
                        behavior: {
                            rules: [
                                {
                                    id: "r1",
                                    sortKey: "sk_r1",
                                    conditions: [],
                                    actions: [
                                        {
                                            type: "MUTATE",
                                            target: "self.state.heat",
                                            op: "ADD",
                                            value: 2,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            },
            assets: {
                displays: {},
                icons: {},
                resources: {},
                styles: {},
                traits: {},
                settings: {
                    tuning: { rate: 1, nested: { factor: 2 } },
                } as any,
            },
        };

        const scanner = new Scanner();
        const levers = scanner.scan(cartridge);
        const paths = levers.map((lever) => lever.path);

        expect(paths).toContain("assets.settings.tuning.rate");
        expect(paths).toContain("blueprints.depot.components.state.wood.value");
        expect(paths).toContain(
            "blueprints.depot.components.behavior.rules.0.actions.0.value",
        );

        const behavior = levers.find((lever) => lever.type === "behavior");
        expect(behavior?.ruleId).toBe("r1");
        expect(behavior?.target).toBe("self.state.heat");
    });
});

