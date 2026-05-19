import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { RuntimeGuidanceView } from "../../tutorials/resolveRuntimeGuidances";
import {
    NODE_SLOTS,
    OFFSETS,
    SCREEN_SLOTS,
    overlaps,
    rotate,
    toCalloutRect,
    toNodeCalloutAnchor,
    toNodePoint,
    toScreenPoint,
} from "./guidanceCalloutLayoutPlacement";
import { resolveGuidanceTargetId } from "./nodeOverlayGuidanceUtils";

export const resolveGuidanceCalloutLayout = (input: {
    runtime: Runtime;
    camera: SerializedCameraState | null;
    width: number;
    height: number;
    guidances: RuntimeGuidanceView[];
}) => {
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    return input.guidances.flatMap((item) => {
        if (
            item.guidance.presentation === "modal" ||
            item.guidance.presentation === "draft_guidance"
        ) {
            return [];
        }
        const text = item.binding.textOverride ?? item.guidance.text;
        if (item.guidance.presentation === "screen_callout") {
            const slotOrder = rotate(SCREEN_SLOTS, item.guidance.screenSlot);
            const slot =
                slotOrder.find((candidate) => {
                    const [x, y] = toScreenPoint(
                        candidate,
                        input.width,
                        input.height,
                    );
                    return !placed.some((current) =>
                        overlaps(
                            { x: x - 110, y: y - 60, w: 220, h: 70 },
                            current,
                        ),
                    );
                }) ?? item.guidance.screenSlot;
            const [x, y] = toScreenPoint(slot, input.width, input.height);
            placed.push({ x: x - 110, y: y - 60, w: 220, h: 70 });
            return [
                {
                    bindingId: item.binding.bindingId,
                    text,
                    imageUrl: item.guidance.imageUrl,
                    x,
                    y,
                },
            ];
        }
        const targetId = resolveGuidanceTargetId(item);
        if (!targetId) return [];
        const slotOrder = rotate(NODE_SLOTS, item.guidance.slot);
        const slot =
            slotOrder.find((candidate) => {
                const base = toNodePoint(
                    input.runtime,
                    input.camera,
                    input.width,
                    input.height,
                    targetId,
                    candidate,
                );
                if (!base) return false;
                const [dx, dy] = OFFSETS[candidate];
                const anchor = toNodeCalloutAnchor(candidate);
                return !placed.some((current) =>
                    overlaps(
                        toCalloutRect(base.x + dx, base.y + dy, anchor),
                        current,
                    ),
                );
            }) ?? item.guidance.slot;
        const base = toNodePoint(
            input.runtime,
            input.camera,
            input.width,
            input.height,
            targetId,
            slot,
        );
        if (!base) return [];
        const [dx, dy] = OFFSETS[slot];
        const anchor = toNodeCalloutAnchor(slot);
        placed.push(toCalloutRect(base.x + dx, base.y + dy, anchor));
        return [
            {
                bindingId: item.binding.bindingId,
                text,
                imageUrl: item.guidance.imageUrl,
                anchor,
                x: base.x + dx,
                y: base.y + dy,
            },
        ];
    });
};
