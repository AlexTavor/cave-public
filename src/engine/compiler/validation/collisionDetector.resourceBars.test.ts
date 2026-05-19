import { describe, expect, it } from "vitest";
import type { EditorConfig } from "../../../data/schemas/abilities";
import { collisionDetector } from "./collisionDetector";

const makeStorage = (
    resource: string,
    barPosition?: "top_left" | "top_right",
) => ({
    resource,
    capacity: { base: 0, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    barPosition,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

describe("collisionDetector resource bars", () => {
    it("flags visible resource bars that omit a slot", () => {
        const editor: EditorConfig = {
            abilities: { storage: [makeStorage("food")] },
        };
        expect(
            collisionDetector(editor).some(
                (i) => i.id === "storage_resource_bar_position_missing_food",
            ),
        ).toBe(true);
    });

    it("flags duplicate visible resource bar slots", () => {
        const editor: EditorConfig = {
            abilities: {
                storage: [
                    makeStorage("food", "top_left"),
                    makeStorage("heat", "top_left"),
                ],
            },
        };
        expect(
            collisionDetector(editor).some(
                (i) => i.id === "resource_bar_position_duplicate_top_left",
            ),
        ).toBe(true);
    });
});
