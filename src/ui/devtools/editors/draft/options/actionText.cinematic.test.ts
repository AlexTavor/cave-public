import { describe, expect, it } from "vitest";
import { formatBehaviorAction } from "./actionText";

describe("formatBehaviorAction cinematic", () => {
    it("formats SHOW_CINEMATIC back to quoted syntax", () => {
        expect(
            formatBehaviorAction({ type: "SHOW_CINEMATIC", lines: ["A", "B"] }),
        ).toBe('SHOW_CINEMATIC "A", "B"');
    });
});
