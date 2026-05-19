import { useSyncExternalStore } from "react";
import {
    getNodeOverlayValuesEnabled,
    subscribeNodeOverlayValuesEnabled,
} from "./nodeOverlayValuesToggle";

export const useNodeOverlayValuesEnabled = (): boolean =>
    useSyncExternalStore(
        subscribeNodeOverlayValuesEnabled,
        getNodeOverlayValuesEnabled,
        getNodeOverlayValuesEnabled,
    );
