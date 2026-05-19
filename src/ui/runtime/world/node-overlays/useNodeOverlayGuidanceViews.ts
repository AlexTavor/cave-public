import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeGuidanceView } from "../../tutorials/resolveRuntimeGuidances";
import { useImperativeRuntimeDerivedValue } from "../../hooks/useImperativeRuntimeDerivedValue";
import { resolveRuntimeGuidanceViews } from "./overlayViewportModels";
import {
    NODE_OVERLAY_LAYER_PLAN,
    arrayEqual,
} from "./nodeOverlayViewportLayerUtils";
import { runtimeGuidanceViewEqual } from "./nodeOverlayGuidanceUtils";

const EMPTY_GUIDANCE_VIEWS: RuntimeGuidanceView[] = [];

export const useNodeOverlayGuidanceViews = (
    runtime: Runtime | null,
    enabled: boolean,
) =>
    useImperativeRuntimeDerivedValue(
        enabled ? runtime : null,
        NODE_OVERLAY_LAYER_PLAN,
        [enabled],
        (current) =>
            current
                ? resolveRuntimeGuidanceViews(current)
                : EMPTY_GUIDANCE_VIEWS,
        (left, right) => arrayEqual(left, right, runtimeGuidanceViewEqual),
    );
