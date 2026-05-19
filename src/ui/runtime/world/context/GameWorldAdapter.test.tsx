// @vitest-environment jsdom
import { render, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { GameWorldAdapter } from "./GameWorldAdapter";
import { useWorldInteraction } from "./WorldInteractionContext";
import { useRuntimeStore } from "../../state/useRuntimeStore";
import { useRuntimeToolStore } from "../../state/useRuntimeToolStore";

const TestConsumer = () => {
    const { selectedEntityId } = useWorldInteraction();
    return <span data-testid="selected">{selectedEntityId ?? "none"}</span>;
};

describe("GameWorldAdapter", () => {
    afterEach(() => {
        cleanup();
        useRuntimeStore.setState({
            runtime: null,
            status: "idle",
            timeScale: 1,
        });
        useRuntimeToolStore.setState({ selectedEntityId: null } as any);
    });

    it("bridges runtime stores into context", () => {
        const runtime = {
            commands: { enqueue: () => {} },
        } as any;

        useRuntimeStore.setState({ runtime, status: "paused", timeScale: 1 });
        useRuntimeToolStore.setState({
            selectedEntityId: "alpha",
            selectEntity: (id: string | null) =>
                useRuntimeToolStore.setState({ selectedEntityId: id }),
        } as any);

        render(
            <GameWorldAdapter>
                <TestConsumer />
            </GameWorldAdapter>,
        );

        expect(screen.getByTestId("selected").textContent).toBe("alpha");

        act(() => {
            useRuntimeToolStore.getState().selectEntity("beta");
        });

        expect(screen.getByTestId("selected").textContent).toBe("beta");
    });
});
