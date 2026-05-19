import { useEffect, useRef } from "react";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useActiveRuntimeAttention } from "../attention/useActiveRuntimeAttention";

export const useTutorialAttentionPlayback = () => {
    const runtime = useRuntimeStore((state) => state.runtime);
    const status = useRuntimeStore((state) => state.status);
    const play = useRuntimeStore((state) => state.play);
    const pause = useRuntimeStore((state) => state.pause);
    const ownsPauseRef = useRef(false);
    const pauseGame = useActiveRuntimeAttention()?.pauseGame === true;

    useEffect(() => {
        ownsPauseRef.current = false;
    }, [runtime]);

    useEffect(() => {
        if (pauseGame) {
            if (status === "running") {
                pause();
                ownsPauseRef.current = true;
            }
            return;
        }
        if (!ownsPauseRef.current) return;
        if (status === "paused") play();
        ownsPauseRef.current = false;
    }, [pauseGame, pause, play, status]);
};
