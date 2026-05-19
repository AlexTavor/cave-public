/**
 * Deterministic PRNG (FNV-1a hash variant).
 * Returns a float between 0 (inclusive) and 1 (exclusive)
 * based on the input seed string.
 */
export const pseudoRandom = (seed: string): number => {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.codePointAt(i) ?? 0;
        h = Math.imul(h, 0x01000193);
    }
    h >>>= 0;
    return h / 4294967296;
};
