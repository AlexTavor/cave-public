// @vitest-environment jsdom
import React from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import type { BehaviorItem } from "./types";
import { BehaviorList } from "./BehaviorList";

const renderWithTheme = (ui: React.ReactElement) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

afterEach(() => {
    cleanup();
});

const items: BehaviorItem[] = [
    {
        id: "behavior-1",
        kind: "behavior",
        sentence: "WHEN self.state.hp.value < 10 DO SET self.state.hp.value 10",
        sortKey: "1",
        source: { ruleId: "behavior-1" },
    },
];

describe("BehaviorList", () => {
    it("renders behavior items", () => {
        renderWithTheme(
            <BehaviorList
                items={items}
                onDelete={() => {}}
                onUpdate={() => {}}
            />,
        );

        expect(
            screen.getByText(
                "WHEN self.state.hp.value < 10 DO SET self.state.hp.value 10",
            ),
        ).toBeDefined();

        expect(screen.getByText("behavior")).toBeDefined();
    });

    it("calls onDelete with the correct item", () => {
        const handleDelete = vi.fn();
        renderWithTheme(
            <BehaviorList
                items={items}
                onDelete={handleDelete}
                onUpdate={() => {}}
            />,
        );

        const removeButton = screen.getByRole("button", {
            name: "Remove",
        });
        fireEvent.click(removeButton);

        expect(handleDelete).toHaveBeenCalledWith(items[0]);
    });

    it("renders empty state", () => {
        renderWithTheme(
            <BehaviorList items={[]} onDelete={() => {}} onUpdate={() => {}} />,
        );

        expect(screen.getByText("No behaviors yet.")).toBeDefined();
    });
});
