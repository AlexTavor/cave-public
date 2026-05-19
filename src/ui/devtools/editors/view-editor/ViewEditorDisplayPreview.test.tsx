/** @vitest-environment jsdom */
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { useModuleStore } from "../../state/moduleStore";
import { useSessionStore } from "../../state/useSessionStore";
import { ViewEditorDisplayPreview } from "./ViewEditorDisplayPreview";

const { mockCreateDisplayAssetPreviewRuntime } = vi.hoisted(() => ({
    mockCreateDisplayAssetPreviewRuntime: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock("./createDisplayAssetPreviewRuntime", () => ({
    createDisplayAssetPreviewRuntime: mockCreateDisplayAssetPreviewRuntime,
}));
vi.mock("../../layout/useLayoutEditorTicker", () => ({
    useLayoutEditorTicker: vi.fn(),
}));
vi.mock("../../layout/context/LayoutWorldAdapter", () => ({
    LayoutWorldAdapter: ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
    ),
}));
vi.mock("../../layout/LayoutRuntimeCanvas", () => ({
    LayoutRuntimeCanvas: () => <div>runtime-canvas</div>,
}));

describe("ViewEditorDisplayPreview", () => {
    beforeEach(() => {
        useModuleStore.setState({
            modules: {},
            loading: {},
            loadOrder: [],
        } as never);
        useSessionStore.setState({ sessions: {} });
        mockCreateDisplayAssetPreviewRuntime.mockClear();
        useSessionStore.getState().initSession("mod.art", {
            metadata: { id: "mod.art", name: "mod", version: "0.0.1" },
            assets: {
                displays: {
                    torch: {
                        type: "resource",
                        styleId: "ember",
                        glyphKey: "flame",
                    },
                },
                styles: {
                    ember: {
                        cycleProgress: {
                            family: "circle",
                            familyRotationDeg: 0,
                            color: "#200",
                        },
                    },
                },
                glyphs: {},
                settings: { background: {}, vein_network: {} },
            },
            blueprints: {},
        } as never);
    });

    const readLastCall = () =>
        mockCreateDisplayAssetPreviewRuntime.mock.calls.at(-1) as
            | [
                  {
                      assets?: {
                          styles?: {
                              ember?: { cycleProgress?: { color?: string } };
                          };
                      };
                  },
                  unknown,
                  number,
              ]
            | undefined;

    const readLastColor = () =>
        readLastCall()?.[0].assets?.styles?.ember?.cycleProgress?.color;

    const readLastPreviewProgress = () => readLastCall()?.[2];

    it("rebuilds the live preview runtime when the display draft changes", async () => {
        render(
            <ThemeProvider>
                <ViewEditorDisplayPreview
                    cycleProgressPreview={25}
                    filename="mod.art"
                    displayKey="torch"
                />
            </ThemeProvider>,
        );
        await waitFor(() => {
            expect(readLastColor()).toBe("#200");
            expect(readLastPreviewProgress()).toBe(25);
        });

        act(() => {
            useSessionStore.getState().updateDraft("mod.art", (draft) => {
                draft.assets.styles ??= {};
                draft.assets.styles.ember.cycleProgress ??= {
                    family: "circle",
                    familyRotationDeg: 0,
                    color: "#200",
                };
                draft.assets.styles.ember.cycleProgress.color = "#3ab";
            });
        });

        await waitFor(() => {
            expect(readLastColor()).toBe("#3ab");
        });
    });
});
