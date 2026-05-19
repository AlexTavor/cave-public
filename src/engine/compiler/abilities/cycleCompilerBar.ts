import type { Blueprint } from "../../../data/schemas/blueprint";

const CYCLE_BAR_KEY = "state.cycle";

export const appendCycleBar = (draft: Blueprint): void => {
    const display = draft.components?.display;
    if (!display) return;

    const bars = (display.bars ??= []);
    if (bars.some((b) => b.key === CYCLE_BAR_KEY)) return;

    bars.push({
        key: CYCLE_BAR_KEY,
        maxKey: "state.cycle.max",
        color: "hsl(200, 70%, 50%)",
        label: "cycle",
    });
};
