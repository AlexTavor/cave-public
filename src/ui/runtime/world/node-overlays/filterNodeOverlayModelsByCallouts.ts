import type { ResolvedNodeOverlayModel } from "./nodeOverlayTypes";
import {
    toCalloutRect,
    type NodeCalloutAnchor,
} from "./guidanceCalloutLayoutPlacement";

const overlaps = (left: any, right: any) =>
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y;

const toRect = (x: number, y: number, anchor?: NodeCalloutAnchor) =>
    toCalloutRect(x, y, anchor);

export const filterNodeOverlayModelsByCallouts = (
    models: ResolvedNodeOverlayModel[],
    callouts: Array<{
        x: number;
        y: number;
        anchor?: NodeCalloutAnchor;
        targetId: string | null;
    }>,
) =>
    models.filter((model) => {
        const position = model.position;
        return (
            !position ||
            !callouts.some(
                (callout) =>
                    callout.targetId !== null &&
                    overlaps(
                        toRect(position.x, position.y),
                        toRect(callout.x, callout.y, callout.anchor),
                    ),
            )
        );
    });
