import { beforeEach, describe, expect, it } from "vitest";
import { useUndoHistoryStore } from "./useUndoHistoryStore";

const store = () => useUndoHistoryStore.getState();
const reset = () =>
    useUndoHistoryStore.setState({
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
        isBusy: false,
    });

describe("useUndoHistoryStore", () => {
    beforeEach(reset);

    it("recordSessionEdit appends to past and clears future", () => {
        store().recordSessionEdit("a");
        expect(store().past).toEqual([{ kind: "session", sessionId: "a" }]);
        expect(store().future).toEqual([]);
        expect(store().canUndo).toBe(true);
        expect(store().canRedo).toBe(false);
    });

    it("recordProjectEdit appends to past and clears future", () => {
        store().recordProjectEdit();
        expect(store().past).toEqual([{ kind: "project" }]);
        expect(store().canUndo).toBe(true);
    });

    it("recording clears future", () => {
        store().recordSessionEdit("a");
        store().commitUndo();
        expect(store().canRedo).toBe(true);
        store().recordSessionEdit("b");
        expect(store().future).toEqual([]);
        expect(store().canRedo).toBe(false);
    });

    it("clear resets everything", () => {
        store().recordSessionEdit("a");
        store().clear();
        expect(store().past).toEqual([]);
        expect(store().future).toEqual([]);
        expect(store().canUndo).toBe(false);
        expect(store().canRedo).toBe(false);
        expect(store().isBusy).toBe(false);
    });

    it("peekUndo/peekRedo reflect stack without mutation", () => {
        expect(store().peekUndo()).toBeNull();
        expect(store().peekRedo()).toBeNull();
        store().recordSessionEdit("a");
        expect(store().peekUndo()).toEqual({
            kind: "session",
            sessionId: "a",
        });
        expect(store().peekRedo()).toBeNull();
    });

    it("commitUndo moves last past to front of future", () => {
        store().recordSessionEdit("a");
        store().recordProjectEdit();
        store().commitUndo();
        expect(store().past).toEqual([{ kind: "session", sessionId: "a" }]);
        expect(store().future).toEqual([{ kind: "project" }]);
        expect(store().canUndo).toBe(true);
        expect(store().canRedo).toBe(true);
    });

    it("commitRedo moves first future to end of past", () => {
        store().recordSessionEdit("a");
        store().commitUndo();
        store().commitRedo();
        expect(store().past).toEqual([{ kind: "session", sessionId: "a" }]);
        expect(store().future).toEqual([]);
        expect(store().canUndo).toBe(true);
        expect(store().canRedo).toBe(false);
    });

    it("isBusy prevents record functions", () => {
        store().setBusy(true);
        store().recordSessionEdit("a");
        store().recordProjectEdit();
        expect(store().past).toEqual([]);
    });
});
