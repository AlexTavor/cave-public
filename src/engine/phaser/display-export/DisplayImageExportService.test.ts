// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
    resolveDisplayImageSpec: vi.fn(),
    renderAttributeDisplayImage: vi.fn(),
    renderBodyAvatarImage: vi.fn(),
    renderResolvedDisplayImage: vi.fn(),
}));

vi.mock("./resolveDisplayImageSpec", () => ({
    resolveDisplayImageSpec: mocks.resolveDisplayImageSpec,
}));
vi.mock("./renderAttributeDisplayImage", () => ({
    renderAttributeDisplayImage: mocks.renderAttributeDisplayImage,
}));
vi.mock("./renderBodyAvatarImage", () => ({
    renderBodyAvatarImage: mocks.renderBodyAvatarImage,
}));
vi.mock("./renderResolvedDisplayImage", () => ({
    renderResolvedDisplayImage: mocks.renderResolvedDisplayImage,
}));

import { DisplayImageExportService } from "./DisplayImageExportService";

const scene = {
    avatarRegistry: { syncEpoch: vi.fn() },
    glyphRegistry: { syncEpoch: vi.fn() },
} as any;
const appearance = {
    appearanceKey: "a",
    faceShapeIndex: 0,
    hairShapeIndex: 0,
    eyeShapeIndex: 0,
    eyeOffsetY: 0,
    eyeSpacing: 12,
    eyeScaleX: 1,
    eyeScaleY: 1,
    blinkIntervalMs: 1000,
    blinkDurationMs: 120,
    blinkPhaseMs: 0,
} as const;

beforeEach(() => {
    mocks.resolveDisplayImageSpec.mockReset().mockImplementation((request) => {
        if (request.displayKey === "bad_key") {
            throw new Error("unsupported");
        }
        return request;
    });
    mocks.renderAttributeDisplayImage.mockReset().mockReturnValue("attr-url");
    mocks.renderBodyAvatarImage.mockReset().mockReturnValue("avatar-url");
    mocks.renderResolvedDisplayImage.mockReset().mockReturnValue("display-url");
});

describe("DisplayImageExportService", () => {
    it("caches static and body avatar requests", async () => {
        const avatarRequest = {
            kind: "body_avatar",
            subjectSeed: "body-1",
            glyphKey: null,
            appearance,
            glyphs: {},
            renderSeed: "seed-1",
        } as const;
        const service = new DisplayImageExportService(scene);
        await service.getImageUrl({
            kind: "attribute_display",
            displayKey: "attr_body",
        });
        await service.getImageUrl({
            kind: "attribute_display",
            displayKey: "attr_body",
        });
        await service.getImageUrl(avatarRequest);
        await service.getImageUrl(avatarRequest);
        expect(mocks.renderAttributeDisplayImage).toHaveBeenCalledTimes(1);
        expect(mocks.renderBodyAvatarImage).toHaveBeenCalledTimes(1);
    });

    it("deduplicates in-flight requests and clears instance-local cache", async () => {
        mocks.renderAttributeDisplayImage.mockReturnValue("attr-url");
        const service = new DisplayImageExportService(scene);
        await Promise.all([
            service.getImageUrl({
                kind: "attribute_display",
                displayKey: "attr_mind",
            }),
            service.getImageUrl({
                kind: "attribute_display",
                displayKey: "attr_mind",
            }),
        ]);
        service.clear();
        await service.getImageUrl({
            kind: "attribute_display",
            displayKey: "attr_mind",
        });
        expect(mocks.renderAttributeDisplayImage).toHaveBeenCalledTimes(2);
    });

    it("fails for malformed requests and unsupported keys", async () => {
        const service = new DisplayImageExportService(scene);
        await expect(
            service.getImageUrl({
                kind: "body_avatar",
                subjectSeed: "",
                renderSeed: "x",
            } as any),
        ).rejects.toThrow(/subject seed/i);
        await expect(
            service.getImageUrl({
                kind: "attribute_display",
                displayKey: "bad_key" as any,
            }),
        ).rejects.toThrow(/unsupported/i);
    });
});
