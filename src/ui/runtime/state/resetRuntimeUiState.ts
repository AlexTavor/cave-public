import { runtimeNotificationStore } from "../notifications/runtimeNotificationStore";
import { runtimeInspectorStore } from "../inspector/runtimeInspectorStore";
import { runtimeVisualEffectsStore } from "../effects/runtimeVisualEffectsStore";
import { runtimeCalloutStore } from "../world/node-overlays/runtime-callouts/runtimeCalloutStore";
import { useRuntimeToolStore } from "./useRuntimeToolStore";
import { runStartCycleBannerStore } from "../status/runStartCycleBannerStore";

export const resetRuntimeUiState = () => {
    runtimeNotificationStore.getState().reset();
    runtimeInspectorStore.getState().reset();
    runtimeVisualEffectsStore.clear();
    runtimeCalloutStore.getState().reset();
    runStartCycleBannerStore.getState().reset();
    useRuntimeToolStore.getState().selectEntity(null);
};
