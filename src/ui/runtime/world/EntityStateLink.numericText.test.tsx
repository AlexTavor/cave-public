// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    EntityStateLinkProvider,
    useEntityStateLink,
    useEntityTextRef,
    type EntityTextBinding,
} from "./entity-state-link";
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

const TextNode = ({
    binding,
    testId,
}: {
    binding: EntityTextBinding;
    testId: string;
}) => (
    <span
        data-testid={testId}
        ref={useEntityTextRef<HTMLSpanElement>(binding)}
    />
);

const RenderCounter = ({ renders }: { renders: { current: number } }) => {
    useEntityStateLink();
    renders.current += 1;
    return null;
};

const renderView = (
    runtime: ReturnType<typeof runtimeStub>,
    children: React.ReactNode,
) =>
    render(
        <TestWorldInteractionProvider value={{ runtime: runtime.runtime }}>
            <EntityStateLinkProvider>{children}</EntityStateLinkProvider>
        </TestWorldInteractionProvider>,
    );

describe("EntityStateLink numeric text", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("formats compact, raw, and integer percent bindings", () => {
        const runtime = runtimeStub({
            id: "e1",
            state: {
                compact: { value: 1200 },
                ratio: { value: 0.456 },
                raw: { value: 12.5 },
            },
        } as any);
        const view = renderView(
            runtime,
            <>
                <TextNode
                    testId="compact"
                    binding={{
                        id: "compact",
                        entityId: "e1",
                        kind: "numeric-text",
                        valuePath: "state.compact.value",
                        format: "compact-number",
                    }}
                />
                <TextNode
                    testId="percent"
                    binding={{
                        id: "percent",
                        entityId: "e1",
                        kind: "numeric-text",
                        valuePath: "state.ratio.value",
                        format: "integer-percent",
                        multiplier: 100,
                    }}
                />
                <TextNode
                    testId="raw"
                    binding={{
                        id: "raw",
                        entityId: "e1",
                        kind: "numeric-text",
                        valuePath: "state.raw.value",
                        format: "raw-number",
                    }}
                />
            </>,
        );
        expect(view.getByTestId("compact").textContent).toBe("1k");
        expect(view.getByTestId("percent").textContent).toBe("46%");
        expect(view.getByTestId("raw").textContent).toBe("12.5");
    });

    it("uses fallback text and empty text when a numeric path is missing", () => {
        const runtime = runtimeStub({ id: "e1", state: {} } as any);
        const view = renderView(
            runtime,
            <>
                <TextNode
                    testId="fallback"
                    binding={{
                        id: "fallback",
                        entityId: "e1",
                        kind: "numeric-text",
                        valuePath: "state.missing.value",
                        format: "raw-number",
                        fallbackText: "?",
                    }}
                />
                <TextNode
                    testId="empty"
                    binding={{
                        id: "empty",
                        entityId: "e1",
                        kind: "numeric-text",
                        valuePath: "state.missing.value",
                        format: "raw-number",
                    }}
                />
            </>,
        );
        expect(view.getByTestId("fallback").textContent).toBe("?");
        expect(view.getByTestId("empty").textContent).toBe("");
    });

    it("updates numeric text without rerendering context consumers", () => {
        vi.useFakeTimers();
        const entity = { id: "e1", state: { score: { value: 1 } } } as any;
        const runtime = runtimeStub(entity);
        const renders = { current: 0 };
        const view = renderView(
            runtime,
            <>
                <RenderCounter renders={renders} />
                <TextNode
                    testId="score"
                    binding={{
                        id: "score",
                        entityId: "e1",
                        kind: "numeric-text",
                        valuePath: "state.score.value",
                        format: "raw-number",
                    }}
                />
            </>,
        );
        act(() => {
            entity.state.score.value = 9;
            runtime.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            vi.advanceTimersByTime(TEXT_SYNC_INTERVAL_MS);
        });
        expect(view.getByTestId("score").textContent).toBe("9");
        expect(renders.current).toBe(1);
    });
});
