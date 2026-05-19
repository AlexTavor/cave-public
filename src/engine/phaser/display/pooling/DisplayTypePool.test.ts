import { describe, it, expect } from "vitest";
import { DisplayTypePool } from "./DisplayTypePool";
import { BLEND_MODE_ADD, BLEND_MODE_NORMAL } from "../blendModes";

interface FakeImage {
    x: number;
    y: number;
    visible: boolean;
    alpha: number;
    scale: number;
    rotation: number;
    flipX: boolean;
    tint: number | null;
    blendMode: number;
    setPosition(x: number, y: number): void;
    setVisible(v: boolean): void;
    setAlpha(a: number): void;
    setScale(s: number): void;
    setRotation(r: number): void;
    setFlipX(v: boolean): void;
    clearTint(): void;
    setBlendMode(mode: number): void;
}

const makeFakeImage = (blendMode = BLEND_MODE_NORMAL): FakeImage => ({
    x: 99,
    y: 99,
    visible: true,
    alpha: 0,
    scale: 0,
    rotation: 99,
    flipX: true,
    tint: 999,
    blendMode,
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    },
    setVisible(v) {
        this.visible = v;
    },
    setAlpha(a) {
        this.alpha = a;
    },
    setScale(s) {
        this.scale = s;
    },
    setRotation(r) {
        this.rotation = r;
    },
    setFlipX(v) {
        this.flipX = v;
    },
    clearTint() {
        this.tint = null;
    },
    setBlendMode(mode) {
        this.blendMode = mode;
    },
});

describe("DisplayTypePool – imagePool reset contract", () => {
    it("resets blendMode to NORMAL when releasing an ADD-mode image", () => {
        // Given
        const pool = new DisplayTypePool("test");
        const fakeImg = makeFakeImage(BLEND_MODE_ADD);
        // When
        pool.imagePool.release(fakeImg as unknown as Phaser.GameObjects.Image);
        // Then
        expect(fakeImg.blendMode).toBe(BLEND_MODE_NORMAL);
    });

    it("applies all documented reset fields", () => {
        // Given
        const pool = new DisplayTypePool("test");
        const fakeImg = makeFakeImage(BLEND_MODE_ADD);
        // When
        pool.imagePool.release(fakeImg as unknown as Phaser.GameObjects.Image);
        // Then — all documented reset fields are applied
        expect(fakeImg.x).toBe(0);
        expect(fakeImg.y).toBe(0);
        expect(fakeImg.visible).toBe(false);
        expect(fakeImg.alpha).toBe(1);
        expect(fakeImg.scale).toBe(1);
        expect(fakeImg.rotation).toBe(0);
        expect(fakeImg.flipX).toBe(false);
        expect(fakeImg.tint).toBeNull();
        expect(fakeImg.blendMode).toBe(BLEND_MODE_NORMAL);
    });
});
