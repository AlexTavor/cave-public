import { TextureKeys } from "./TextureKeys";

export interface PlaceholderVariant {
    texture: TextureKeys;
    rotation: 0 | 90 | 180 | 270;
    flipX: boolean;
}

const ROTATIONS = [0, 90, 180, 270] as const;
const TEXTURES = Object.values(TextureKeys);

const buildVariants = (): PlaceholderVariant[] => {
    const variants: PlaceholderVariant[] = [];
    for (const texture of TEXTURES) {
        for (const rotation of ROTATIONS) {
            variants.push(
                { texture, rotation, flipX: false },
                { texture, rotation, flipX: true },
            );
        }
    }
    return variants;
};

const ALL_VARIANTS = buildVariants();

export class PlaceholderVariantRegistry {
    private readonly assignments = new Map<string, PlaceholderVariant>();
    private nextIndex = 0;
    private exhaustionLogged = false;

    public get(display_key: string): PlaceholderVariant {
        const existing = this.assignments.get(display_key);
        if (existing) return existing;

        if (this.nextIndex >= ALL_VARIANTS.length) {
            if (!this.exhaustionLogged) {
                this.exhaustionLogged = true;
            }
            console.warn(
                `[PlaceholderVariantRegistry] Capacity exhausted. ` +
                    `Reusing variants for key: ${display_key}`,
            );
            const fallbackIdx = this.hashKey(display_key) % ALL_VARIANTS.length;
            const variant = ALL_VARIANTS[fallbackIdx];
            this.assignments.set(display_key, variant);
            return variant;
        }

        const variant = ALL_VARIANTS[this.nextIndex];
        this.nextIndex += 1;
        this.assignments.set(display_key, variant);
        return variant;
    }

    private hashKey(key: string): number {
        let hash = 0;
        for (const ch of key) {
            hash = (hash << 5) - hash + (ch.codePointAt(0) ?? 0);
            hash = Math.trunc(hash);
        }
        return Math.abs(hash);
    }
}
