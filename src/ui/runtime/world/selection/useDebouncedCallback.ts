import { useCallback, useEffect, useRef } from "react";

export const useDebouncedCallback = <TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delayMs: number,
) => {
    const timeoutRef = useRef<number | null>(null);
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                globalThis.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback(
        (...args: TArgs) => {
            if (timeoutRef.current !== null) {
                globalThis.clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = globalThis.setTimeout(() => {
                callbackRef.current(...args);
            }, delayMs);
        },
        [delayMs],
    );
};
