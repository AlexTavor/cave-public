// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
    clearTutorialCompletionMemory,
    extractTutorialCompletionMemory,
    persistTutorialCompletionMemory,
} from "./tutorialCompletionMemory";

describe("tutorialCompletionMemory", () => {
    it("falls back to stored permanent tutorial completion when runtime is absent", () => {
        persistTutorialCompletionMemory({ intro: 1, body_intro: 2 });
        expect(extractTutorialCompletionMemory(null)).toEqual({
            intro: 1,
            body_intro: 2,
        });
    });

    it("clears stored tutorial completion memory on reset", () => {
        persistTutorialCompletionMemory({ intro: 1 });
        clearTutorialCompletionMemory(null);
        expect(extractTutorialCompletionMemory(null)).toEqual({});
    });
});
