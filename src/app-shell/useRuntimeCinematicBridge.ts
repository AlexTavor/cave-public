import { useEffect } from "react";
import { useRuntimeStore } from "../ui/runtime/state/useRuntimeStore";
import { CinematicEventBridge } from "../ui/runtime/cinematic/CinematicEventBridge";
import { useAppShellStore } from "./useAppShellStore";

export const useRuntimeCinematicBridge = (): void => {
    useEffect(() => {
        let frameId = 0;

        const loop = () => {
            const batch = CinematicEventBridge.drain();
            const event = batch.at(-1);
            if (event) {
                useRuntimeStore.getState().pause();
                useAppShellStore.getState().showRuntimeCinematic(event.lines);
            }
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);
};
