import { describe, it, expect, beforeEach } from "vitest";
import { useTerminalStore } from "./useTerminalStore";

describe("useTerminalStore", () => {
    beforeEach(() => {
        useTerminalStore.setState({
            logs: [],
            input: "",
            commandHistory: [],
            historyIndex: -1,
            suppressAutocomplete: false,
        });
    });

    it("initializes a session correctly", () => {
        const state = useTerminalStore.getState();
        expect(state.logs).toEqual([]);
        expect(state.input).toBe("");
        expect(state.suppressAutocomplete).toBe(false);
    });

    it("updates input value and resets suppression", () => {
        // First set suppression to true manually to test the reset
        useTerminalStore.setState({ suppressAutocomplete: true });

        useTerminalStore.getState().setInputValue("test");

        const state = useTerminalStore.getState();
        expect(state.input).toBe("test");
        expect(state.suppressAutocomplete).toBe(false);
    });

    it("traverses history and sets suppression", () => {
        useTerminalStore.setState({ commandHistory: ["cmd1", "cmd2"] });

        // Go Up (to "cmd1")
        useTerminalStore.getState().traverseHistory("up");
        let state = useTerminalStore.getState();
        expect(state.input).toBe("cmd1");
        expect(state.suppressAutocomplete).toBe(true);

        // Go Up (to "cmd2")
        useTerminalStore.getState().traverseHistory("up");
        state = useTerminalStore.getState();
        expect(state.input).toBe("cmd2");
        expect(state.suppressAutocomplete).toBe(true);

        // Go Down (back to "cmd1")
        useTerminalStore.getState().traverseHistory("down");
        state = useTerminalStore.getState();
        expect(state.input).toBe("cmd1");
        expect(state.suppressAutocomplete).toBe(true);
    });

    it("resets suppression after typing", () => {
        useTerminalStore.setState({ commandHistory: ["cmd1"] });

        // 1. Navigate history (suppressed)
        useTerminalStore.getState().traverseHistory("up");
        expect(useTerminalStore.getState().suppressAutocomplete).toBe(true);

        // 2. Type characters (unsuppressed)
        useTerminalStore.getState().setInputValue("cmd1 modified");
        expect(useTerminalStore.getState().suppressAutocomplete).toBe(false);
    });

    it("resets suppression on submit", async () => {
        useTerminalStore.setState({ suppressAutocomplete: true });
        const registryMock = {
            execute: async () => ({ type: "success", content: "ok" }),
        } as any;

        await useTerminalStore.getState().submitCommand("test", registryMock);

        expect(useTerminalStore.getState().suppressAutocomplete).toBe(false);
    });
});
