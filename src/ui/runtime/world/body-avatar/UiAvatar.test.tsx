// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBodyAvatarCacheKey } from "../../../../engine/phaser/display-export/buildDisplayImageCacheKey";
import { useDisplayImageExportStore } from "../../state/useDisplayImageExportStore";
import { useRuntimeStore } from "../../state/useRuntimeStore";
import { useUiAvatarStore } from "../../state/useUiAvatarStore";
import { UiAvatar } from "./UiAvatar";

vi.mock(
    "../../../../engine/phaser/display-export/buildBodyAvatarImageRequest",
    () => ({
        buildBodyAvatarImageRequest: ({
            subjectId,
        }: {
            subjectId: string;
        }) => ({
            kind: "body_avatar",
            subjectSeed: `subject:${subjectId}`,
            glyphKey: null,
            appearance: {},
            glyphs: null,
            renderSeed: "render:1",
        }),
    }),
);
vi.mock("../../../lib/atoms/game-icon/GameIcon", () => ({
    GameIcon: ({ id }: { id: string }) => <span aria-label={id} />,
}));

const requestKey = (subjectId: string) =>
    buildBodyAvatarCacheKey({
        kind: "body_avatar",
        subjectSeed: `subject:${subjectId}`,
        glyphKey: null,
        appearance: {},
        glyphs: null,
        renderSeed: "render:1",
    } as any);

afterEach(() => {
    cleanup();
    useUiAvatarStore.getState().clear();
    useDisplayImageExportStore.getState().clear();
    useRuntimeStore.setState({ runtime: null } as never);
    vi.restoreAllMocks();
});

describe("UiAvatar", () => {
    it("renders a cached avatar image without requesting it again", () => {
        const service = { getImageUrl: vi.fn(), clear: vi.fn() };
        useRuntimeStore.setState({
            runtime: { getEntity: () => null },
        } as never);
        useDisplayImageExportStore.getState().setService(service as any);
        useUiAvatarStore
            .getState()
            .setReady(requestKey("body-1"), "cached://avatar");
        const view = render(
            <UiAvatar subjectId="body-1" fallbackIconId="worker" />,
        );

        expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
            "cached://avatar",
        );
        expect(service.getImageUrl).not.toHaveBeenCalled();
    });

    it("stores and renders a resolved avatar url", async () => {
        const service = {
            getImageUrl: vi.fn().mockResolvedValue("ready://avatar"),
            clear: vi.fn(),
        };
        useRuntimeStore.setState({
            runtime: { getEntity: () => null },
        } as never);
        useDisplayImageExportStore.getState().setService(service as any);
        const view = render(
            <UiAvatar subjectId="body-1" fallbackIconId="worker" />,
        );

        await waitFor(() => {
            expect(
                view.container.querySelector("img")?.getAttribute("src"),
            ).toBe("ready://avatar");
        });
        expect(
            useUiAvatarStore.getState().entries[requestKey("body-1")],
        ).toEqual({ status: "ready", url: "ready://avatar" });
    });

    it("stores an error result and falls back to the icon", async () => {
        const service = {
            getImageUrl: vi.fn().mockRejectedValue(new Error("fail")),
            clear: vi.fn(),
        };
        useRuntimeStore.setState({
            runtime: { getEntity: () => null },
        } as never);
        useDisplayImageExportStore.getState().setService(service as any);
        render(<UiAvatar subjectId="body-1" fallbackIconId="worker" />);

        await waitFor(() =>
            expect(screen.getAllByLabelText("worker").length).toBeGreaterThan(
                0,
            ),
        );
        expect(
            useUiAvatarStore.getState().entries[requestKey("body-1")],
        ).toEqual({ status: "error", url: null });
    });
});
