import { describe, expect, it } from "vitest";
import { resolveOrbitOffsets, resolveOrbitPosition } from "./orbitLayout";

const makeArgs = (ownerKind: "power" | "processing") => ({
    ownerId: "node-1",
    ownerKind,
    ownerX: 0,
    ownerY: 0,
    ownerRadius: 20,
    bodyId: "body-1",
    bodyRadius: 8,
    timeMs: 1000,
    progressRatio: ownerKind === "processing" ? 0.25 : 0,
});

describe("orbit continuity", () => {
    it.each(["power", "processing"] as const)(
        "keeps a body's orbit position stable when %s membership changes",
        (ownerKind) => {
            const base = makeArgs(ownerKind);
            const seeded = resolveOrbitOffsets({
                ...base,
                assignedIds: ["body-1", "body-2"],
                bodyX: 64,
                bodyY: 16,
            });
            const before = resolveOrbitPosition({
                ...base,
                assignedIds: ["body-1", "body-2"],
                phaseOffset: seeded.phaseOffset,
                radiusOffset: seeded.radiusOffset,
            });
            const after = resolveOrbitPosition({
                ...base,
                assignedIds: ["body-0", "body-2", "body-1"],
                phaseOffset: seeded.phaseOffset,
                radiusOffset: seeded.radiusOffset,
            });
            expect(after.x).toBeCloseTo(before.x, 6);
            expect(after.y).toBeCloseTo(before.y, 6);
        },
    );
});
