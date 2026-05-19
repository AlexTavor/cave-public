import type { GlyphConfig } from "./GlyphTypes";
import { MAX_GLYPH_CAPACITY } from "./GlyphTypes";
import { generateGlyph } from "./GlyphGenerator";
import type { GlyphConfigWithoutId } from "./GlyphGenerator";
import { buildAttributePoolGlyph } from "./glyphDisplayDefaults";
import { parsePresets } from "./GlyphPresetParser";
import {
    computeDelaySignature,
    serializeDelaySignature,
} from "./glyphDelaySignature";

export class GlyphRegistry {
    private readonly cache = new Map<string, GlyphConfig>();
    private presets = new Map<string, GlyphConfigWithoutId>();
    private reservedDelaySigs = new Set<string>();
    private nextOrdinal = 0;
    private currentSeed = "";
    private currentPresetSig = "";
    private defaultLineThickness = 10;
    private lastPresetsRaw: unknown;

    public syncEpoch(
        seed: string,
        presetsRaw: unknown,
        settingsRaw?: unknown,
    ): void {
        const nextThickness = this.readDefaultLineThickness(settingsRaw);
        const sameSeed = seed === this.currentSeed;
        const samePresets = presetsRaw === this.lastPresetsRaw;
        if (
            sameSeed &&
            samePresets &&
            nextThickness === this.defaultLineThickness
        ) {
            return;
        }
        if (!sameSeed || !samePresets) {
            const parsed = parsePresets(presetsRaw);
            this.currentPresetSig = parsed.signature;
            this.presets = parsed.presetsByKey;
            this.reservedDelaySigs = parsed.reservedDelaySignatures;
            this.lastPresetsRaw = presetsRaw;
        }
        this.currentSeed = seed;
        this.defaultLineThickness = nextThickness;
        this.cache.clear();
        this.nextOrdinal = 0;
    }

    public getDefaultLineThickness(): number {
        return this.defaultLineThickness;
    }

    public get(display_key: string): GlyphConfig {
        const cached = this.cache.get(display_key);
        if (cached) return cached;

        const preset = this.presets.get(display_key);
        if (preset) {
            const config: GlyphConfig = { id: display_key, ...preset };
            this.cache.set(display_key, config);
            return config;
        }
        const attributePool = buildAttributePoolGlyph(display_key);
        if (attributePool) {
            const config: GlyphConfig = { id: display_key, ...attributePool };
            this.cache.set(display_key, config);
            return config;
        }

        return this.allocateProcedural(display_key);
    }

    public clear(): void {
        this.cache.clear();
        this.presets.clear();
        this.reservedDelaySigs.clear();
        this.nextOrdinal = 0;
        this.currentSeed = "";
        this.currentPresetSig = "";
        this.defaultLineThickness = 10;
        this.lastPresetsRaw = undefined;
    }

    private readDefaultLineThickness(settingsRaw: unknown): number {
        const raw = settingsRaw as
            | { glyph_view?: { defaultLineThickness?: unknown } }
            | undefined;
        const value = raw?.glyph_view?.defaultLineThickness;
        return typeof value === "number" && value > 0 ? value : 10;
    }

    private allocateProcedural(display_key: string): GlyphConfig {
        const ordinal = this.findNextAvailableOrdinal();
        const config = generateGlyph(this.currentSeed, ordinal);
        const glyph: GlyphConfig = { id: display_key, ...config };
        this.cache.set(display_key, glyph);
        return glyph;
    }

    private findNextAvailableOrdinal(): number {
        while (this.nextOrdinal < MAX_GLYPH_CAPACITY) {
            const ord = this.nextOrdinal++;
            const sig = serializeDelaySignature(computeDelaySignature(ord));
            if (!this.reservedDelaySigs.has(sig)) return ord;
        }
        const msg =
            `[GlyphRegistry] Capacity exhausted (seed=${this.currentSeed}, ` +
            `presetSig=${this.currentPresetSig})`;
        console.error(msg);
        throw new Error(msg);
    }
}
