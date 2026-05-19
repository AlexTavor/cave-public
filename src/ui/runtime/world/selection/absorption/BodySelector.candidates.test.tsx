// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { makeBody, renderSelector, station } from "./BodySelector.testHarness";

afterEach(cleanup);

describe("BodySelector candidates", () => {
    it("excludes bodies already assigned to the current station", () => {
        renderSelector(
            [
                makeBody("body-a", 1, { body: 1, mind: 0, social: 0 }, 5, 5),
                makeBody("body-b", 1, { body: 1, mind: 0, social: 0 }, 5, 5),
            ],
            {
                ...station,
                assignment: { slots: 2, assignedIds: ["body-a"], minimums: [] },
            },
        );

        expect(screen.queryByTestId("body-brick-body-a")).toBeNull();
        expect(screen.getByTestId("body-brick-body-b")).toBeTruthy();
    });
});
