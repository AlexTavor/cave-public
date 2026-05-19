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

describe("BodySelector", () => {
    it("drag-selects multiple bodies and renders structured habiti preview", () => {
        renderSelector(
            [
                makeBody("body-a", 2, { body: 1, mind: 1, social: 1 }, 10, 10, [
                    "known",
                    "unknown",
                ]),
                makeBody("body-b", 1, { body: 0, mind: 0, social: 0 }, 1, 10),
            ],
            station,
        );
        fireEvent.mouseDown(screen.getByTestId("body-brick-body-a"));
        fireEvent.mouseOver(screen.getByTestId("body-brick-body-b"));
        fireEvent.mouseUp(screen.getByTestId("body-selector"));
        expect(screen.getByText("Selected: 2 bodies")).toBeTruthy();
        expect(
            screen.getByText("Expected Outcome").parentElement?.textContent,
        ).toMatch(/XP:\s*\?*\s*100/);
        expect(screen.getByText("Ancestral Human")).toBeTruthy();
        expect(screen.queryByText("New Habiti: none")).toBeNull();
    });

    it("allows partial assignment even when minimum body-count requirements are unmet", () => {
        renderSelector(
            [makeBody("body-a", 1, { body: 1, mind: 0, social: 0 }, 5, 5)],
            {
                ...station,
                assignment: {
                    slots: 2,
                    minimums: [{ kind: "body_count", required: 2 }],
                },
            },
        );
        expect(
            (
                screen.getByRole("button", {
                    name: "Proceed",
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        fireEvent.mouseDown(screen.getByTestId("body-brick-body-a"));
        fireEvent.mouseUp(screen.getByTestId("body-selector"));
        expect(
            (
                screen.getByRole("button", {
                    name: "Proceed",
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(false);
    });

    it("uses remaining slots rather than total slots for new selections", () => {
        renderSelector(
            [
                makeBody("body-a", 1, { body: 1, mind: 0, social: 0 }, 5, 5),
                makeBody("body-b", 1, { body: 1, mind: 0, social: 0 }, 5, 5),
            ],
            {
                ...station,
                assignment: {
                    slots: 2,
                    minimums: [],
                    assignedIds: ["existing-body"],
                },
            },
        );
        fireEvent.mouseDown(screen.getByTestId("body-brick-body-a"));
        fireEvent.mouseUp(screen.getByTestId("body-selector"));
        fireEvent.mouseDown(screen.getByTestId("body-brick-body-b"));
        fireEvent.mouseUp(screen.getByTestId("body-selector"));
        expect(screen.getByText("Selected: 1 bodies")).toBeTruthy();
    });

    it("uses blueprint assignment slots when live entity capacity is stale", () => {
        renderSelector(
            [
                makeBody("body-a", 1, { body: 1, mind: 0, social: 0 }, 5, 5),
                makeBody("body-b", 1, { body: 1, mind: 0, social: 0 }, 5, 5),
            ],
            { ...station, blueprintId: "absorption", assignment: { slots: 1 } },
            {
                blueprints: {
                    absorption: {
                        components: { assignment: { slots: 10000 } },
                    },
                },
            },
        );
        fireEvent.mouseDown(screen.getByTestId("body-brick-body-a"));
        fireEvent.mouseUp(screen.getByTestId("body-selector"));
        fireEvent.mouseDown(screen.getByTestId("body-brick-body-b"));
        fireEvent.mouseUp(screen.getByTestId("body-selector"));
        expect(screen.getByText("Selected: 2 bodies")).toBeTruthy();
    });
});
