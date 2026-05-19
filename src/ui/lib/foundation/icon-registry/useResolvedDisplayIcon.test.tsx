// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { workspaceService } from "../../../../engine/terminal/commands/projectServices";
import { useModuleStore } from "../../../devtools/state/moduleStore";
import { useSessionStore } from "../../../devtools/state/useSessionStore";
import { useShellStore } from "../../../devtools/shell/shell";
import { useRuntimeStore } from "../../../runtime/state/useRuntimeStore";
import { useResolvedDisplayIcon } from "./useResolvedDisplayIcon";

const CYCLE_PROGRESS_STYLE = {
    cycleProgress: { family: "circle", familyRotationDeg: 0, color: "#fff" },
};
const DISPLAY_SETTINGS = { background: {}, vein_network: {} };
const makeResourceDisplay = (id: string) => ({
    type: "resource",
    styleId: id,
    glyphKey: id,
});

const { mockUseDisplayImageUrl } = vi.hoisted(() => ({
    mockUseDisplayImageUrl: vi.fn(() => ({ url: null, status: "idle" })),
}));

vi.mock("../../../runtime/world/display-images/useDisplayImageUrl", () => ({
    useDisplayImageUrl: mockUseDisplayImageUrl,
}));

describe("useResolvedDisplayIcon", () => {
    beforeEach(() => {
        useShellStore.setState({
            activeManifestPath: null,
            activeModuleFilename: "mod.art",
        } as never);
        useRuntimeStore.setState({ runtime: null } as never);
        useSessionStore.setState({ sessions: {} });
        useModuleStore.setState({
            modules: {},
            loading: {},
            loadOrder: [],
        } as never);
        workspaceService.activeCartridge = null as never;
        mockUseDisplayImageUrl.mockClear();
    });

    it("builds a resolved display request from the active module session", () => {
        useSessionStore.getState().initSession("mod.art", {
            metadata: { id: "mod.art", name: "mod", version: "0.0.1" },
            assets: {
                displays: { wood: makeResourceDisplay("wood") },
                styles: { wood: CYCLE_PROGRESS_STYLE },
                settings: DISPLAY_SETTINGS,
            },
            blueprints: {},
        } as never);

        const { result } = renderHook(() => useResolvedDisplayIcon("wood"));

        expect(result.current.request).toMatchObject({
            kind: "resolved_display",
            displayKey: "wood",
            glyphKey: "wood",
        });
    });

    it("falls back to blueprint export requests for blueprint ids", () => {
        useModuleStore.setState({
            modules: {
                mod: {
                    blueprints: {
                        worker: {
                            id: "worker",
                            components: {
                                display: {
                                    display_key: "worker_display",
                                    label: "Worker",
                                },
                            },
                        },
                    },
                    assets: {
                        displays: { worker_display: { type: "body" } },
                        settings: DISPLAY_SETTINGS,
                    },
                },
            },
            loading: {},
            loadOrder: [],
        } as never);

        const { result } = renderHook(() => useResolvedDisplayIcon("worker"));

        expect(result.current.request).toMatchObject({
            kind: "resolved_display",
            displayKey: "worker_display",
        });
    });

    it("resolves icons from the linked workspace cartridge", () => {
        useShellStore.setState({
            activeManifestPath: "manifest.json",
        } as never);
        workspaceService.activeCartridge = {
            blueprints: {},
            assets: {
                displays: { coin: makeResourceDisplay("coin") },
                styles: { coin: CYCLE_PROGRESS_STYLE },
                settings: DISPLAY_SETTINGS,
            },
        } as never;

        const { result } = renderHook(() => useResolvedDisplayIcon("coin"));

        expect(result.current.request).toMatchObject({
            kind: "resolved_display",
            displayKey: "coin",
        });
    });
});
