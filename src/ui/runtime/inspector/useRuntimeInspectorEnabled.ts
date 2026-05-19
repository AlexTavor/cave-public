import { useSyncExternalStore } from "react";
import {
    getRuntimeInspectorEnabled,
    subscribeRuntimeInspectorEnabled,
} from "./runtimeInspectorToggle";

export const useRuntimeInspectorEnabled = (): boolean =>
    useSyncExternalStore(
        subscribeRuntimeInspectorEnabled,
        getRuntimeInspectorEnabled,
        getRuntimeInspectorEnabled,
    );
