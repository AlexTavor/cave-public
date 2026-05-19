import type { HydrationDependencyPlan } from "../hydration/hydrationTypes";
import {
    type GuidanceModel,
    type RuntimeCalloutModel,
    type ScreenGuidanceModel,
} from "./overlayViewportModels";
import {
    EMPTY_OVERLAY_VIEWPORT_DATA,
    type OverlayViewportData,
} from "./resolveOverlayViewportData";
import type { ScreenPosition } from "./nodeOverlayTypes";

export type GuidanceData = Pick<
    OverlayViewportData,
    "guidanceModels" | "screenGuidanceModels"
>;

export type NodeOverlayAuxiliaryData = Omit<
    OverlayViewportData,
    "nodeModels" | "caveStatusPosition"
>;

export const NODE_OVERLAY_LAYER_PLAN: HydrationDependencyPlan = {
    entityIds: ["sys_world"],
    includeEntityListRevision: true,
    includeBlueprintRevision: true,
};

export const EMPTY_GUIDANCE: GuidanceData = {
    guidanceModels: [],
    screenGuidanceModels: [],
};

export const EMPTY_NODE_OVERLAY_AUXILIARY_DATA: NodeOverlayAuxiliaryData = {
    ...EMPTY_GUIDANCE,
    runtimeCalloutModels: EMPTY_OVERLAY_VIEWPORT_DATA.runtimeCalloutModels,
};

export const arrayEqual = <T>(
    left: readonly T[],
    right: readonly T[],
    equal: (a: T, b: T) => boolean,
) =>
    left.length === right.length &&
    left.every((entry, index) => equal(entry, right[index]));

export const guidanceEqual = (left: GuidanceModel, right: GuidanceModel) =>
    left.bindingId === right.bindingId &&
    left.targetId === right.targetId &&
    left.text === right.text &&
    left.imageUrl === right.imageUrl &&
    left.anchor === right.anchor &&
    left.x === right.x &&
    left.y === right.y;

export const runtimeCalloutEqual = (
    left: RuntimeCalloutModel,
    right: RuntimeCalloutModel,
) =>
    left.id === right.id &&
    left.text === right.text &&
    left.x === right.x &&
    left.y === right.y;

export const screenGuidanceEqual = (
    left: ScreenGuidanceModel,
    right: ScreenGuidanceModel,
) =>
    left.bindingId === right.bindingId &&
    left.text === right.text &&
    left.imageUrl === right.imageUrl &&
    left.slot === right.slot;

export const positionEqual = (
    left: ScreenPosition | null,
    right: ScreenPosition | null,
) =>
    left === right ||
    (!!left && !!right && left.x === right.x && left.y === right.y);

export const nodeOverlayAuxiliaryDataEqual = (
    left: NodeOverlayAuxiliaryData,
    right: NodeOverlayAuxiliaryData,
) =>
    arrayEqual(left.guidanceModels, right.guidanceModels, guidanceEqual) &&
    arrayEqual(
        left.screenGuidanceModels,
        right.screenGuidanceModels,
        screenGuidanceEqual,
    ) &&
    arrayEqual(
        left.runtimeCalloutModels,
        right.runtimeCalloutModels,
        runtimeCalloutEqual,
    );
