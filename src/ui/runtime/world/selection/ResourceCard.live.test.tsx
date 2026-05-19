// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconRegistryProvider } from "../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { EntityStateLinkProvider } from "../entity-state-link";
import { TEXT_SYNC_INTERVAL_MS } from "../entity-state-link/entityStateLinkTextRuntime";
import {
    createRuntimeTestDouble,
    TestWorldInteractionProvider,
} from "../testUtils";
import { ResourceCardView } from "./ResourceCardView";
import { useResourceCardData } from "./useResourceCardData";

const TrackedResourceCard: React.FC<{
    entity: any;
    runtime: any;
    onRender: () => void;
}> = ({ entity, runtime, onRender }) => {
    onRender();
    const data = useResourceCardData(entity, runtime);
    return (
        <ResourceCardView
            data={data}
            entityId={entity.id ?? ""}
            runtime={runtime}
        />
    );
};

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("ResourceCard live storage", () => {
    it("updates visible storage text live without rerendering the card body", () => {
        vi.useFakeTimers();
        const entity = {
            id: "pool-1",
            label: "Food Pool",
            display: {
                bars: [{ key: "state.food", maxKey: "state.food.max" }],
            },
            state: {
                food: {
                    value: 10,
                    max: 10,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
            },
        } as any;
        const runtimeDouble = createRuntimeTestDouble({
            getEntity: () => entity,
            getCartridge: () => ({ blueprints: {} }),
        });
        let commits = 0;
        const trackRender = () => {
            commits += 1;
        };

        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <TestWorldInteractionProvider
                        value={{ runtime: runtimeDouble.runtime }}
                    >
                        <EntityStateLinkProvider>
                            <TrackedResourceCard
                                entity={entity}
                                runtime={runtimeDouble.runtime}
                                onRender={trackRender}
                            />
                        </EntityStateLinkProvider>
                    </TestWorldInteractionProvider>
                </IconRegistryProvider>
            </ThemeProvider>,
        );
        expect(screen.getByText("10/10")).toBeTruthy();
        const initialCommits = commits;

        act(() => {
            entity.state.food.value = 4;
            runtimeDouble.emitMutation({
                changedEntityIds: ["pool-1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            vi.advanceTimersByTime(TEXT_SYNC_INTERVAL_MS);
        });
        expect(screen.getByText("4.0/10")).toBeTruthy();
        expect(commits).toBe(initialCommits);
    });

    it("skips rerendering the memoized view when the data ref is unchanged", () => {
        const data = { label: "Food Pool", description: "", storageModels: [] };
        let commits = 0;
        const view = (
            <ThemeProvider>
                <IconRegistryProvider>
                    <Profiler
                        id="resource-card-view"
                        onRender={() => (commits += 1)}
                    >
                        <ResourceCardView
                            data={data}
                            entityId="pool-1"
                            runtime={null}
                        />
                    </Profiler>
                </IconRegistryProvider>
            </ThemeProvider>
        );
        const { rerender } = render(view);
        rerender(view);
        expect(commits).toBe(1);
    });
});
