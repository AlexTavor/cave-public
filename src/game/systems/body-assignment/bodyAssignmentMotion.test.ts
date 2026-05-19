import { describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { orbitAssignedBody } from "./bodyAssignmentMotion";
import { navigateAssignedBody } from "./navigateAssignedBody";
import {
    resolveOrbitPositionAtProgress,
    resolveOrbitRadius,
} from "./orbitLayout";
import {
    angleAt,
    makeOrbitInput,
    makeProcessingOrbitArgs,
} from "./bodyAssignmentMotion.testUtils";

describe("orbitAssignedBody", () => {
    it("seeds processing orbit offsets on the first orbit tick without teleporting", () => {
        const commands = { enqueue: vi.fn() };
        orbitAssignedBody({
            ...makeOrbitInput({
                assignment_progress_ms: { value: 0 },
                assignment_progress_ratio: { value: 0 },
            }),
            commands: commands as any,
        });
        const commandTypes = commands.enqueue.mock.calls.map(
            ([command]) => command.type,
        );
        expect(commandTypes).toContain(RuntimeCommandType.SET_PHYSICS_LAYER);
        expect(commandTypes).toContain(RuntimeCommandType.SET_TARGET);
        expect(
            commandTypes.filter(
                (type) => type === RuntimeCommandType.UPDATE_STATE,
            ),
        ).toHaveLength(2);
        expect(commandTypes).not.toContain(RuntimeCommandType.POSITION_ENTITY);
    });

    it("positions processing bodies from seeded offsets on later orbit ticks", () => {
        const commands = { enqueue: vi.fn() };
        const phaseOffset = 0.2;
        const radiusOffset = 8;
        orbitAssignedBody({
            ...makeOrbitInput({
                assignment_progress_ms: { value: 300 },
                assignment_progress_ratio: { value: 0.25 },
                assignment_orbit_phase_offset: { value: phaseOffset },
                assignment_orbit_radius_offset: { value: radiusOffset },
            }),
            commands: commands as any,
        });
        expect(commands.enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: {
                id: "body-1",
                ...resolveOrbitPositionAtProgress(
                    makeProcessingOrbitArgs(0.25, 300, {
                        phaseOffset,
                        radiusOffset,
                    }),
                ),
            },
        });
    });

    it("increases processing angular displacement with progress", () => {
        const start = resolveOrbitPositionAtProgress(
            makeProcessingOrbitArgs(0, 0, { ownerX: 0, ownerY: 0 }),
        );
        const low = resolveOrbitPositionAtProgress(
            makeProcessingOrbitArgs(0, 100, { ownerX: 0, ownerY: 0 }),
        );
        const high = resolveOrbitPositionAtProgress(
            makeProcessingOrbitArgs(1, 100, { ownerX: 0, ownerY: 0 }),
        );
        expect(Math.abs(angleAt(high) - angleAt(start))).toBeGreaterThan(
            Math.abs(angleAt(low) - angleAt(start)),
        );
    });

    it("decreases processing orbit radius as progress rises", () => {
        expect(
            resolveOrbitRadius(makeProcessingOrbitArgs(0, 0)),
        ).toBeGreaterThan(resolveOrbitRadius(makeProcessingOrbitArgs(0.5, 0)));
        expect(
            resolveOrbitRadius(makeProcessingOrbitArgs(0.5, 0)),
        ).toBeGreaterThan(resolveOrbitRadius(makeProcessingOrbitArgs(1, 0)));
    });

    it("transitions processing bodies once they move inside the entry ring", () => {
        const commands = { enqueue: vi.fn() };
        navigateAssignedBody({
            bodyId: "body-1",
            ownerId: "egg",
            owner: { id: "egg", display: { bars: [] }, state: {} } as any,
            ownerKind: "processing",
            snapshot: { getEntity: () => null } as any,
            body: { x: 80, y: 0, radius: 8, layer: "default", targetId: "egg" },
            ownerBody: { x: 0, y: 0, radius: 20 },
            commands: commands as any,
        });
        expect(commands.enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.UPDATE_BODIES_BATCH,
            payload: {
                updates: [{ entityId: "body-1", assignmentStatus: "orbiting" }],
            },
        });
    });

    it("expands orbit radius when the owner has visible resource bars", () => {
        expect(
            resolveOrbitRadius(
                makeProcessingOrbitArgs(0, 0, { ownerBarOutsetPx: 14 }),
            ),
        ).toBeGreaterThan(resolveOrbitRadius(makeProcessingOrbitArgs(0, 0)));
    });
});
