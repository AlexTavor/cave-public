// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    makeBody,
    renderSelector,
    station,
    virtuosoDataRefs,
} from "./BodySelector.testHarness";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    virtuosoDataRefs.length = 0;
});

describe("BodySelector stability", () => {
    it("keeps the candidate id list reference stable across selection-only updates", () => {
        renderSelector(
            [
                makeBody("body-a", 2, { body: 1, mind: 1, social: 1 }, 10, 10),
                makeBody("body-b", 1, { body: 0, mind: 0, social: 0 }, 1, 10),
            ],
            station,
        );
        const firstList = virtuosoDataRefs[0];
        fireEvent.mouseDown(screen.getByTestId("body-brick-body-a"));
        fireEvent.mouseOver(screen.getByTestId("body-brick-body-b"));
        fireEvent.mouseUp(screen.getByTestId("body-selector"));
        expect(virtuosoDataRefs.at(-1)).toBe(firstList);
    });
});
