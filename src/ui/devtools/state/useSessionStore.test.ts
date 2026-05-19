import { describe, it, expect, beforeEach } from "vitest";
import { ModuleCartridgeSchema } from "../../../data/schemas/module";
import { useSessionStore } from "./useSessionStore";

const makeModule = () =>
    ModuleCartridgeSchema.parse({
        metadata: { id: "game.json", name: "Test Module", version: "0.0.1" },
        blueprints: {
            alpha: { id: "alpha", label: "Alpha", tags: [], components: {} },
        },
        assets: {},
    });

describe("useSessionStore", () => {
    beforeEach(() => {
        // Reset store mainly by clearing sessions manually or just creating new ones
        useSessionStore.setState({ sessions: {} });
    });

    it("initializes a session correctly", () => {
        const id = "test-session";
        const data = makeModule();

        useSessionStore.getState().initSession(id, data);

        const session = useSessionStore.getState().sessions[id];
        expect(session).toBeDefined();
        expect(session.draft).toEqual(data);
        expect(session.original).toEqual(data);
        expect(session.isDirty).toBe(false);
    });

    it("updates draft and pushes history", () => {
        const id = "test-session";
        const data = makeModule();

        useSessionStore.getState().initSession(id, data);

        useSessionStore.getState().updateDraft(id, (draft) => {
            draft.metadata.name = "Updated";
        });

        const session = useSessionStore.getState().sessions[id];
        expect(session.draft.metadata.name).toBe("Updated");
        expect(session.isDirty).toBe(true);
        expect(session.history.past).toHaveLength(1);
        expect(session.history.past[0].metadata.name).toEqual("Test Module");
    });

    it("handles undo and redo", () => {
        const id = "test-session";
        const data = makeModule();
        useSessionStore.getState().initSession(id, data);

        // Update 1: Alpha -> Beta
        useSessionStore.getState().updateDraft(id, (draft) => {
            draft.blueprints.alpha.label = "Beta";
        });

        // Update 2: Beta -> Gamma
        useSessionStore.getState().updateDraft(id, (draft) => {
            draft.blueprints.alpha.label = "Gamma";
        });

        let session = useSessionStore.getState().sessions[id];
        expect(session.draft.blueprints.alpha.label).toBe("Gamma");
        expect(session.history.past).toHaveLength(2); // [{0}, {1}]

        // Undo: should go back to 1
        useSessionStore.getState().undo(id);
        session = useSessionStore.getState().sessions[id];
        expect(session.draft.blueprints.alpha.label).toBe("Beta");
        expect(session.history.past).toHaveLength(1); // [{0}]
        expect(session.history.future).toHaveLength(1); // [{5}]

        // Undo again: should go back to 0
        useSessionStore.getState().undo(id);
        session = useSessionStore.getState().sessions[id];
        expect(session.draft.blueprints.alpha.label).toBe("Alpha");
        expect(session.history.past).toHaveLength(0);

        // Redo: should go to 1
        useSessionStore.getState().redo(id);
        session = useSessionStore.getState().sessions[id];
        expect(session.draft.blueprints.alpha.label).toBe("Beta");

        // Redo again: should go to 5
        useSessionStore.getState().redo(id);
        session = useSessionStore.getState().sessions[id];
        expect(session.draft.blueprints.alpha.label).toBe("Gamma");
    });

    it("handles replaceDraft and undo", () => {
        const id = "test-session";
        const data = makeModule();
        useSessionStore.getState().initSession(id, data);

        const nextData = makeModule();
        nextData.metadata.name = "Replaced";

        useSessionStore.getState().replaceDraft(id, nextData);

        let session = useSessionStore.getState().sessions[id];
        expect(session.draft.metadata.name).toBe("Replaced");
        expect(session.history.past).toHaveLength(1);
        expect(session.history.past[0].metadata.name).toBe("Test Module");

        useSessionStore.getState().undo(id);
        session = useSessionStore.getState().sessions[id];
        expect(session.draft.metadata.name).toBe("Test Module");
        expect(session.history.future).toHaveLength(1);
        expect(session.history.future[0].metadata.name).toBe("Replaced");
    });

    it("commits draft (save)", () => {
        const id = "test-session";
        useSessionStore.getState().initSession(id, makeModule());

        useSessionStore.getState().updateDraft(id, (draft) => {
            draft.metadata.version = "1.0.0";
        });

        useSessionStore.getState().commitDraft(id);

        const session = useSessionStore.getState().sessions[id];
        expect(session.isDirty).toBe(false);
        expect(session.original.metadata.version).toEqual("1.0.0");
        expect(session.draft.metadata.version).toEqual("1.0.0");
        // History should remain
        expect(session.history.past).toHaveLength(1);
    });

    it("discards draft (revert)", () => {
        const id = "test-session";
        useSessionStore.getState().initSession(id, makeModule());

        useSessionStore.getState().updateDraft(id, (draft) => {
            draft.metadata.name = "Another";
        });

        useSessionStore.getState().discardDraft(id);

        const session = useSessionStore.getState().sessions[id];
        expect(session.isDirty).toBe(false);
        expect(session.draft.metadata.name).toEqual("Test Module");
        // History cleared
        expect(session.history.past).toHaveLength(0);
    });

    it("first edit after init always creates undoable history", () => {
        const id = "fresh-session";
        const data = makeModule();
        useSessionStore.getState().initSession(id, data);

        // Immediately edit — the very first change
        useSessionStore.getState().updateDraft(id, (draft) => {
            draft.metadata.name = "First Edit";
        });

        const session = useSessionStore.getState().sessions[id];
        expect(session.history.past).toHaveLength(1);
        expect(session.isDirty).toBe(true);

        // Undo must restore the original
        useSessionStore.getState().undo(id);
        const after = useSessionStore.getState().sessions[id];
        expect(after.draft.metadata.name).toBe("Test Module");
        expect(after.history.past).toHaveLength(0);
    });

    it("undo works after consecutive rapid edits", () => {
        const id = "rapid-session";
        useSessionStore.getState().initSession(id, makeModule());

        for (let i = 0; i < 5; i++) {
            useSessionStore.getState().updateDraft(id, (draft) => {
                draft.metadata.name = `Edit ${i}`;
            });
        }

        const session = useSessionStore.getState().sessions[id];
        expect(session.history.past).toHaveLength(5);

        useSessionStore.getState().undo(id);
        const after = useSessionStore.getState().sessions[id];
        expect(after.draft.metadata.name).toBe("Edit 3");
        expect(after.history.past).toHaveLength(4);
    });
});
