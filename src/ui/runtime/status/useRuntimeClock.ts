import { useEffect, useRef, type RefObject } from "react";
import { useRuntimeRevisionToken } from "../hooks/useRuntimeRevisionToken";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { formatRuntimeTime } from "./formatters";

const setText = (ref: RefObject<HTMLSpanElement | null>, text: string) => {
    if (!ref.current || ref.current.textContent === text) return;
    ref.current.textContent = text;
};

export const useRuntimeClockTime = () => {
    const runtime = useRuntimeStore((s) => s.runtime);
    const token = useRuntimeRevisionToken(runtime, {
        entityIds: [],
        includeEntityListRevision: false,
        includeBlueprintRevision: false,
        includeFrameRevision: true,
    });
    const timeRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!runtime) {
            setText(timeRef, formatRuntimeTime(0));
            return;
        }
        setText(timeRef, formatRuntimeTime(runtime.getState().tick));
    }, [runtime, token]);

    return timeRef;
};

export { useRuntimeClockControls } from "./useRuntimeClockControls";

