// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { NodeOverlayCard } from "./NodeOverlayCard";

afterEach(() => cleanup());

describe("NodeOverlayCard", () => {
    it("omits the label row when the resolved label is empty", () => {
        render(
            <ThemeProvider>
                <NodeOverlayCard
                    model={{
                        entityId: "node-1",
                        kind: "assignment",
                        label: "",
                        valueText: "2",
                        position: { x: 0, y: 0 },
                    }}
                />
            </ThemeProvider>,
        );
        expect(screen.getByText("2")).toBeTruthy();
        expect(screen.queryByText("Idle")).toBeNull();
    });

    it("keeps label and bar content when values are absent", () => {
        render(
            <ThemeProvider>
                <NodeOverlayCard
                    model={{
                        entityId: "node-2",
                        kind: "cycle",
                        label: "[icon=coin] coin",
                        bar: {
                            id: "bar-1",
                            entityId: "node-2",
                            valuePath: "state.coin.value",
                            maxValue: 10,
                            current: 4,
                            max: 10,
                        },
                        position: { x: 0, y: 0 },
                    }}
                />
            </ThemeProvider>,
        );
        expect(screen.getByText("coin")).toBeTruthy();
        expect(screen.getByTestId("node-overlay-slot").dataset.slotId).toBe(
            "node-2",
        );
    });
});
