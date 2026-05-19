// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getPhaserDebugEnabled,
    setPhaserDebugEnabled,
} from "../engine/phaser/debug/phaserDebugToggle";
import { useAppShellStore } from "./useAppShellStore";
import { useShellHotkeys } from "./useShellHotkeys";

const toggleEditorMock = vi.hoisted(() => vi.fn());
const playMock = vi.hoisted(() => vi.fn());
const pauseMock = vi.hoisted(() => vi.fn());

vi.mock("../ui/devtools/shell/shell", () => ({
    useShellStore: {
        getState: () => ({ toggleEditor: toggleEditorMock }),
    },
}));

vi.mock("../ui/runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: {
        getState: () => ({ pause: pauseMock, play: playMock }),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    setPhaserDebugEnabled(false);
    useAppShellStore.setState({
        errorText: null,
        hasActiveGameSession: false,
        menuOrigin: "boot",
        overlay: "none",
        surface: "game",
    });
});

afterEach(cleanup);

describe("useShellHotkeys", () => {
    it("toggles devtools closed with the backquote hotkey", () => {
        useAppShellStore.setState({
            menuOrigin: "devtools",
            surface: "devtools",
        });
        const { unmount } = renderHook(() => useShellHotkeys());
        globalThis.dispatchEvent(
            new KeyboardEvent("keydown", { code: "Backquote" }),
        );
        expect(toggleEditorMock).toHaveBeenCalledWith(false);
        expect(useAppShellStore.getState().overlay).toBe("main-menu");
        unmount();
    });

    it("returns from the menu to the game on escape when the menu came from gameplay", () => {
        useAppShellStore.setState({
            menuOrigin: "game",
            overlay: "main-menu",
            surface: "game",
        });
        const { unmount } = renderHook(() => useShellHotkeys());
        globalThis.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape" }),
        );
        expect(playMock).toHaveBeenCalled();
        expect(useAppShellStore.getState().overlay).toBe("none");
        unmount();
    });

    it("toggles debug stats with cmd-shift-space", () => {
        const { unmount } = renderHook(() => useShellHotkeys());
        globalThis.dispatchEvent(
            new KeyboardEvent("keydown", {
                code: "Space",
                metaKey: true,
                shiftKey: true,
            }),
        );
        expect(getPhaserDebugEnabled()).toBe(true);
        unmount();
    });
});
