// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    getNodeOverlaysEnabled,
    setNodeOverlaysEnabled,
    subscribeNodeOverlaysEnabled,
} from "./nodeOverlayToggle";

afterEach(() => {
    globalThis.localStorage?.clear();
    setNodeOverlaysEnabled(true);
});

describe("nodeOverlayToggle", () => {
    it("defaults to enabled and persists updates", () => {
        expect(getNodeOverlaysEnabled()).toBe(true);
        setNodeOverlaysEnabled(false);
        expect(getNodeOverlaysEnabled()).toBe(false);
        expect(
            globalThis.localStorage?.getItem("cave-node-overlays-enabled"),
        ).toBe("false");
    });

    it("notifies subscribers only when the value changes", () => {
        const listener = vi.fn();
        const unsubscribe = subscribeNodeOverlaysEnabled(listener);

        setNodeOverlaysEnabled(false);
        setNodeOverlaysEnabled(false);
        unsubscribe();

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
