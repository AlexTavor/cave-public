import { beforeEach, describe, expect, it } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    readNodeOverlayDisplayBounds,
    removeNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
    useNodeOverlayDisplayBoundsStore,
} from "./nodeOverlayDisplayBoundsStore";

const bounds = { entityId: "node", centerX: 1, topY: 2, bottomY: 3 };

describe("nodeOverlayDisplayBoundsStore", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());

    it("stores and revises only when effective values change", () => {
        const start = useNodeOverlayDisplayBoundsStore.getState().revision;
        publishNodeOverlayDisplayBounds(bounds);
        expect(readNodeOverlayDisplayBounds("node")).toEqual(bounds);
        expect(useNodeOverlayDisplayBoundsStore.getState().revision).toBe(
            start + 1,
        );

        publishNodeOverlayDisplayBounds({ ...bounds });
        expect(useNodeOverlayDisplayBoundsStore.getState().revision).toBe(
            start + 1,
        );

        publishNodeOverlayDisplayBounds({ ...bounds, bottomY: 4 });
        expect(useNodeOverlayDisplayBoundsStore.getState().revision).toBe(
            start + 2,
        );
    });

    it("removes existing entries and ignores missing ones", () => {
        const start = useNodeOverlayDisplayBoundsStore.getState().revision;
        publishNodeOverlayDisplayBounds(bounds);
        removeNodeOverlayDisplayBounds("node");
        expect(readNodeOverlayDisplayBounds("node")).toBeNull();
        expect(useNodeOverlayDisplayBoundsStore.getState().revision).toBe(
            start + 2,
        );

        removeNodeOverlayDisplayBounds("missing");
        expect(useNodeOverlayDisplayBoundsStore.getState().revision).toBe(
            start + 2,
        );
    });

    it("resets populated state once and leaves empty state stable", () => {
        const start = useNodeOverlayDisplayBoundsStore.getState().revision;
        publishNodeOverlayDisplayBounds(bounds);
        resetNodeOverlayDisplayBounds();
        expect(useNodeOverlayDisplayBoundsStore.getState()).toMatchObject({
            revision: start + 2,
            byEntityId: {},
        });

        resetNodeOverlayDisplayBounds();
        expect(useNodeOverlayDisplayBoundsStore.getState().revision).toBe(
            start + 2,
        );
    });
});
