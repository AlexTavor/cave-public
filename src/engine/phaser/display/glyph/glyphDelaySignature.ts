import { DELAY_BASE, DELAY_SIGNATURE_LEN, DELAY_STEP_MS } from "../../../../data/schemas/assets/GlyphTypes";

/** Compute the 9-element delay array for a given ordinal. */
export const computeDelaySignature = (ordinal: number): number[] => {
    const delays: number[] = [];
    let n = ordinal;
    for (let pos = 0; pos < DELAY_SIGNATURE_LEN; pos++) {
        const digit = n % DELAY_BASE;
        delays.push(digit * DELAY_STEP_MS);
        n = Math.floor(n / DELAY_BASE);
    }
    return delays;
};

/** Serialize a delay array to a stable string key. */
export const serializeDelaySignature = (delays: number[]): string =>
    delays.join(",");
