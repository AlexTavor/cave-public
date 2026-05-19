import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { spawnerCompiler } from "./spawnerCompiler";

describe("spawnerCompiler spawn extras", () => {
    it("compiles parent and forced habiti into spawn_body actions", () => {
        const draft = createBlueprint("parent", { components: {} });
        spawnerCompiler(
            draft,
            {
                id: "spawn",
                blueprintId: "child",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn_body",
                target: "sys_world",
                parentOnSpawn: "self",
                forcedHabiti: ["human"],
                triggers: ["assignment_complete"],
                conditions: [],
            },
            0,
        );

        const rule = draft.components.behavior?.rules?.[0];
        expect(rule?.conditions).toHaveLength(1);
        expect(rule?.actions[0]).toMatchObject({
            type: "SPAWN_BODY",
            parentId: "self",
            forcedHabiti: ["human"],
        });
    });
});
