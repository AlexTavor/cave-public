import { useEffect, useId, useRef } from "react";
import { useSessionStore } from "../useSessionStore";

export type FlushHandler = () => void | Promise<void>;

export const useSessionFlush = (
    filename: string | null | undefined,
    handler: FlushHandler,
) => {
    const register = useSessionStore((s) => s.registerFlushHandler);
    const unregister = useSessionStore((s) => s.unregisterFlushHandler);
    const handlerId = useId();
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!filename) return;
        const flush = () => handlerRef.current();
        register(filename, handlerId, flush);
        return () => {
            unregister(filename, handlerId);
        };
    }, [filename, handlerId, register, unregister]);
};
