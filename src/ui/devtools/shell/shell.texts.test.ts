// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useShellStore } from "./shell";

describe("shell texts mode", () => {
    beforeEach(() => {
        useShellStore.setState({
            isTextsMode: false,
            textsTargetManifestPath: null,
            activeManifestPath: "project/manifest.json",
        });
    });

    it("toggles texts mode on and off", () => {
        useShellStore.getState().toggleTextsMode(true, "project/manifest.json");
        expect(useShellStore.getState().isTextsMode).toBe(true);
        expect(useShellStore.getState().textsTargetManifestPath).toBe(
            "project/manifest.json",
        );
        useShellStore.getState().toggleTextsMode(false);
        expect(useShellStore.getState().isTextsMode).toBe(false);
        expect(useShellStore.getState().textsTargetManifestPath).toBeNull();
    });

    it("does not persist texts mode state", () => {
        useShellStore.getState().toggleTextsMode(true, "project/manifest.json");
        const persisted = JSON.parse(
            localStorage.getItem("cave-os-shell-storage") ?? "{}",
        );
        expect(persisted.state?.isTextsMode).toBeUndefined();
        expect(persisted.state?.textsTargetManifestPath).toBeUndefined();
    });
});
