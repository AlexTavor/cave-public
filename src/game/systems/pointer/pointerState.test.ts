import { describe, expect, it } from "vitest";
import {
    collectPointerTargets,
    resolvePointerPreviewState,
} from "./pointerState";

const makeBody = (body: number, mind = 0, social = 0) => ({
    body: { attributes: { body, mind, social } },
});
const makePowerTarget = (baseDemand: any, allocatedDraw: any = {}) => ({
    id: "power-1",
    assignment: { assignedIds: [] },
    powerSink: { baseDemand, allocatedDraw },
});
const processor = {
    id: "processor-1",
    assignment: { assignedIds: [] },
    state: { assignment_duration: { value: 12 } },
};

describe("resolvePointerPreviewState", () => {
    it("collects sink targets even before they gain an assignment component", () => {
        const targets = collectPointerTargets({
            getEntities: () => [
                { id: "egg", powerSink: { baseDemand: { body: 1 } } },
            ],
            getPhysicsBody: () => ({ x: 4, y: 9 }),
        } as any);
        expect(targets).toEqual([
            { id: "egg", x: 4, y: 9, radius: 0, kind: "power" },
        ]);
    });

    it("returns none when there are no carried bodies or no target", () => {
        expect(
            resolvePointerPreviewState(
                undefined,
                makePowerTarget({ body: 1 }),
            ) as any,
        ).toMatchObject({ amount: 0, mode: "none" });
        expect(
            resolvePointerPreviewState(makeBody(1) as any, undefined),
        ).toMatchObject({ amount: 0, mode: "none" });
    });

    it("caps power preview values using the chosen body only", () => {
        const preview = resolvePointerPreviewState(
            makeBody(6, 2, 1) as any,
            makePowerTarget(
                { body: 4, mind: 10, social: 3 },
                { body: 1, mind: 6, social: 3 },
            ) as any,
        ) as any;
        expect(preview).toMatchObject({
            amount: 7,
            body: 4,
            mind: 2,
            social: 1,
            mode: "power",
            dominant: "body",
        });
    });

    it("keeps power preview visible when draw is already allocated", () => {
        expect(
            resolvePointerPreviewState(
                makeBody(3, 2, 1) as any,
                makePowerTarget(
                    { body: 3, mind: 2, social: 1 },
                    { body: 3, mind: 2, social: 1 },
                ) as any,
            ) as any,
        ).toMatchObject({
            amount: 6,
            body: 3,
            mind: 2,
            social: 1,
            mode: "power",
            dominant: "body",
        });
    });

    it("uses nervous mode and carried count for processing targets", () => {
        expect(
            resolvePointerPreviewState(
                makeBody(2) as any,
                processor as any,
            ) as any,
        ).toMatchObject({
            amount: 1,
            body: 0,
            mind: 0,
            social: 0,
            mode: "nervous",
            dominant: "none",
        });
    });

    it.each([
        [{ body: 2, mind: 2, social: 2 }, "body"],
        [{ body: 0, mind: 2, social: 2 }, "mind"],
        [{ body: 0, mind: 0, social: 2 }, "social"],
    ])(
        "uses body, then mind, then social as the dominant tie-break order",
        (baseDemand, dominant) => {
            const preview = resolvePointerPreviewState(
                makeBody(2, 2, 2) as any,
                makePowerTarget(baseDemand) as any,
            ) as any;
            expect(preview.dominant).toBe(dominant);
        },
    );
});
