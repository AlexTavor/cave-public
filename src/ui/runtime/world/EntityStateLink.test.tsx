// @vitest-environment jsdom
import { render, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { EntityStateLinkProvider, useEntityBarRef } from "./entity-state-link";
import { BAR_SYNC_INTERVAL_MS } from "./entity-state-link/entityStateLinkRuntime";
import {
    createRuntimeTestDouble,
    TestWorldInteractionProvider,
} from "./testUtils";

const runtimeStub = (entities: any[]) =>
    createRuntimeTestDouble({
        getEntities: () => entities,
        commands: { enqueue: vi.fn() },
    });

const TestBar = () => {
    const ref = useEntityBarRef({
        id: "e1:hp",
        entityId: "e1",
        valuePath: "state.hp.value",
        maxPath: "state.maxHp.value",
    });

    return <div data-testid="fill" ref={ref} />;
};

const renderBar = (runtime: { runtime: any }) =>
    render(
        <TestWorldInteractionProvider value={{ runtime: runtime.runtime }}>
            <EntityStateLinkProvider>
                <TestBar />
            </EntityStateLinkProvider>
        </TestWorldInteractionProvider>,
    ).getByTestId("fill") as HTMLDivElement;

const expectProgress = (
    fill: HTMLDivElement,
    transform: string,
    progress: string,
) => {
    expect(fill.style.transform).toBe(transform);
    expect(fill.dataset.progress).toBe(progress);
};

describe("EntityStateLink", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("synchronizes the first bar value immediately", () => {
        const entity = {
            id: "e1",
            state: { hp: { value: 50 }, maxHp: { value: 100 } },
        } as any;
        const fill = renderBar(runtimeStub([entity]));
        expectProgress(fill, "scaleX(0.5)", "50");
    });

    it("waits for the cadence tick before applying rapid mutations", () => {
        vi.useFakeTimers();
        const entities = [
            {
                id: "e1",
                state: { hp: { value: 50 }, maxHp: { value: 100 } },
            } as any,
        ];
        const runtime = runtimeStub(entities),
            fill = renderBar(runtime);
        act(() => {
            entities[0].state.hp.value = 20;
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            entities[0].state.hp.value = 10;
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });
        expectProgress(fill, "scaleX(0.5)", "50");
        act(() => vi.advanceTimersByTime(BAR_SYNC_INTERVAL_MS));
        expectProgress(fill, "scaleX(0.1)", "10");
    });

    it("ignores unrelated entity mutations", () => {
        vi.useFakeTimers();
        const entities = [
            { id: "e1", state: { hp: { value: 50 }, maxHp: { value: 100 } } },
            { id: "e2", state: { hp: { value: 10 }, maxHp: { value: 20 } } },
        ] as any[];
        const runtime = runtimeStub(entities),
            fill = renderBar(runtime);
        act(() => {
            entities[1].state.hp.value = 5;
            runtime.emitMutation({
                changedEntityIds: ["e2"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            vi.advanceTimersByTime(BAR_SYNC_INTERVAL_MS);
        });
        expectProgress(fill, "scaleX(0.5)", "50");
    });

    it("resets missing entities on the next cadence tick", () => {
        vi.useFakeTimers();
        const entities = [
            {
                id: "e1",
                state: { hp: { value: 50 }, maxHp: { value: 100 } },
            } as any,
        ];
        const runtime = runtimeStub(entities),
            fill = renderBar(runtime);
        act(() => {
            entities.splice(0, 1);
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: true,
                blueprintChanged: false,
            });
        });
        act(() => vi.advanceTimersByTime(BAR_SYNC_INTERVAL_MS));
        expectProgress(fill, "scaleX(0)", "0");
    });
});

