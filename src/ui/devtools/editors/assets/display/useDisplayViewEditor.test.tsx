/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "../../../state/useSessionStore";
import { createAssetScopeId } from "../../../state/moduleSession/scopes";
import { useDisplayViewEditor } from "./useDisplayViewEditor";

describe("useDisplayViewEditor", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
    });

    it("exposes cycle progress controls for attribute-pool displays", async () => {
        useSessionStore.getState().initSession("mod.art", {
            metadata: { id: "mod.art", name: "mod", version: "0.0.1" },
            assets: {
                displays: {
                    focus: { type: "attribute_pool", attribute: "mind" },
                },
                styles: {},
                glyphs: {},
                settings: {
                    background: {},
                    vein_network: {
                        colors: {
                            base_body: "#111",
                            base_mind: "#222",
                            base_social: "#333",
                        },
                    },
                },
            },
            blueprints: {},
        } as never);
        useSessionStore
            .getState()
            .updateSessionUi(
                "mod.art",
                createAssetScopeId("displays", "focus"),
                (ui) => {
                    ui.isVisualsOpen = true;
                },
            );

        const { result } = renderHook(() =>
            useDisplayViewEditor({ filename: "mod.art", assetId: "focus" }),
        );

        await waitFor(() =>
            expect(result.current?.cycleProgress).not.toBeNull(),
        );
        expect(result.current?.preview).toEqual({
            kind: "display_icon",
            filename: "mod.art",
            displayKey: "focus",
        });
        expect(result.current?.cycleProgress?.previewProgress).toBe(100);
        act(() => result.current?.cycleProgress?.updatePreviewProgress?.(25));
        expect(result.current?.cycleProgress?.previewProgress).toBe(25);
        expect(
            useSessionStore.getState().sessions["mod.art"]?.draft.assets.styles
                ?.focus,
        ).toBeTruthy();
    });
});
