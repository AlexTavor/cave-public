// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { LayoutWorldAdapter } from "./LayoutWorldAdapter";
import { useWorldInteraction } from "../../../runtime/world/context/WorldInteractionContext";
import { useRuntimeToolStore } from "../../../runtime/state/useRuntimeToolStore";

const TestConsumer: React.FC = () => {
    const { selectedEntityId, selectEntity } = useWorldInteraction();
    return (
        <button
            type="button"
            data-testid="select"
            onClick={() => selectEntity("ghost")}
        >
            {selectedEntityId ?? "none"}
        </button>
    );
};

describe("LayoutWorldAdapter", () => {
    afterEach(() => {
        cleanup();
        useRuntimeToolStore.setState({ selectedEntityId: null } as any);
    });

    it("manages selection locally without touching global tools store", () => {
        useRuntimeToolStore.setState({
            selectedEntityId: "global",
            selectEntity: () => {
                throw new Error("should not be called");
            },
        } as any);

        render(
            <LayoutWorldAdapter runtime={null}>
                <TestConsumer />
            </LayoutWorldAdapter>,
        );

        expect(screen.getByTestId("select").textContent).toBe("none");

        fireEvent.click(screen.getByTestId("select"));

        expect(screen.getByTestId("select").textContent).toBe("ghost");
        expect(useRuntimeToolStore.getState().selectedEntityId).toBe("global");
    });

    it("resets selection when runtime instance changes", () => {
        const runtimeA = { id: "a" } as any;
        const runtimeB = { id: "b" } as any;

        const { rerender } = render(
            <LayoutWorldAdapter runtime={runtimeA}>
                <TestConsumer />
            </LayoutWorldAdapter>,
        );

        fireEvent.click(screen.getByTestId("select"));
        expect(screen.getByTestId("select").textContent).toBe("ghost");

        rerender(
            <LayoutWorldAdapter runtime={runtimeB}>
                <TestConsumer />
            </LayoutWorldAdapter>,
        );

        expect(screen.getByTestId("select").textContent).toBe("none");
    });
});
