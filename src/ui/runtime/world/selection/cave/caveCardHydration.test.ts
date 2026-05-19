import { describe, expect, it } from "vitest";
import type { CaveCardData } from "./caveCardTypes";
import { caveCardDataEqual } from "./caveCardHydration";

const makeData = (): CaveCardData => ({
    label: "The Cave",
    targetId: "sys_world",
    level: 2,
    xpMax: 250,
    attributes: { body: 10, mind: 10, social: 10 },
    habiti: [],
    understanding: [],
    modifiers: [],
    traits: [],
});

describe("caveCardDataEqual", () => {
    it("treats unchanged structural cave data as equal", () => {
        expect(caveCardDataEqual(makeData(), makeData())).toBe(true);
    });

    it("detects structural cave changes", () => {
        const data = makeData();
        expect(caveCardDataEqual(data, { ...makeData(), level: 3 })).toBe(
            false,
        );
        expect(
            caveCardDataEqual(data, {
                ...makeData(),
                attributes: { body: 11, mind: 10, social: 10 },
            }),
        ).toBe(false);
    });
});
