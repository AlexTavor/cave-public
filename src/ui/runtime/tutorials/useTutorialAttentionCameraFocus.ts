import { useContext, useEffect, useRef } from "react";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import { useActiveRuntimeAttention } from "../attention/useActiveRuntimeAttention";
import { resolveCameraFocusPosition } from "./resolveCameraFocusPosition";

const DEFAULT_ZOOM = 1;
const DEFAULT_FOCUS_LERP_MS = 500;
const lerp = (start: number, end: number, progress: number) =>
    start + (end - start) * progress;

export const useTutorialAttentionCameraFocus = () => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const requestCamera = useRuntimeStore(
        (state) => state.setPendingCameraRestore,
    );
    const runtime = context?.runtime ?? storeRuntime;
    const attention = useActiveRuntimeAttention();
    const focusId =
        attention?.cameraFocusEntityId ?? attention?.ringEntityIds[0] ?? null;
    const getCameraState = context?.getCameraState;
    const frameRef = useRef<number | null>(null);
    const lastFocusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!focusId) {
            lastFocusRef.current = null;
            return;
        }
        if (focusId === lastFocusRef.current) return;
        const position = resolveCameraFocusPosition(runtime, focusId);
        if (!position) return;
        lastFocusRef.current = focusId;
        const currentCamera =
            getCameraState?.() ?? useRuntimeStore.getState().cameraState;
        const targetCamera = {
            centerX: position.x,
            centerY: position.y,
            zoom: currentCamera?.zoom ?? DEFAULT_ZOOM,
        };
        const durationMs =
            runtime?.getCartridge?.().config?.settings?.game_config?.camera?.pan
                ?.focusLerpMs ?? DEFAULT_FOCUS_LERP_MS;
        if (!currentCamera || durationMs <= 0)
            return requestCamera(targetCamera);
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        let startTime = 0;
        const step = (now: number) => {
            if (!startTime) startTime = now;
            const progress = Math.min(1, (now - startTime) / durationMs);
            requestCamera({
                centerX: lerp(
                    currentCamera.centerX,
                    targetCamera.centerX,
                    progress,
                ),
                centerY: lerp(
                    currentCamera.centerY,
                    targetCamera.centerY,
                    progress,
                ),
                zoom: targetCamera.zoom,
            });
            if (progress < 1) frameRef.current = requestAnimationFrame(step);
        };
        frameRef.current = requestAnimationFrame(step);
        return () => {
            if (frameRef.current !== null)
                cancelAnimationFrame(frameRef.current);
        };
    }, [focusId, getCameraState, requestCamera, runtime]);
};
