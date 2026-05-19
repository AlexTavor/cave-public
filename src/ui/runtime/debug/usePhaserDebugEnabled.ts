import { useSyncExternalStore } from "react";
import {
    getPhaserDebugEnabled,
    subscribePhaserDebugEnabled,
} from "../../../engine/phaser/debug/phaserDebugToggle";

export const usePhaserDebugEnabled = (): boolean =>
    useSyncExternalStore(
        subscribePhaserDebugEnabled,
        getPhaserDebugEnabled,
        getPhaserDebugEnabled,
    );
