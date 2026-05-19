import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { resolveOrbitPosition } from "./orbitLayout";
import { orbitAssignedBody } from "./orbitAssignedBody";
import {
    resolveOrbitBandRadiusOffset,
    settleOrbitRadiusOffset,
} from "./orbitRadiusBand";

const makePowerInput = (
    state: Record<string, any>,
    body: Record<string, any> = {},
) => ({
    bodyId: "body-1",
    owner: {
        id: "node-1",
        assignment: { assignedIds: ["body-1"] },
        powerSink: {},
    },
    body: {
        x: 120,
        y: 0,
        radius: 8,
        layer: "phantom",
        targetId: null,
        ...body,
    } as any,
    ownerBody: { x: 0, y: 0, radius: 20 } as any,
    snapshot: { getEntity: () => ({ id: "body-1", state }) } as any,
    timeMs: 1000,
});

describe("orbitRadiusBand", () => {
    it("assigns deterministic per-body belt offsets for power nodes", () => {
        const first = resolveOrbitBandRadiusOffset({
            ownerId: "node-1",
            ownerKind: "power",
            bodyId: "body-1",
        });
        const second = resolveOrbitBandRadiusOffset({
            ownerId: "node-1",
            ownerKind: "power",
            bodyId: "body-2",
        });
        expect(first).toBe(
            resolveOrbitBandRadiusOffset({
                ownerId: "node-1",
                ownerKind: "power",
                bodyId: "body-1",
            }),
        );
        expect(Math.abs(first)).toBeLessThanOrEqual(12);
        expect(first).not.toBe(second);
    });

    it("settles orbit offsets inward or outward toward the belt", () => {
        const target = resolveOrbitBandRadiusOffset({
            ownerId: "node-1",
            ownerKind: "power",
            bodyId: "body-1",
        });
        expect(
            settleOrbitRadiusOffset({
                ownerId: "node-1",
                ownerKind: "power",
                bodyId: "body-1",
                radiusOffset: target + 10,
            }),
        ).toBe(target + 6);
        expect(
            settleOrbitRadiusOffset({
                ownerId: "node-1",
                ownerKind: "power",
                bodyId: "body-1",
                radiusOffset: target - 10,
            }),
        ).toBe(target - 6);
    });

    it("moves power bodies toward their belt radius while orbiting", () => {
        const commands = { enqueue: vi.fn() };
        const radiusOffset = settleOrbitRadiusOffset({
            ownerId: "node-1",
            ownerKind: "power",
            bodyId: "body-1",
            radiusOffset: 30,
        });
        orbitAssignedBody({
            ...makePowerInput({
                assignment_orbit_phase_offset: { value: 0 },
                assignment_orbit_radius_offset: { value: 30 },
            }),
            commands: commands as any,
        });
        expect(commands.enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "body-1",
                key: "assignment_orbit_radius_offset",
                value: radiusOffset,
                visible: false,
            },
        });
        expect(commands.enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: {
                id: "body-1",
                ...resolveOrbitPosition({
                    ownerId: "node-1",
                    ownerKind: "power",
                    ownerX: 0,
                    ownerY: 0,
                    ownerRadius: 20,
                    assignedIds: ["body-1"],
                    bodyId: "body-1",
                    bodyRadius: 8,
                    timeMs: 1000,
                    phaseOffset: 0,
                    radiusOffset,
                }),
            },
        });
    });
});
