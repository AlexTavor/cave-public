import type { Blueprint } from "../../../data/schemas/blueprint";

const HEALTH_BAR_KEY = "body.health";

export const appendBodyHealthBar = (draft: Blueprint): void => {
    const display = draft.components?.display;
    if (!display) return;

    const bars = (display.bars ??= []);
    if (bars.some((b) => b.key === HEALTH_BAR_KEY)) return;

    bars.push({
        key: HEALTH_BAR_KEY,
        maxKey: "body.maxHealth",
        color: "#4caf50",
        label: "Health",
    });
};
