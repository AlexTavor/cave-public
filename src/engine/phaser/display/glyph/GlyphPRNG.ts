/** FNV-1a 32-bit hash. */
export const fnv1a32 = (input: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.codePointAt(i) ?? 0;
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
};

/** xorshift32 step returning uint32. */
const xorshift32 = (state: number): number => {
    let s = state;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s >>> 0;
};

export class GlyphPRNG {
    private state: number;

    constructor(seed: string, ordinal: number) {
        const seedStr = seed + ":" + ordinal;
        this.state = fnv1a32(seedStr) || 1; // avoid 0 state
    }

    /** Returns a float in [0, 1). */
    public unit(): number {
        this.state = xorshift32(this.state);
        return this.state / 0x100000000;
    }

    /** Pick an element from array using unit(). */
    public pick<T>(arr: readonly T[]): T {
        const idx = Math.floor(this.unit() * arr.length);
        return arr[idx];
    }
}
