const HASH_MOD = 2 ** 32;

export const stringHash = (id: string): number => {
    let hash = 0;

    for (const char of id) {
        const code = char.codePointAt(0) ?? 0;
        hash = (hash * 31 + code) >>> 0;
    }

    return hash / HASH_MOD;
};
