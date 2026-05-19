// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    EntityStateLinkProvider,
    useEntityTextRef,
    type EntityTextBinding,
} from "./entity-state-link";
import {
    createRuntimeTestDouble,
    TestWorldInteractionProvider,
} from "./testUtils";

const binding: EntityTextBinding = {
    id: "node-overlay:text:assignment:e1",
    entityId: "e1",
    kind: "remaining-duration-ms",
    valuePath: "state.absorption_progress.value",
    maxPath: "state.absorption_duration.value",
};

const runtimeStub = (entities: any[]) =>
    createRuntimeTestDouble({
        getEntities: () => entities,
        commands: { enqueue: vi.fn() },
    });

const TextNode: React.FC<{ binding: EntityTextBinding }> = ({ binding }) => {
    const ref = useEntityTextRef(binding);
    return <div data-testid="text" ref={ref} />;
};

const renderBoundText = (
    runtime: ReturnType<typeof runtimeStub>,
    currentBinding = binding,
) =>
    render(
        <TestWorldInteractionProvider value={{ runtime: runtime.runtime }}>
            <EntityStateLinkProvider>
                <TextNode binding={currentBinding} />
            </EntityStateLinkProvider>
        </TestWorldInteractionProvider>,
    );

describe("EntityStateLink text", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("synchronizes the first live text value immediately", () => {
        const runtime = runtimeStub([
            {
                id: "e1",
                state: {
                    absorption_progress: { value: 2 },
                    absorption_duration: { value: 10 },
                },
            } as any,
        ]);
        const { getByTestId } = renderBoundText(runtime);
        expect(getByTestId("text").textContent).toBe("8 s");
    });

    it("waits for the cadence tick before applying rapid mutations", () => {
        vi.useFakeTimers();
        const entity = {
            id: "e1",
            state: {
                absorption_progress: { value: 2 },
                absorption_duration: { value: 10 },
            },
        } as any;
        const runtime = runtimeStub([entity]);
        const { getByTestId } = renderBoundText(runtime);
        act(() => {
            entity.state.absorption_progress.value = 4;
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            entity.state.absorption_progress.value = 7;
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });
        expect(getByTestId("text").textContent).toBe("8 s");
        act(() => vi.advanceTimersByTime(33));
        expect(getByTestId("text").textContent).toBe("3 s");
    });

    it("ignores unrelated entity mutations", () => {
        vi.useFakeTimers();
        const runtime = runtimeStub([
            {
                id: "e1",
                state: {
                    absorption_progress: { value: 2 },
                    absorption_duration: { value: 10 },
                },
            },
            {
                id: "e2",
                state: {
                    absorption_progress: { value: 9 },
                    absorption_duration: { value: 12 },
                },
            },
        ] as any[]);
        const { getByTestId } = renderBoundText(runtime);
        act(() => {
            runtime.emitMutation({
                changedEntityIds: ["e2"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            vi.advanceTimersByTime(33);
        });
        expect(getByTestId("text").textContent).toBe("8 s");
    });

    it("refreshes text after a runtime swap even without a mutation summary", () => {
        vi.useFakeTimers();
        const first = runtimeStub([
            {
                id: "e1",
                state: {
                    absorption_progress: { value: 2 },
                    absorption_duration: { value: 10 },
                },
            } as any,
        ]);
        const second = runtimeStub([
            {
                id: "e1",
                state: {
                    absorption_progress: { value: 5 },
                    absorption_duration: { value: 10 },
                },
            } as any,
        ]);
        const { getByTestId, rerender } = renderBoundText(first);
        rerender(
            <TestWorldInteractionProvider value={{ runtime: second.runtime }}>
                <EntityStateLinkProvider>
                    <TextNode binding={binding} />
                </EntityStateLinkProvider>
            </TestWorldInteractionProvider>,
        );
        expect(getByTestId("text").textContent).toBe("5 s");
        act(() => vi.advanceTimersByTime(33));
        expect(getByTestId("text").textContent).toBe("5 s");
    });
});
