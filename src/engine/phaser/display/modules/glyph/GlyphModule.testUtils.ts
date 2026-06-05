import type {
    GlyphConfig,
    GlyphPlacement,
    GlyphPulseConfig,
} from "../../../../../data/schemas/assets/GlyphTypes";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import { BLEND_MODE_NORMAL } from "../../blendModes";

export type FakeImage = {
    textureKey: string;
    tint: number;
    alpha: number;
    blendMode: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    visible: boolean;
    setTexture(k: string): FakeImage;
    setTint(t: number): FakeImage;
    setAlpha(a: number): FakeImage;
    setBlendMode(m: number): FakeImage;
    setPosition(x: number, y: number): FakeImage;
    setScale(s: number): FakeImage;
    setRotation(r: number): FakeImage;
    setVisible(v: boolean): FakeImage;
    clearTint(): FakeImage;
};

export type FakeContainer = {
    children: FakeImage[];
    add(img: FakeImage): void;
    remove(img: FakeImage): void;
};

export const makeFakeImage = (): FakeImage => ({
    textureKey: "",
    tint: 0,
    alpha: 1,
    blendMode: BLEND_MODE_NORMAL,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    visible: false,
    setTexture(k: string) {
        this.textureKey = k;
        return this;
    },
    setTint(t: number) {
        this.tint = t;
        return this;
    },
    setAlpha(a: number) {
        this.alpha = a;
        return this;
    },
    setBlendMode(m: number) {
        this.blendMode = m;
        return this;
    },
    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    },
    setScale(s: number) {
        this.scale = s;
        return this;
    },
    setRotation(r: number) {
        this.rotation = r;
        return this;
    },
    setVisible(v: boolean) {
        this.visible = v;
        return this;
    },
    clearTint() {
        this.tint = 0;
        return this;
    },
});

export const makeFakeContainer = (): FakeContainer => ({
    children: [],
    add(img: FakeImage) {
        this.children.push(img);
    },
    remove(img: FakeImage) {
        const idx = this.children.indexOf(img);
        if (idx !== -1) this.children.splice(idx, 1);
    },
});

export const makeFakePool = () => {
    const released: FakeImage[] = [];
    return {
        released,
        imagePool: {
            acquire: () => makeFakeImage(),
            release: (img: FakeImage) => {
                released.push(img);
            },
        },
    };
};

export const makeFakeTextureManager = () => ({
    getGlyphTexture: ({
        shape,
        color,
        thickness,
    }: {
        shape: string;
        color: string;
        thickness: number;
    }) => `${shape}:${color}:${thickness}`,
});

const makePulse = (): GlyphPulseConfig => ({
    distanceFromCenterMinFactor: 0.5,
    distanceFromCenterMaxFactor: 0.8,
    scalePulseMin: 1,
    scalePulseMax: 1,
    rotationDeltaMinDeg: 0,
    rotationDeltaMaxDeg: 0,
    delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
});

const makePlacement = (): GlyphPlacement => ({
    shape: "ring",
    position: 4,
    rotationDeg: 0,
    scale: 1,
    colorHex: "#ff0000",
});

export const makeTestGlyph = (numPlacements = 1): GlyphConfig => ({
    id: "test",
    placements: Array.from({ length: numPlacements }, makePlacement),
    pulse: makePulse(),
});

export const makeFakeRegistry = (g: GlyphConfig): GlyphRegistry =>
    ({
        get: () => g,
        getDefaultLineThickness: () => 10,
    }) as unknown as GlyphRegistry;
