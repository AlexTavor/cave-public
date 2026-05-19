import { describe, expect, it } from "vitest";
import { PASSPORT_PERMANENT_TAG } from "../../../data/schemas/abilities/passport";
import { createBlueprint, createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { restorePassportPermanentCarryover } from "./passportPermanentCarryover";

const makeRuntime = (blueprints: Record<string, unknown>) =>
    new Runtime(
        createCartridge("test", { blueprints: blueprints as any }),
        "seed",
        new CommandsManager(),
    );

describe("restorePassportPermanentCarryover parent resolution", () => {
    it("resolves authored permanent parent tags after all entries restore", () => {
        const runtime = makeRuntime({
            root: createBlueprint("root", {
                tags: [PASSPORT_PERMANENT_TAG, "root-tag"],
            }),
            child: createBlueprint("child", {
                tags: [PASSPORT_PERMANENT_TAG],
                components: {
                    parent: { kind: "entity_tag", tag: "root-tag" },
                } as any,
            }),
        });

        expect(
            restorePassportPermanentCarryover(runtime, {
                entries: [
                    { id: "child-1", blueprintId: "child" },
                    { id: "root-1", blueprintId: "root" },
                ],
                issues: [],
            }),
        ).toEqual([]);
        expect(runtime.getEntity("child-1")).toMatchObject({
            parent: { parentId: "root-1" },
        });
    });
});
