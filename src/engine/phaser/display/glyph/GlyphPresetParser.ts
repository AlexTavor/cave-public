import type { GlyphConfigWithoutId } from "./GlyphGenerator";
import { GlyphPresetSchema } from "../../../../data/schemas/assets/glyphs";
import { canonicalKey } from "./glyphCanonical";
import { serializeDelaySignature } from "./glyphDelaySignature";
import { fnv1a32 } from "./GlyphPRNG";

const fail = (key: string, msg: string): never => {
    const err = `[GlyphPresetParser] preset "${key}": ${msg}`;
    console.error(err);
    throw new Error(err);
};

const validatePreset = (
    key: string,
    raw: any, // eslint-disable-line @typescript-eslint/no-explicit-any
): GlyphConfigWithoutId => {
    const parsed = GlyphPresetSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    const message = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ");
    return fail(key, message || "invalid preset");
};

export interface ParsedPresets {
    presetsByKey: Map<string, GlyphConfigWithoutId>;
    signature: string;
    reservedDelaySignatures: Set<string>;
}

export const parsePresets = (raw: unknown): ParsedPresets => {
    const presetsByKey = new Map<string, GlyphConfigWithoutId>();
    const reservedDelaySignatures = new Set<string>();
    if (!raw || typeof raw !== "object") {
        return { presetsByKey, signature: "", reservedDelaySignatures };
    }
    const obj = raw as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    const canonicals = new Map<string, string>();
    for (const key of keys) {
        const config = validatePreset(key, obj[key]);
        const ck = canonicalKey(config);
        const existing = canonicals.get(ck);
        if (existing) {
            const msg = `[GlyphPresetParser] duplicate canonical: "${existing}" and "${key}"`;
            console.error(msg);
            throw new Error(msg);
        }
        canonicals.set(ck, key);
        presetsByKey.set(key, config);
        reservedDelaySignatures.add(
            serializeDelaySignature(config.pulse.delayMsByPosition),
        );
    }
    const signature = String(fnv1a32(Array.from(canonicals.keys()).join("||")));
    return { presetsByKey, signature, reservedDelaySignatures };
};
