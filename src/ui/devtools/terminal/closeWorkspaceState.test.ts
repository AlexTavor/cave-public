// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    closeWorkspaceState,
    resetModuleEditorState,
} from "./closeWorkspaceState";
import { useShellStore } from "../shell/shell";
import { useSessionStore } from "../state/useSessionStore";
import { useModuleStore } from "../state/moduleStore";
import { useLayoutStore } from "../state/useLayoutStore";

describe("closeWorkspaceState", () => {
    beforeEach(() => {
        useShellStore.setState({
            activeFilePath: "scripts/init.cvs",
            activeModuleFilename: "cave_roguelite_gdd_v2/manifest.json",
            tabTitles: { one: "One" },
        } as any);
        useSessionStore.setState({ sessions: { one: {} as any } });
        useModuleStore.setState({
            modules: { one: {} as any },
            indexes: { one: {} as any },
            loading: { one: true },
            loadOrder: ["one"],
        } as any);
        useLayoutStore.setState({
            activeTabId: "file:scripts%2Finit.cvs",
        } as any);
        localStorage.setItem("cave.moduleDraft:one", "{}");
        localStorage.setItem("other.key", "keep");
        sessionStorage.setItem("cave.sessionUi:one", "{}");
    });

    it("clears in-memory and persisted unsaved workspace state", () => {
        const unload = vi.fn();

        closeWorkspaceState(unload);

        expect(unload).toHaveBeenCalledTimes(1);
        expect(useShellStore.getState().activeFilePath).toBeNull();
        expect(useShellStore.getState().activeModuleFilename).toBeNull();
        expect(useSessionStore.getState().sessions).toEqual({});
        expect(useModuleStore.getState().modules).toEqual({});
        expect(useLayoutStore.getState().activeTabId).toBeNull();
        expect(localStorage.getItem("cave.moduleDraft:one")).toBeNull();
        expect(localStorage.getItem("other.key")).toBe("keep");
        expect(sessionStorage.getItem("cave.sessionUi:one")).toBeNull();
    });

    it("resets module editor state for project-load without clearing shell", () => {
        resetModuleEditorState();

        expect(useSessionStore.getState().sessions).toEqual({});
        expect(useModuleStore.getState().modules).toEqual({});
        expect(localStorage.getItem("cave.moduleDraft:one")).toBeNull();
        expect(sessionStorage.getItem("cave.sessionUi:one")).toBeNull();
        expect(useShellStore.getState().activeFilePath).toBe(
            "scripts/init.cvs",
        );
        expect(useShellStore.getState().activeModuleFilename).toBe(
            "cave_roguelite_gdd_v2/manifest.json",
        );
    });
});
