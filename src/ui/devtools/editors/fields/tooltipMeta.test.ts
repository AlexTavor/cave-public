import { describe, it, expect } from "vitest";
import { parseTooltip } from "./tooltipMeta";

describe("parseTooltip", () => {
    it("returns undefined for empty input", () => {
        expect(parseTooltip()).toBeUndefined();
    });

    it("returns undefined when no tooltip segment", () => {
        expect(parseTooltip("ui:slider;min=0;max=1")).toBeUndefined();
    });

    it("extracts tooltip after pipe", () => {
        const desc = "ui:slider;min=0;max=1|tooltip:Controls drag";
        expect(parseTooltip(desc)).toBe("Controls drag");
    });

    it("handles standalone tooltip", () => {
        expect(parseTooltip("tooltip:A plain hint")).toBe("A plain hint");
    });

    it("returns undefined for pipe without tooltip prefix", () => {
        expect(parseTooltip("ui:slider|other:foo")).toBeUndefined();
    });
});
