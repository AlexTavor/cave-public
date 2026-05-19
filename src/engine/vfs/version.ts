/**
 * Compare two semantic version strings (e.g. "1.0.0" vs "1.0.1")
 * Returns true if v1 > v2
 */
export function isSemverNewer(v1: string, v2: string): boolean {
    const p1 = v1.split(".").map((p) => Number(p) || 0);
    const p2 = v2.split(".").map((p) => Number(p) || 0);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] ?? 0;
        const n2 = p2[i] ?? 0;
        if (n1 > n2) return true;
        if (n1 < n2) return false;
    }

    return false;
}
