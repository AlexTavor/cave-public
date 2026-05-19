// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { useUiAvatarStore } from "./useUiAvatarStore";

describe("useUiAvatarStore", () => {
    it("stores ready and error entries and clears them", () => {
        useUiAvatarStore.getState().clear();
        useUiAvatarStore.getState().setReady("a", "url://a");
        expect(useUiAvatarStore.getState().entries.a).toEqual({
            status: "ready",
            url: "url://a",
        });
        useUiAvatarStore.getState().setError("b");
        expect(useUiAvatarStore.getState().entries.b).toEqual({
            status: "error",
            url: null,
        });
        useUiAvatarStore.getState().clear();
        expect(useUiAvatarStore.getState().entries).toEqual({});
    });
});
