import { describe, expect, it } from "vitest";
import {
    purgeProgressMaxBonusStateKey,
    readPurgeProgressMaxBonus,
} from "./purgeProgressBonusState";

describe("purgeProgressBonusState", () => {
    it("uses the canonical hidden-state key", () => {
        expect(purgeProgressMaxBonusStateKey).toBe(
            "habiti_purge_progress_max_bonus",
        );
    });

    it("reads a numeric purge max bonus from world state", () => {
        expect(
            readPurgeProgressMaxBonus({
                state: { [purgeProgressMaxBonusStateKey]: { value: 40 } },
            }),
        ).toBe(40);
    });

    it("returns zero when the hidden entry is missing", () => {
        expect(readPurgeProgressMaxBonus({ state: {} })).toBe(0);
    });

    it("returns zero when the hidden entry value is not numeric", () => {
        expect(
            readPurgeProgressMaxBonus({
                state: { [purgeProgressMaxBonusStateKey]: { value: "40" } },
            }),
        ).toBe(0);
    });
});
