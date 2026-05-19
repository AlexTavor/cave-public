import type { DisplayPaletteKey } from "../../../lib/displays/displayKeyKinds";
import type { ResourceProgressBarPosition } from "../../../lib/displays/resourceProgressBarSlots";
import { resolveDefaultResourceProgressBarColor } from "../../../lib/displays/resourceProgressBarColor";

export const appendCompiledResourceProgressBar = (input: {
    bars: Array<Record<string, unknown>>;
    resource: string;
    maxKey: string;
    label?: string;
    color?: string;
    paletteColorKey?: DisplayPaletteKey;
    position?: ResourceProgressBarPosition;
}) => {
    const key = `state.${input.resource}`;
    if (input.bars.some((bar) => bar.key === key)) return;
    input.bars.push({
        key,
        maxKey: input.maxKey,
        color:
            input.color ||
            resolveDefaultResourceProgressBarColor(input.resource),
        label: input.label,
        paletteColorKey: input.paletteColorKey,
        position: input.position,
    });
};
