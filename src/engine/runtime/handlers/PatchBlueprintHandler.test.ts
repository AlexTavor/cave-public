import { describe, it, expect } from "vitest";
import { PatchBlueprintHandler } from "./PatchBlueprintHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import {
    createBlueprint,
    createCartridge,
    createEntity,
} from "../../test/factories";

const makeCartridge = () =>
    createCartridge("core.json", {
        blueprints: {
            npc: createBlueprint("npc", {
                components: {
                    behavior: {
                        rules: [
                            {
                                id: "old_rule",
                                sortKey: "sk_old",
                                conditions: [],
                                actions: [],
                            },
                        ],
                    },
                    state: {
                        hp: { value: 1, visible: false },
                    },
                    display: {
                        label: "Old",
                        display_key: "old",
                    },
                },
            }),
        },
    });

const resolveBehavior = (
    value: unknown,
): { rules?: Array<{ id?: string }> } | null => {
    if (!value || typeof value !== "object") return null;
    return value as { rules?: Array<{ id?: string }> };
};

const resolveDisplay = (value: unknown): { label?: string } | null => {
    if (!value || typeof value !== "object") return null;
    return value as { label?: string };
};

describe("PatchBlueprintHandler", () => {
    it("updates blueprint components and patches live entities", () => {
        const handler = new PatchBlueprintHandler();
        const context = makeHandlerContext(makeCartridge());

        context.world.add(
            createEntity("entity_1", {
                blueprintId: "npc",
                behavior: {
                    rules: [
                        {
                            id: "old_rule",
                            sortKey: "sk_old",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
                state: {
                    hp: { value: 10, visible: false },
                    energy: { value: 2, visible: false },
                },
                display: {
                    label: "Old",
                    display_key: "old",
                },
            }),
        );

        handler.handle(
            {
                type: RuntimeCommandType.PATCH_BLUEPRINT,
                payload: {
                    blueprintId: "npc",
                    components: {
                        behavior: {
                            rules: [
                                {
                                    id: "new_rule",
                                    sortKey: "sk_new",
                                    conditions: [],
                                    actions: [],
                                },
                            ],
                        },
                        state: {
                            hp: { value: 1, visible: false },
                            stamina: { value: 4, visible: false },
                        },
                        display: {
                            label: "New",
                            display_key: "new",
                        },
                    },
                },
            },
            context,
        );

        const blueprint = context.cartridge.blueprints.npc;
        const blueprintComponents = blueprint.components as {
            behavior?: { rules?: Array<{ id?: string }> };
            display?: { label?: string };
        };

        expect(blueprintComponents.behavior?.rules?.[0]?.id).toBe("new_rule");
        expect(blueprintComponents.display?.label).toBe("New");

        const entity = context.world.entities.find(
            (candidate) => candidate.id === "entity_1",
        );
        const state = entity?.state as Record<string, { value: number }>;
        const behavior = resolveBehavior(entity?.behavior);
        const display = resolveDisplay(entity?.display);

        expect(behavior?.rules?.[0]?.id).toBe("new_rule");
        expect(display?.label).toBe("New");
        expect(state.hp.value).toBe(10);
        expect(state.energy.value).toBe(2);
        expect(state.stamina.value).toBe(4);
    });
});
