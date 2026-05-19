// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { useRuntimeToolStore } from "../state/useRuntimeToolStore";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { RuntimeInspectorViewport } from "./RuntimeInspectorViewport";
import { runtimeInspectorStore } from "./runtimeInspectorStore";
import { setRuntimeInspectorEnabled } from "./runtimeInspectorToggle";
import { makeInspectorRuntime } from "./runtimeInspectorTestUtils";

const flushFrames = async () => {
    await act(async () => {
        vi.runOnlyPendingTimers();
    });
};

const renderViewport = (runtime: ReturnType<typeof makeInspectorRuntime>) =>
    render(
        <ThemeProvider>
            <TestWorldInteractionProvider value={{ runtime }}>
                <RuntimeInspectorViewport />
            </TestWorldInteractionProvider>
        </ThemeProvider>,
    );

describe("RuntimeInspectorViewport", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            (cb) => setTimeout(() => cb(Date.now()), 0) as unknown as number,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) =>
            clearTimeout(id as unknown as number),
        );
        runtimeInspectorStore.getState().reset();
        useRuntimeToolStore.setState({ selectedEntityId: null } as any);
        setRuntimeInspectorEnabled(false);
    });

    afterEach(() => {
        cleanup();
        runtimeInspectorStore.getState().reset();
        useRuntimeToolStore.setState({ selectedEntityId: null } as any);
        setRuntimeInspectorEnabled(false);
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("renders nothing when the feature is disabled", () => {
        renderViewport(
            makeInspectorRuntime([{ id: "worker-1", label: "Worker" }]),
        );
        expect(screen.queryByTestId("runtime-inspector-viewport")).toBeNull();
    });

    it("shows live inspector windows, supports pinning, and closes removed entities", async () => {
        const runtime = makeInspectorRuntime([
            { id: "worker-1", label: "Worker One", body: { level: 1 } },
            { id: "worker-2", label: "Worker Two", body: { level: 2 } },
        ]);
        setRuntimeInspectorEnabled(true);
        renderViewport(runtime);
        act(() => useRuntimeToolStore.getState().selectEntity("worker-1"));
        await flushFrames();
        expect(screen.getByText(/"id": "worker-1"/)).toBeDefined();

        fireEvent.click(screen.getByRole("button", { name: "PIN" }));
        act(() => useRuntimeToolStore.getState().selectEntity(null));
        await flushFrames();
        expect(screen.getByText(/"id": "worker-1"/)).toBeDefined();

        act(() => useRuntimeToolStore.getState().selectEntity("worker-2"));
        await flushFrames();
        fireEvent.click(screen.getByRole("button", { name: "PIN" }));
        act(() => useRuntimeToolStore.getState().selectEntity(null));
        await flushFrames();
        expect(screen.getAllByTestId("runtime-inspector-window")).toHaveLength(
            2,
        );

        const entity = runtime.getEntity("worker-1");
        runtime.getWorld().remove(entity as any);
        await flushFrames();
        expect(screen.queryByText(/"id": "worker-1"/)).toBeNull();
    });
});
