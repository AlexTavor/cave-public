import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "../useSessionStore";
import { useUndoHistoryStore } from "../useUndoHistoryStore";

const makeDraft = () => ({
    version: "1.0.0",
    metadata: { name: "test", description: "" },
    blueprints: {},
    assets: {},
    options: {},
    draft_pools: {},
});

describe("actionsEditing → unified history", () => {
    beforeEach(() => {
        useUndoHistoryStore.getState().clear();
        const sessions = useSessionStore.getState().sessions;
        Object.keys(sessions).forEach((id) =>
            useSessionStore.getState().closeSession(id),
        );
    });

    it("updateDraft records a session entry", () => {
        const id = "mod.bp";
        useSessionStore.getState().initSession(id, makeDraft() as never);
        useSessionStore.getState().updateDraft(id, (d: any) => {
            d.metadata.name = "changed";
        });
        const hist = useUndoHistoryStore.getState();
        expect(hist.past.at(-1)).toEqual({ kind: "session", sessionId: id });
        expect(hist.canUndo).toBe(true);
    });

    it("replaceDraft records a session entry", () => {
        const id = "mod.bp";
        const draft = makeDraft();
        useSessionStore.getState().initSession(id, draft as never);
        const next = { ...draft, metadata: { ...draft.metadata, name: "x" } };
        useSessionStore.getState().replaceDraft(id, next as never);
        const hist = useUndoHistoryStore.getState();
        expect(hist.past.at(-1)).toEqual({ kind: "session", sessionId: id });
    });

    it("does not record for missing session", () => {
        useSessionStore.getState().updateDraft("nope", () => {});
        expect(useUndoHistoryStore.getState().past).toEqual([]);
    });
});
