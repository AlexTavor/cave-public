import { useSyncExternalStore } from "react";
import {
    getNodeOverlaysEnabled,
    subscribeNodeOverlaysEnabled,
} from "./nodeOverlayToggle";

export const useNodeOverlaysEnabled = (): boolean =>
    useSyncExternalStore(
        subscribeNodeOverlaysEnabled,
        getNodeOverlaysEnabled,
        getNodeOverlaysEnabled,
    );
