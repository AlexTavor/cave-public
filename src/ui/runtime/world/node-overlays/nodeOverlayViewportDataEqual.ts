import { nodeOverlayModelEqual } from "./nodeOverlayComparators";
import type { OverlayViewportData } from "./resolveOverlayViewportData";

const arrayEqual = <T>(left: T[], right: T[], equal: (a: T, b: T) => boolean) =>
    left.length === right.length &&
    left.every((entry, index) => equal(entry, right[index]));

const guidanceEqual = (left: any, right: any) =>
    left.bindingId === right.bindingId &&
    left.targetId === right.targetId &&
    left.text === right.text &&
    left.imageUrl === right.imageUrl &&
    left.anchor === right.anchor &&
    left.x === right.x &&
    left.y === right.y;

const runtimeCalloutEqual = (left: any, right: any) =>
    left.id === right.id &&
    left.text === right.text &&
    left.x === right.x &&
    left.y === right.y;

const screenGuidanceEqual = (left: any, right: any) =>
    left.bindingId === right.bindingId &&
    left.text === right.text &&
    left.imageUrl === right.imageUrl &&
    left.slot === right.slot;

const positionEqual = (left: any, right: any) =>
    left === right ||
    (!!left && !!right && left.x === right.x && left.y === right.y);

export const overlayViewportDataEqual = (
    left: OverlayViewportData,
    right: OverlayViewportData,
) =>
    left === right ||
    (arrayEqual(left.nodeModels, right.nodeModels, nodeOverlayModelEqual) &&
        arrayEqual(left.guidanceModels, right.guidanceModels, guidanceEqual) &&
        arrayEqual(
            left.runtimeCalloutModels,
            right.runtimeCalloutModels,
            runtimeCalloutEqual,
        ) &&
        arrayEqual(
            left.screenGuidanceModels,
            right.screenGuidanceModels,
            screenGuidanceEqual,
        ) &&
        positionEqual(left.caveStatusPosition, right.caveStatusPosition));

export { nodeOverlayEntryEqual } from "./nodeOverlayComparators";
