import { describe, expect, it } from "vitest";
import { applySuggestionToValue } from "./smartInputInsertion";

describe("smartInputInsertion", () => {
    it("does not append a second space when insertText already ends with one", () => {
        const value = "fs";
        const result = applySuggestionToValue(
            value,
            { label: "fs.tree", type: "command", insertText: "fs.tree " },
            2,
        );
        expect(result.nextValue).toBe("fs.tree ");
        expect(result.cursor).toBe(8);
    });

    it("appends one trailing space for command insert without space", () => {
        const result = applySuggestionToValue(
            "he",
            { label: "help", type: "command", insertText: "help" },
            2,
        );
        expect(result.nextValue).toBe("help ");
        expect(result.cursor).toBe(5);
    });
});
