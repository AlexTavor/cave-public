import { beforeEach, describe, expect, it } from "vitest";
import { CinematicEventBridge } from "./CinematicEventBridge";

describe("CinematicEventBridge", () => {
    beforeEach(() => {
        CinematicEventBridge.drain();
    });

    it("pushes, reports size, and drains events", () => {
        [["A"], ["B"]].forEach((lines) => CinematicEventBridge.push({ lines }));

        expect(CinematicEventBridge.size()).toBe(2);
        expect(CinematicEventBridge.drain()).toEqual([
            { lines: ["A"] },
            { lines: ["B"] },
        ]);
        expect(CinematicEventBridge.size()).toBe(0);
    });
});
