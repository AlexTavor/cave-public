const GRAD3 = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
] as const;

const cache = new Map<number, Uint8Array>();
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const step = (value = 1): number => {
    let state = value;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
};

const getPerm = (seed: number): Uint8Array => {
    const cached = cache.get(seed);
    if (cached) return cached;
    const base = Uint8Array.from({ length: 256 }, (_, i) => i);
    let state = seed || 1;
    for (let i = 255; i > 0; i--) {
        state = step(state);
        const j = state % (i + 1);
        [base[i], base[j]] = [base[j], base[i]];
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    cache.set(seed, perm);
    return perm;
};

const contribution = (
    t: number,
    grad: readonly [number, number],
    x: number,
    y: number,
): number => (t <= 0 ? 0 : t * t * (t * t) * (grad[0] * x + grad[1] * y));

export const createSimplex2D = (seed: number) => {
    const perm = getPerm(seed >>> 0);
    return (x: number, y: number): number => {
        const skew = (x + y) * F2;
        const i = Math.floor(x + skew);
        const j = Math.floor(y + skew);
        const unskew = (i + j) * G2;
        const x0 = x - (i - unskew);
        const y0 = y - (j - unskew);
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const g0 = GRAD3[perm[ii + perm[jj]] % GRAD3.length];
        const g1 = GRAD3[perm[ii + i1 + perm[jj + j1]] % GRAD3.length];
        const g2 = GRAD3[perm[ii + 1 + perm[jj + 1]] % GRAD3.length];
        const n0 = contribution(0.5 - x0 * x0 - y0 * y0, g0, x0, y0);
        const n1 = contribution(0.5 - x1 * x1 - y1 * y1, g1, x1, y1);
        const n2 = contribution(0.5 - x2 * x2 - y2 * y2, g2, x2, y2);
        return Math.max(-1, Math.min(1, 70 * (n0 + n1 + n2)));
    };
};
