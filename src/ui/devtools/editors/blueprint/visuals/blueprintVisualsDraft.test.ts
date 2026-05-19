import { describe, expect, it } from "vitest";
import { resolveAuthoredWorldPosition } from "../../../../../data/schemas/v2/worldPositionDefaults";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import {
    ensurePlacementAnimationDraft,
    ensureWorldPresenceDraft,
    readRadiusDraft,
} from "./blueprintVisualsDraft";

const makeDraft = () =>
    createCartridge("test.json", {
        blueprints: {
            worker: (() => {
                const spatial = resolveAuthoredWorldPosition(70, 80);
                const physics = resolveAuthoredWorldPosition(90, 100);
                return createBlueprint("worker", {
                    components: {
                        display: {
                            label: "Worker",
                            display_key: "worker",
                            radius: { min: 11, max: 12 },
                        },
                        spatial: { ...spatial, radius: { min: 13, max: 14 } },
                        physics: { ...physics, radius: 15 },
                    } as never,
                });
            })(),
        },
    });

describe("blueprintVisualsDraft", () => {
    it("reads radius using the documented fallback order", () => {
        const draft = makeDraft();
        draft.blueprints.worker._editor = {
            abilities: {
                worldPresence: { x: 1, y: 2, radius: { min: 3, max: 4 } },
            },
        } as never;
        expect(readRadiusDraft(draft, "worker")).toEqual({ min: 3, max: 4 });
        delete (draft.blueprints.worker._editor as any).abilities.worldPresence;
        expect(readRadiusDraft(draft, "worker")).toEqual({ min: 13, max: 14 });
        delete (draft.blueprints.worker.components as any).spatial;
        expect(readRadiusDraft(draft, "worker")).toEqual({ min: 11, max: 12 });
        delete draft.blueprints.worker.components.display?.radius;
        expect(readRadiusDraft(draft, "worker")).toEqual({ min: 15, max: 15 });
    });

    it("lazily creates worldPresence using existing x, y, and radius values", () => {
        const draft = makeDraft();
        const presence = ensureWorldPresenceDraft(draft, "worker");
        expect(presence).toEqual({
            x: 70,
            y: 80,
            radius: { min: 13, max: 14 },
        });
    });

    it("materializes placement animation from the glyph pulse defaults", () => {
        const glyph = {
            placements: [
                {
                    shape: "ring",
                    position: 4,
                    rotationDeg: 0,
                    scale: 1,
                    colorHex: "#000000",
                    radialPositionFactor: 1,
                },
            ],
            pulse: {
                distanceFromCenterMinFactor: 0.4,
                distanceFromCenterMaxFactor: 0.8,
                scalePulseMin: 0.9,
                scalePulseMax: 1.1,
                rotationDeltaMinDeg: -5,
                rotationDeltaMaxDeg: 5,
                delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        } as const;
        expect(ensurePlacementAnimationDraft(glyph as never, 4)).toEqual({
            distanceFromCenterMinFactor: 0.4,
            distanceFromCenterMaxFactor: 0.8,
            scalePulseMin: 0.9,
            scalePulseMax: 1.1,
            rotationDeltaMinDeg: -5,
            rotationDeltaMaxDeg: 5,
            reverseDirection: false,
        });
    });

    it("does not create worldPresence when only reading the radius draft", () => {
        const draft = makeDraft();
        readRadiusDraft(draft, "worker");
        expect(
            draft.blueprints.worker._editor?.abilities?.worldPresence,
        ).toBeUndefined();
    });
});
