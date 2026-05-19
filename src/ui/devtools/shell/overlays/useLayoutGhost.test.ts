// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useLayoutGhost, LAYOUT_GHOST_TIMEOUT_MS } from "./useLayoutGhost";
import { useSessionStore } from "../../state/useSessionStore";
import { useShellStore } from "../shell";
import {
    createBlueprint,
    createCartridge,
} from "../../../../engine/test/factories";

const filename = "test-module";
const blueprintId = "ghost";
const SESSION_ID = `${filename}::blueprints::${blueprintId}`;

const makeDraft = () =>
    createCartridge(filename, {
        blueprints: {
            [blueprintId]: createBlueprint(blueprintId, {
                components: {
                    physics: {
                        x: 25,
                        y: 40,
                        radius: 18,
                        mass: 1,
                        drag: 0.1,
                        isStatic: false,
                    },
                },
            }),
        },
    });

afterEach(() => {
    useSessionStore.setState({ sessions: {} });
    useShellStore.setState({
        activeFilePath: null,
        activeModuleFilename: null,
    });
    vi.useRealTimers();
});

describe("useLayoutGhost", () => {
    it("shows visibility when layout changes", () => {
        act(() => {
            useSessionStore.getState().initSession(filename, makeDraft());
            useShellStore.getState().openFile(SESSION_ID);
        });

        const { result } = renderHook(() => useLayoutGhost());

        expect(result.current.visible).toBe(true);

        expect(result.current.x).toBe(25);
        expect(result.current.y).toBe(40);
        expect(result.current.radius).toBe(18);
    });

    it("hides after timeout", () => {
        vi.useFakeTimers();

        act(() => {
            useSessionStore.getState().initSession(filename, makeDraft());
            useShellStore.getState().openFile(SESSION_ID);
        });

        const { result } = renderHook(() => useLayoutGhost());

        expect(result.current.visible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(LAYOUT_GHOST_TIMEOUT_MS + 1);
            vi.runOnlyPendingTimers();
        });

        expect(result.current.visible).toBe(false);
    });

    it("handles invalid layout data gracefully", () => {
        const badDraft = createCartridge(filename, {
            blueprints: {
                [blueprintId]: createBlueprint(blueprintId, {
                    components: {
                        physics: {
                            x: "invalid" as unknown as number,
                            y: 0,
                            radius: 10,
                            mass: 1,
                            drag: 0.1,
                            isStatic: false,
                        },
                    },
                }),
            },
        });

        act(() => {
            useSessionStore.getState().initSession(filename, badDraft);
            useShellStore.getState().openFile(SESSION_ID);
        });

        const { result } = renderHook(() => useLayoutGhost());

        expect(result.current.visible).toBe(false);
        expect(result.current.radius).toBe(0);
    });
});
