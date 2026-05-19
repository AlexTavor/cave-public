import { describe, expect, it } from "vitest";
import { PASSPORT_PERMANENT_TAG } from "../../../data/schemas/abilities/passport";
import {
    createBlueprint,
    createCartridge,
    createEntity,
} from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { buildPhysicsBody } from "../handlers/spawnUtils";
import { restorePassportPermanentCarryover } from "./passportPermanentCarryover";

const makeRuntime = (blueprints: Record<string, unknown>) =>
    new Runtime(
        createCartridge("test", { blueprints: blueprints as any }),
        "seed",
        new CommandsManager(),
    );
const physics = {
    x: 10,
    y: 20,
    mass: 1,
    radius: 5,
    drag: 0.1,
    isStatic: false,
};
const snapshot = {
    entries: [
        {
            id: "keeper-1",
            blueprintId: "keeper",
            state: { hp: { value: 7 } },
            physics: {
                x: 30,
                y: 40,
                velocity: { x: 2, y: 3 },
                acceleration: { x: 4, y: 5 },
                targetId: "goal",
                layer: "phantom",
            },
        },
    ],
    issues: [],
} as const;

describe("restorePassportPermanentCarryover", () => {
    it("rebuilds from the new blueprint base, overlays saved state, and restores physics", () => {
        const runtime = makeRuntime({
            keeper: createBlueprint("keeper", {
                label: "New Keeper",
                tags: [PASSPORT_PERMANENT_TAG, "fresh"],
                components: {
                    physics,
                    state: { hp: { value: 0, visible: false, max: 20 } },
                },
            }),
        });

        expect(
            restorePassportPermanentCarryover(runtime, snapshot as any),
        ).toEqual([]);
        expect(runtime.getEntity("keeper-1")).toMatchObject({
            label: "New Keeper",
            tags: [PASSPORT_PERMANENT_TAG, "fresh"],
            state: { hp: { value: 7, visible: false, max: 20 } },
        });
        expect(runtime.getPhysicsBody("keeper-1")).toMatchObject({
            position: { x: 30, y: 40 },
            targetId: "goal",
            layer: "phantom",
        });
    });

    it("records target blueprint, id, physics conflict, and invalid physics issues", () => {
        const runtime = makeRuntime({
            keeper: createBlueprint("keeper", { components: { physics } }),
            noPhysics: createBlueprint("noPhysics", { components: {} }),
        });
        runtime.addEntity(createEntity("dup"));
        runtime.registerPhysicsBody(buildPhysicsBody("body-conflict", physics));

        expect(
            restorePassportPermanentCarryover(runtime, {
                entries: [
                    { id: "missing", blueprintId: "missing" },
                    { id: "dup", blueprintId: "keeper" },
                    {
                        id: "body-conflict",
                        blueprintId: "keeper",
                        physics: snapshot.entries[0].physics,
                    },
                    {
                        id: "bad-physics",
                        blueprintId: "noPhysics",
                        physics: snapshot.entries[0].physics,
                    },
                ],
                issues: [],
            }),
        ).toEqual([
            {
                entityId: "missing",
                phase: "restore",
                reason: "missing_target_blueprint",
            },
            { entityId: "dup", phase: "restore", reason: "target_id_conflict" },
            {
                entityId: "body-conflict",
                phase: "restore",
                reason: "target_physics_conflict",
            },
            {
                entityId: "bad-physics",
                phase: "restore",
                reason: "invalid_target_physics_component",
            },
        ]);
    });
});
