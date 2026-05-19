import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { resolveResourceProgressBarOutsetPx } from "../../../lib/displays/resourceProgressBarGeometry";
import {
    readResourceProgressBars,
    resolveResourceProgressBarLiveRange,
} from "../../../lib/displays/resourceProgressBars";

const readOwnerDisplay = (
    snapshot: Snapshot,
    owner: Readonly<RuntimeEntity>,
) => {
    const blueprintId =
        typeof owner.blueprintId === "string" ? owner.blueprintId : "";
    const blueprint = (
        snapshot as {
            getBlueprint?: (
                id: string,
            ) => { components?: { display?: unknown } } | null;
        }
    ).getBlueprint?.(blueprintId);
    return (
        (owner as { display?: unknown }).display ??
        blueprint?.components?.display
    );
};

export const resolveOwnerResourceProgressBarOutset = (input: {
    snapshot: Snapshot;
    owner: Readonly<RuntimeEntity>;
    ownerRadius: number;
}) => {
    const bars = readResourceProgressBars(
        readOwnerDisplay(input.snapshot, input.owner),
    );
    const hasVisible = bars.some(
        (bar) =>
            bar.position &&
            resolveResourceProgressBarLiveRange(input.owner as any, bar),
    );
    return hasVisible
        ? resolveResourceProgressBarOutsetPx(input.ownerRadius)
        : 0;
};
