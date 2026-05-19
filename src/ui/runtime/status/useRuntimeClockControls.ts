import { useCallback, useEffect, useRef } from "react";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useRuntimeStore } from "../state/useRuntimeStore";

const HOTKEY_TIME_SCALES: Record<string, number> = {
    Digit1: 1,
    Numpad1: 1,
    Digit2: 3,
    Numpad2: 3,
    Digit3: 5,
    Numpad3: 5,
};

const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable;
};

export const useRuntimeClockControls = () => {
    const runtime = useRuntimeStore((s) => s.runtime);
    const status = useRuntimeStore((s) => s.status);
    const timeScale = useRuntimeStore((s) => s.timeScale);
    const play = useRuntimeStore((s) => s.play);
    const pause = useRuntimeStore((s) => s.pause);
    const setTimeScale = useRuntimeStore((s) => s.setTimeScale);
    const refs = useRef({
        runtime,
        status,
        timeScale,
        play,
        pause,
        setTimeScale,
    });
    refs.current = {
        runtime,
        status,
        timeScale,
        play,
        pause,
        setTimeScale,
    };

    const togglePlayback = useCallback(() => {
        if (refs.current.status === "running") refs.current.pause();
        else refs.current.play();
    }, []);

    const handleScaleToggle = useCallback((value: number) => {
        if (value === refs.current.timeScale) return;
        refs.current.setTimeScale(value);
        const world = refs.current.runtime?.getEntity("sys_world") as
            | { state?: { cave_tut_time_controls_seen?: { value?: unknown } } }
            | undefined;
        if (world?.state?.cave_tut_time_controls_seen?.value !== true) {
            refs.current.runtime?.commands.enqueue({
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "cave_tut_time_controls_seen",
                    value: true,
                },
            });
        }
        if (refs.current.status === "paused")
            refs.current.runtime?.flushCommands();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isEditableTarget(event.target)) return;
            if (event.code === "Space") {
                event.preventDefault();
                togglePlayback();
                return;
            }
            const nextScale = HOTKEY_TIME_SCALES[event.code];
            if (nextScale == null) return;
            event.preventDefault();
            handleScaleToggle(nextScale);
        };

        globalThis.addEventListener("keydown", handleKeyDown);
        return () => globalThis.removeEventListener("keydown", handleKeyDown);
    }, [handleScaleToggle, togglePlayback]);

    return {
        status: refs.current.status,
        timeScale: refs.current.timeScale,
        togglePlayback,
        handleScaleToggle,
    } as const;
};
