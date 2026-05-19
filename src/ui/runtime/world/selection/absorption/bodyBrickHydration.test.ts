import { describe, expect, it } from "vitest";
import { bodyBrickDataEqual } from "./bodyBrickHydration";

const makeRow = (overrides: Record<string, unknown> = {}) => ({
    entityId: "body-1",
    subjectId: "body-1",
    fallbackIconId: "worker",
    liveLevel: 2,
    attributes: { body: 1, mind: 2, social: 3 },
    displayHealth: 7,
    displayMaxHealth: 9,
    hasUnownedHabiti: false,
    statusIcons: [{ traitId: "starving", iconId: "food" }],
    ...overrides,
});

describe("bodyBrickDataEqual", () => {
    it("treats matching rendered health values as equal", () => {
        expect(bodyBrickDataEqual(makeRow(), makeRow())).toBe(true);
    });

    it("detects displayed health changes", () => {
        expect(
            bodyBrickDataEqual(makeRow(), makeRow({ displayHealth: 8 })),
        ).toBe(false);
    });

    it("detects changes in rendered row details", () => {
        expect(
            bodyBrickDataEqual(makeRow(), makeRow({ fallbackIconId: "other" })),
        ).toBe(false);
        expect(bodyBrickDataEqual(makeRow(), makeRow({ liveLevel: 3 }))).toBe(
            false,
        );
        expect(
            bodyBrickDataEqual(
                makeRow(),
                makeRow({ attributes: { body: 2, mind: 2, social: 3 } }),
            ),
        ).toBe(false);
        expect(
            bodyBrickDataEqual(makeRow(), makeRow({ statusIcons: [] })),
        ).toBe(false);
    });
});
