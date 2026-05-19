import { describe, it, expect, beforeEach } from "vitest";
import { useLeverStore } from "./useLeverStore";

describe("useLeverStore", () => {
    beforeEach(() => {
        useLeverStore.setState({
            levers: [],
            overrides: {},
            promotions: {},
            simulationResult: null,
            isRunning: false,
        });
    });

    it("records overrides", () => {
        useLeverStore.getState().setOverride("test.lever", 12);

        expect(useLeverStore.getState().overrides).toEqual({
            "test.lever": 12,
        });
    });
});
