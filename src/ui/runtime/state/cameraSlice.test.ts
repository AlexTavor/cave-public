import { describe, expect, it } from "vitest";
import { createCameraActions, type CameraSliceState } from "./cameraSlice";

const createHarness = () => {
    const state: CameraSliceState = {
        cameraState: null,
        pendingCameraRestore: null,
        cameraRevision: 0,
    };
    return {
        state,
        actions: createCameraActions(
            (update) => update(state),
            () => state,
        ),
    };
};

describe("createCameraActions", () => {
    it("does not increment revision for equivalent camera updates", () => {
        const { state, actions } = createHarness();
        actions.setCameraState({ centerX: 10, centerY: 20, zoom: 1 });
        actions.setCameraState({
            centerX: 10.49,
            centerY: 20.49,
            zoom: 1.0009,
        });

        expect(state.cameraRevision).toBe(1);
        expect(state.cameraState).toEqual({
            centerX: 10,
            centerY: 20,
            zoom: 1,
        });
    });

    it("stores exact accepted updates and increments revision", () => {
        const { state, actions } = createHarness();
        actions.setCameraState({ centerX: 10, centerY: 20, zoom: 1 });
        actions.setCameraState({ centerX: 11, centerY: 20, zoom: 1 });

        expect(state.cameraRevision).toBe(2);
        expect(state.cameraState).toEqual({
            centerX: 11,
            centerY: 20,
            zoom: 1,
        });
    });
});
