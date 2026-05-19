import { describe, it, expect, beforeEach } from "vitest";
import { useInteractionStore, selectIsBlocked } from "./useInteractionStore";

describe("useInteractionStore", () => {
    beforeEach(() => {
        useInteractionStore.setState({ blockers: new Set() });
    });

    it("initializes with no blockers", () => {
        const state = useInteractionStore.getState();
        expect(state.blockers.size).toBe(0);
        expect(selectIsBlocked(state)).toBe(false);
    });

    it("adds a blocker", () => {
        useInteractionStore.getState().addBlocker("modal:open");
        const state = useInteractionStore.getState();
        expect(state.blockers.has("modal:open")).toBe(true);
        expect(selectIsBlocked(state)).toBe(true);
    });

    it("removes a blocker", () => {
        useInteractionStore.getState().addBlocker("modal:open");
        useInteractionStore.getState().removeBlocker("modal:open");
        const state = useInteractionStore.getState();
        expect(state.blockers.has("modal:open")).toBe(false);
        expect(selectIsBlocked(state)).toBe(false);
    });

    it("handles multiple blockers", () => {
        useInteractionStore.getState().addBlocker("a");
        useInteractionStore.getState().addBlocker("b");

        expect(selectIsBlocked(useInteractionStore.getState())).toBe(true);

        useInteractionStore.getState().removeBlocker("a");
        expect(selectIsBlocked(useInteractionStore.getState())).toBe(true);

        useInteractionStore.getState().removeBlocker("b");
        expect(selectIsBlocked(useInteractionStore.getState())).toBe(false);
    });
});
