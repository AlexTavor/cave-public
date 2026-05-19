import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { snapScreenCoordinate } from "./nodeOverlayPosition";
import { SLOT_OFFSETS } from "./guidanceCalloutLayout";
import { toNodePoint, toScreenPoint } from "./guidanceCalloutLayoutPlacement";
import type { RuntimeCalloutItem } from "./runtime-callouts/runtimeCalloutTypes";

export type RuntimeCalloutModel = {
    id: string;
    text: string;
    x: number;
    y: number;
};

export const resolveRuntimeCalloutModels = (
    runtime: Runtime,
    cameraState: SerializedCameraState | null,
    width: number,
    height: number,
    items: RuntimeCalloutItem[],
): RuntimeCalloutModel[] =>
    items.flatMap((item) => {
        if (!item.targetEntityId) {
            const [x, y] = toScreenPoint("center", width, height);
            return [
                {
                    id: item.id,
                    text: `${item.count} ${item.text}`,
                    x: snapScreenCoordinate(x),
                    y: snapScreenCoordinate(y),
                },
            ];
        }
        const base = toNodePoint(
            runtime,
            cameraState,
            width,
            height,
            item.targetEntityId,
            item.slot as never,
        );
        if (!base) return [];
        const [dx, dy] = SLOT_OFFSETS[
            item.slot as keyof typeof SLOT_OFFSETS
        ] ?? [0, 0];
        return [
            {
                id: item.id,
                text: `${item.count} ${item.text}`,
                x: base.x + dx,
                y: base.y + dy,
            },
        ];
    });
