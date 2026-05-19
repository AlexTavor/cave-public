// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./hooks/useSyncActiveTabToShellPath", () => ({
    useSyncActiveTabToShellPath: vi.fn(),
}));
vi.mock("./hooks/useRestoreProject", () => ({ useRestoreProject: vi.fn() }));
vi.mock("./shell", () => ({
    useShellStore: (selector: (state: any) => unknown) =>
        selector({
            activeModuleFilename: null,
            isLayoutMode: false,
            layoutTargetFilename: null,
            isTextsMode: true,
            textsTargetManifestPath: "project/manifest.json",
        }),
}));
vi.mock("../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(() => ({
        isReady: true,
        isInitializing: false,
    })),
}));
vi.mock("../layout/LayoutEditor", () => ({
    LayoutEditor: () => <div>layout</div>,
}));
vi.mock("./WindowManager", () => ({
    WindowManager: () => <div>window-manager</div>,
}));
vi.mock("../texts/TextsEditor", () => ({
    TextsEditor: () => <div>texts-editor</div>,
}));
vi.mock("./overlays/LayoutGhostLayer.tsx", () => ({
    LayoutGhostLayer: () => null,
}));
vi.mock("../toast/ToastViewport", () => ({
    ToastViewport: () => <div>toast</div>,
}));
vi.mock("../../lib/foundation/portal-manager/Portal", () => ({
    Portal: ({ children }: any) => <>{children}</>,
}));

import { EditorShell } from "./EditorShell";

describe("EditorShell texts mode", () => {
    it("renders TextsEditor instead of the window manager", () => {
        render(<EditorShell />);
        expect(screen.getByText("texts-editor")).toBeDefined();
        expect(screen.queryByText("window-manager")).toBeNull();
    });
});
