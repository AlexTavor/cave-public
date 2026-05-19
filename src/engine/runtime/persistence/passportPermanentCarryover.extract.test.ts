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
import { extractPassportPermanentCarryover } from "./passportPermanentCarryover";

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

describe("extractPassportPermanentCarryover", () => {
    it("extracts only permanent passport entities with saved state and physics", () => {
        const runtime = makeRuntime({
            keeper: createBlueprint("keeper", {
                tags: [PASSPORT_PERMANENT_TAG],
                components: {
                    physics,
                    state: {
                        hp: {
                            value: 0,
                            visible: true,
                            max: 10,
                            allowDeposit: true,
                        },
                    },
                },
            }),
        });
        runtime.addEntity(
            createEntity("keeper-1", {
                blueprintId: "keeper",
                tags: [PASSPORT_PERMANENT_TAG],
                state: {
                    hp: {
                        value: 7,
                        visible: true,
                        max: 10,
                        allowDeposit: true,
                    },
                },
                physics,
            }),
        );
        runtime.addEntity(
            createEntity("temp-1", { blueprintId: "keeper", tags: ["temp"] }),
        );
        const body = buildPhysicsBody("keeper-1", physics);
        body.position = { x: 30, y: 40 };
        body.prevPosition = { x: 28, y: 37 };
        body.acceleration = { x: 1, y: 2 };
        runtime.registerPhysicsBody(body);

        expect(extractPassportPermanentCarryover(runtime)).toEqual({
            entries: [
                {
                    id: "keeper-1",
                    blueprintId: "keeper",
                    state: { hp: { value: 7 } },
                    physics: {
                        x: 30,
                        y: 40,
                        velocity: { x: 2, y: 3 },
                        acceleration: { x: 1, y: 2 },
                        targetId: undefined,
                        layer: "default",
                    },
                },
            ],
            issues: [],
        });
    });

    it("records missing blueprint id, missing source blueprint, and missing source physics body", () => {
        const runtime = makeRuntime({
            keeper: createBlueprint("keeper", { components: { physics } }),
        });
        runtime.addEntity(
            createEntity("no-blueprint", { tags: [PASSPORT_PERMANENT_TAG] }),
        );
        runtime.addEntity(
            createEntity("no-source", {
                blueprintId: "missing",
                tags: [PASSPORT_PERMANENT_TAG],
            }),
        );
        runtime.addEntity(
            createEntity("no-body", {
                blueprintId: "keeper",
                tags: [PASSPORT_PERMANENT_TAG],
                physics,
            }),
        );

        expect(extractPassportPermanentCarryover(runtime).issues).toEqual([
            {
                entityId: "no-blueprint",
                phase: "extract",
                reason: "missing_blueprint_id",
            },
            {
                entityId: "no-body",
                phase: "extract",
                reason: "missing_source_physics_body",
            },
            {
                entityId: "no-source",
                phase: "extract",
                reason: "missing_source_blueprint",
            },
        ]);
    });
});
