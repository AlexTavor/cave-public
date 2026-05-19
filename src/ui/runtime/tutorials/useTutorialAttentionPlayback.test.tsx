// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useTutorialAttentionPlayback } from "./useTutorialAttentionPlayback";

const attentionRef = vi.hoisted(() => ({ current: null as any }));

vi.mock("../attention/useActiveRuntimeAttention", () => ({
    useActiveRuntimeAttention: () => attentionRef.current,
}));

describe("useTutorialAttentionPlayback", () => {
    beforeEach(() => {
        attentionRef.current = null;
        useRuntimeStore.setState({
            runtime: { id: "runtime-a" } as any,
            status: "running",
            play: vi.fn(),
            pause: vi.fn(),
        });
    });

    it("pauses and resumes only when the hook owns the pause", () => {
        const { rerender } = renderHook(() => useTutorialAttentionPlayback());
        attentionRef.current = { pauseGame: true };
        rerender();
        expect(useRuntimeStore.getState().pause).toHaveBeenCalledTimes(1);
        attentionRef.current = { pauseGame: false };
        useRuntimeStore.setState({ status: "paused" });
        rerender();
        expect(useRuntimeStore.getState().play).toHaveBeenCalledTimes(1);
    });

    it("does not claim or resume an already-paused runtime and clears on replacement", () => {
        useRuntimeStore.setState({ status: "paused" });
        const { rerender } = renderHook(() => useTutorialAttentionPlayback());
        attentionRef.current = { pauseGame: true };
        rerender();
        attentionRef.current = { pauseGame: false };
        useRuntimeStore.setState({ runtime: { id: "runtime-b" } as any });
        rerender();
        expect(useRuntimeStore.getState().pause).not.toHaveBeenCalled();
        expect(useRuntimeStore.getState().play).not.toHaveBeenCalled();
    });
});
