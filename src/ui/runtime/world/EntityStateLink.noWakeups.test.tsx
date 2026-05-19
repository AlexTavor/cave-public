// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    EntityStateLinkProvider,
    useEntityBarRef,
    useEntityStateLink,
    useEntityTextRef,
} from "./entity-state-link";
import { BAR_SYNC_INTERVAL_MS } from "./entity-state-link/entityStateLinkRuntime";
import { TEXT_SYNC_INTERVAL_MS } from "./entity-state-link/entityStateLinkTextRuntime";
import {
    createRuntimeTestDouble,
    TestWorldInteractionProvider,
} from "./testUtils";

const runtimeStub = (entity: any) =>
    createRuntimeTestDouble({
        getEntities: () => [entity],
        commands: { enqueue: vi.fn() },
    });

const RenderCounter: React.FC<{ renders: { current: number } }> = ({
    renders,
}) => {
    useEntityStateLink();
    renders.current += 1;
    return null;
};

describe("EntityStateLink no wakeups", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("updates live bars without rerendering context consumers", () => {
        vi.useFakeTimers();
        const entity = {
            id: "e1",
            state: { hp: { value: 50 }, maxHp: { value: 100 } },
        } as any;
        const runtime = runtimeStub(entity);
        const renders = { current: 0 };
        const Bar = () => (
            <div
                data-testid="fill"
                ref={useEntityBarRef({
                    id: "e1:hp",
                    entityId: "e1",
                    valuePath: "state.hp.value",
                    maxPath: "state.maxHp.value",
                })}
            />
        );
        const view = render(
            <TestWorldInteractionProvider value={{ runtime: runtime.runtime }}>
                <EntityStateLinkProvider>
                    <RenderCounter renders={renders} />
                    <Bar />
                </EntityStateLinkProvider>
            </TestWorldInteractionProvider>,
        );
        act(() => {
            entity.state.hp.value = 10;
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            vi.advanceTimersByTime(BAR_SYNC_INTERVAL_MS);
        });
        expect(
            (view.getByTestId("fill") as HTMLDivElement).dataset.progress,
        ).toBe("10");
        expect(renders.current).toBe(1);
    });

    it("updates live text without rerendering context consumers", () => {
        vi.useFakeTimers();
        const entity = {
            id: "e1",
            state: { hp: { value: 50 }, maxHp: { value: 100 } },
        } as any;
        const runtime = runtimeStub(entity);
        const renders = { current: 0 };
        const Text = () => (
            <span
                data-testid="text"
                ref={useEntityTextRef<HTMLSpanElement>({
                    id: "e1:text",
                    kind: "compact-fraction",
                    entityId: "e1",
                    valuePath: "state.hp.value",
                    maxPath: "state.maxHp.value",
                })}
            />
        );
        const view = render(
            <TestWorldInteractionProvider value={{ runtime: runtime.runtime }}>
                <EntityStateLinkProvider>
                    <RenderCounter renders={renders} />
                    <Text />
                </EntityStateLinkProvider>
            </TestWorldInteractionProvider>,
        );
        act(() => {
            entity.state.hp.value = 10;
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            vi.advanceTimersByTime(TEXT_SYNC_INTERVAL_MS);
        });
        expect(view.getByTestId("text").textContent).toBe("10/100");
        expect(renders.current).toBe(1);
    });
});
