import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTabGuardStore } from "./tabGuardStore";

describe("tabGuardStore", () => {
    beforeEach(() => {
        useTabGuardStore.setState({ guards: {} });
    });

    it("keeps guard state stable when an identical guard is upserted", () => {
        const requestSave = vi.fn(async () => {});
        const discardChanges = vi.fn();
        const guard = {
            tabId: "asset-tab",
            title: "Asset: wraith",
            isDirty: false,
            requestSave,
            discardChanges,
        };

        useTabGuardStore.getState().upsertGuard(guard);
        const first = useTabGuardStore.getState().guards;
        useTabGuardStore.getState().upsertGuard({ ...guard });

        expect(useTabGuardStore.getState().guards).toBe(first);
    });
});
