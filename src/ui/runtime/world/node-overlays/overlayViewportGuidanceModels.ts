import type { SerializedCameraState } from "../../../../engine/runtime/persistence/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import {
    resolveRuntimeGuidances,
    type RuntimeGuidanceView,
} from "../../tutorials/resolveRuntimeGuidances";
import { resolveGuidanceTargetId } from "./nodeOverlayGuidanceUtils";
import { resolveGuidanceCalloutLayout } from "./resolveGuidanceCalloutLayout";
import { SCREEN_SLOTS, rotate } from "./guidanceCalloutLayoutPlacement";

type ScreenSlot = (typeof SCREEN_SLOTS)[number];

export type GuidanceModel = {
    bindingId: string;
    targetId: string | null;
    text: string;
    imageUrl: string | null;
    anchor: "above" | "below";
    x: number;
    y: number;
};

export type ScreenGuidanceModel = {
    bindingId: string;
    text: string;
    imageUrl: string | null;
    slot: ScreenSlot;
};

const pickSlot = (preferred: ScreenSlot, used: Set<ScreenSlot>) =>
    rotate(SCREEN_SLOTS, preferred).find((slot) => !used.has(slot)) ??
    preferred;

export const resolveRuntimeGuidanceViews = (runtime: Runtime) =>
    resolveRuntimeGuidances(runtime);

export const resolveScreenGuidanceModels = (
    guidances: RuntimeGuidanceView[],
): ScreenGuidanceModel[] => {
    const used = new Set<ScreenSlot>();
    return guidances.flatMap((item) => {
        if (item.guidance.presentation !== "screen_callout") return [];
        const slot = pickSlot(item.guidance.screenSlot, used);
        used.add(slot);
        return [
            {
                bindingId: item.binding.bindingId,
                text: item.binding.textOverride ?? item.guidance.text,
                imageUrl: item.guidance.imageUrl,
                slot,
            },
        ];
    });
};

export const resolveGuidanceModels = (
    runtime: Runtime,
    cameraState: SerializedCameraState | null,
    width: number,
    height: number,
    guidances: RuntimeGuidanceView[],
): GuidanceModel[] => {
    const targetIds = new Map(
        guidances.map((guidance) => [
            guidance.binding.bindingId,
            resolveGuidanceTargetId(guidance),
        ]),
    );
    return resolveGuidanceCalloutLayout({
        runtime,
        camera: cameraState,
        width,
        height,
        guidances,
    })
        .filter(
            (model): model is Omit<GuidanceModel, "targetId"> =>
                "anchor" in model,
        )
        .map((model) => ({
            ...model,
            targetId: targetIds.get(model.bindingId) ?? null,
        }));
};
