import { describe, it, expect } from "vitest";
import { Scanner } from "../../../../engine/balancing/Scanner";
import { BehaviorRuleSchema } from "../../../../data/schemas/behavior";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";
import { patchCartridge } from "./cartridgePatcher";

const makeCartridge = () =>
    createCartridge("core.json", {
        blueprints: {
            worker: createBlueprint("worker", {
                components: {
                    state: { heat: { value: 2, visible: true } },
                    behavior: {
                        rules: [
                            BehaviorRuleSchema.parse({
                                id: "refill",
                                conditions: [],
                                actions: [
                                    {
                                        type: "MUTATE",
                                        target: "self.state.heat.value",
                                        op: "ADD",
                                        value: 3,
                                    },
                                ],
                            }),
                        ],
                    },
                },
            }),
        },
    });

describe("patchCartridge", () => {
    it("promotes behavior values into state keys", () => {
        const cartridge = makeCartridge();
        const scanner = new Scanner();
        const levers = scanner.scan(cartridge);
        const behaviorLever = levers.find((lever) => lever.type === "behavior");
        expect(behaviorLever).toBeDefined();

        const promotions = {
            [behaviorLever!.id]: "refill_heat_amount",
        };

        const patched = patchCartridge(cartridge, {}, promotions, levers);
        const action =
            patched.blueprints.worker.components?.behavior?.rules?.[0]
                .actions?.[0];
        const stateEntry =
            patched.blueprints.worker.components?.state?.refill_heat_amount;

        expect(action?.type).toBe("MUTATE");
        if (action?.type !== "MUTATE") {
            throw new Error("Expected MUTATE action");
        }
        expect(action.value).toBe("self.state.refill_heat_amount");
        expect(stateEntry?.value).toBe(3);
    });
});
