import { describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { renameDraftOptionInSession } from "./renameDraftOptionInSession";

describe("renameDraftOptionInSession", () => {
    it("renames option id and updates draft pool entries", () => {
        const draft = createCartridge("game.cave");
        draft.draftOptions = {
            old_id: {
                id: "old_id",
                title: "Old",
                description: "",
                rarity: "none",
                icon: "unknown",
                payload: [],
            },
        };
        draft.draftPools = {
            pool_main: {
                id: "pool_main",
                texts: [],
                entries: [{ optionId: "old_id", weight: 1 }],
            },
        };

        const error = renameDraftOptionInSession({
            draft,
            oldId: "old_id",
            newId: "new_id",
        });

        expect(error).toBeNull();
        expect(draft.draftOptions?.old_id).toBeUndefined();
        expect(draft.draftOptions?.new_id?.id).toBe("new_id");
        expect(draft.draftPools?.pool_main.entries[0].optionId).toBe("new_id");
    });

    it("returns error when target id already exists", () => {
        const draft = createCartridge("game.cave");
        draft.draftOptions = {
            alpha: {
                id: "alpha",
                title: "Alpha",
                description: "",
                rarity: "none",
                icon: "unknown",
                payload: [],
            },
            beta: {
                id: "beta",
                title: "Beta",
                description: "",
                rarity: "none",
                icon: "unknown",
                payload: [],
            },
        };

        const error = renameDraftOptionInSession({
            draft,
            oldId: "alpha",
            newId: "beta",
        });

        expect(error).toContain("already exists");
        expect(draft.draftOptions?.alpha?.id).toBe("alpha");
    });
});

