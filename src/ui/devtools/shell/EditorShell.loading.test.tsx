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
            activeModuleFilename: "game_data.json",
            isLayoutMode: false,
            layoutTargetFilename: null,
        }),
}));
vi.mock("../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(() => ({
        isReady: false,
        isInitializing: true,
    })),
}));
vi.mock("./WindowManager", () => ({
    WindowManager: () => <div>window-manager</div>,
}));
vi.mock("../layout/LayoutEditor", () => ({
    LayoutEditor: () => <div>layout</div>,
}));
vi.mock("./overlays/LayoutGhostLayer.tsx", () => ({
    LayoutGhostLayer: () => <div>ghost</div>,
}));
vi.mock("../toast/ToastViewport", () => ({
    ToastViewport: () => <div>toast</div>,
}));
vi.mock("../../lib/foundation/portal-manager/Portal", () => ({
    Portal: ({ children }: any) => <>{children}</>,
}));

import { EditorShell } from "./EditorShell";

describe("EditorShell loading", () => {
    it("renders a shell loading screen while session hydration is in flight", () => {
        render(<EditorShell />);
        expect(screen.getByText("Loading DevTools session...")).toBeDefined();
        expect(screen.queryByText("window-manager")).toBeNull();
    });
});
