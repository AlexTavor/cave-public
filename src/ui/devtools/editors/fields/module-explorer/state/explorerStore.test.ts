import { describe, it, expect, beforeEach } from "vitest";
import { useExplorerStore } from "./explorerStore";

const BLUEPRINT_SESSION = "list::game.json::blueprints";
const ASSET_SESSION = "list::game.json::assets::displays";

describe("explorerStore", () => {
    beforeEach(() => {
        useExplorerStore.setState({ sessions: {} });
    });

    it("keeps list sessions isolated", () => {
        const { initSession, setFilter } = useExplorerStore.getState().actions;

        initSession(BLUEPRINT_SESSION);
        initSession(ASSET_SESSION);

        setFilter(BLUEPRINT_SESSION, "boss");

        const state = useExplorerStore.getState();
        expect(state.sessions[BLUEPRINT_SESSION].filter).toBe("boss");
        expect(state.sessions[ASSET_SESSION].filter).toBe("");
    });
});

