// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { RuntimeShellCanvas } from "./RuntimeShellCanvas";

vi.mock("../../../engine/phaser/hooks/usePhaserGame", () => ({
    usePhaserGame: vi.fn(),
}));
vi.mock("../world/entity-state-link", () => ({
    EntityStateLinkProvider: ({ children }: any) => (
        <div data-testid="entity-state-link-provider">{children}</div>
    ),
}));
vi.mock("../world/SelectionOverlay", () => ({
    SelectionOverlay: () => <div />,
}));
vi.mock("../world/node-overlays", () => ({
    NodeOverlayViewport: () => <div data-testid="node-overlay-viewport" />,
    useNodeOverlaysEnabled: () => true,
}));
vi.mock("../draft", () => ({ DraftOverlay: () => <div /> }));
vi.mock("../dormancy", () => ({ DormancyOverlay: () => <div /> }));
vi.mock("../notifications/RuntimeNotificationViewport", () => ({
    RuntimeNotificationViewport: () => <div />,
}));
vi.mock("../status/CaveStatusNote", () => ({ CaveStatusNote: () => <div /> }));
vi.mock("../status/RuntimeClock", () => ({ RuntimeClock: () => <div /> }));
vi.mock("../modal-guidance/RuntimeModalGuidanceOverlay", () => ({
    RuntimeModalGuidanceOverlay: () => <div />,
}));
vi.mock("../inspector/RuntimeInspectorViewport", () => ({
    RuntimeInspectorViewport: () => <div />,
}));
vi.mock("../tutorials/useTutorialAttentionPlayback", () => ({
    useTutorialAttentionPlayback: () => undefined,
}));
vi.mock("../tutorials/useTutorialAttentionCameraFocus", () => ({
    useTutorialAttentionCameraFocus: () => undefined,
}));

afterEach(cleanup);

const runtime = { getState: () => ({ tick: 3 }), getEntities: () => [] } as any;

describe("RuntimeShellCanvas node overlays", () => {
    it("mounts node overlays inside the entity state provider for full chrome", () => {
        render(
            <ThemeProvider>
                <TestWorldInteractionProvider value={{ runtime }}>
                    <RuntimeShellCanvas />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        expect(
            within(
                screen.getByTestId("entity-state-link-provider"),
            ).getByTestId("node-overlay-viewport"),
        ).toBeDefined();
    });

    it("does not mount node overlays for minimal chrome", () => {
        render(
            <ThemeProvider>
                <TestWorldInteractionProvider value={{ runtime }}>
                    <RuntimeShellCanvas chrome="minimal" />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        expect(screen.queryByTestId("node-overlay-viewport")).toBeNull();
    });
});
