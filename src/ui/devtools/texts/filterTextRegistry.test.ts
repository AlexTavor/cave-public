import { describe, expect, it } from "vitest";
import { filterTextRegistry } from "./filterTextRegistry";
import type { TextOwnerBlock } from "./types";

const blocks: TextOwnerBlock[] = [
    {
        key: "a",
        filename: "alpha.bp",
        ownerType: "blueprint_display",
        ownerId: "alpha",
        fields: [
            {
                key: "1",
                filename: "alpha.bp",
                ownerKey: "a",
                ownerType: "blueprint_display",
                ownerId: "alpha",
                category: "label",
                label: "label",
                path: "p1",
                value: "Forge",
            },
            {
                key: "2",
                filename: "alpha.bp",
                ownerKey: "a",
                ownerType: "blueprint_display",
                ownerId: "alpha",
                category: "description",
                label: "description",
                path: "p2",
                value: "Warm hall",
            },
        ],
    },
    {
        key: "b",
        filename: "beta.cave",
        ownerType: "guidance",
        ownerId: "guide-1",
        fields: [
            {
                key: "3",
                filename: "beta.cave",
                ownerKey: "b",
                ownerType: "guidance",
                ownerId: "guide-1",
                category: "text",
                label: "text",
                path: "p3",
                value: "Follow the light",
            },
        ],
    },
];

describe("filterTextRegistry", () => {
    it("filters by type, category, and query while dropping empty blocks", () => {
        expect(
            filterTextRegistry([...blocks], {
                type: "guidance",
                category: "all",
                query: "",
            }),
        ).toHaveLength(1);
        expect(
            filterTextRegistry([...blocks], {
                type: "all",
                category: "description",
                query: "",
            })[0].fields,
        ).toHaveLength(1);
        expect(
            filterTextRegistry([...blocks], {
                type: "all",
                category: "all",
                query: "light",
            })[0].ownerId,
        ).toBe("guide-1");
        expect(
            filterTextRegistry([...blocks], {
                type: "all",
                category: "all",
                query: "alpha.bp",
            })[0].fields,
        ).toHaveLength(2);
    });
});
