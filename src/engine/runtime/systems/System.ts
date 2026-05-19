import type { Tickable } from "./Tickable";

export interface System extends Tickable<void> {
    readonly runsWhenPaused?: boolean;
}
