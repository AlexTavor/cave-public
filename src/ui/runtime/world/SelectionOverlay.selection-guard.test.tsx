// @vitest-environment jsdom
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createSelectionOverlayRuntime,
    makeSelectionOverlayEntity,
    renderSelectionOverlayHarness,
} from "./selectionOverlayTestUtils";

vi.mock("./entity-state-link", () => ({
    useEntityBarRef: () => ({ current: null }),
    useEntityTextRef: () => ({ current: null }),
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("SelectionOverlay selection guard", () => {
    it("clears selection when selected entity is removed", async () => {
        const current = { "pool-1": makeSelectionOverlayEntity() } as Record<
            string,
            any
        >;
        const runtime = createSelectionOverlayRuntime((id) => current[id]);
        const onSelect = vi.fn();
        renderSelectionOverlayHarness(runtime.runtime, onSelect);

        await act(async () => {
            delete current["pool-1"];
            runtime.emitMutation({
                changedEntityIds: ["pool-1"],
                entityListChanged: true,
                blueprintChanged: false,
            });
        });

        expect(onSelect).toHaveBeenCalledWith(null);
        expect(screen.queryByText("Food Pool")).toBeNull();
    });

    it("clears selection when selected entity changes lens", async () => {
        const entity = makeSelectionOverlayEntity();
        const runtime = createSelectionOverlayRuntime(() => entity);
        const onSelect = vi.fn();
        renderSelectionOverlayHarness(runtime.runtime, onSelect);

        await act(async () => {
            entity.state.food = { value: 5, max: 10 };
            runtime.emitMutation({
                changedEntityIds: ["pool-1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        expect(onSelect).toHaveBeenCalledWith(null);
    });

    it("keeps selection when selected id is rebound to a different runtime object with the same lens", async () => {
        const current = { "pool-1": makeSelectionOverlayEntity() } as Record<
            string,
            any
        >;
        const runtime = createSelectionOverlayRuntime((id) => current[id]);
        const onSelect = vi.fn();
        renderSelectionOverlayHarness(runtime.runtime, onSelect);

        await act(async () => {
            current["pool-1"] = { ...makeSelectionOverlayEntity() };
            runtime.emitMutation({
                changedEntityIds: ["pool-1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        expect(onSelect).not.toHaveBeenCalledWith(null);
        expect(screen.getByText("Food Pool")).toBeDefined();
    });
});
