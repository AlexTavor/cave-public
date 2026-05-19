import { useEffect, useRef, useState } from "react";

export const getFilterString = (brightness: number): string => {
    return `url("#organic-edge") brightness(${brightness})`;
};

export const calculateBrightness = (
    isClicking: boolean,
    isHovered: boolean,
): number => {
    if (isClicking) return 1.5;
    if (isHovered) return 1.2;
    return 1;
};

export const useClickPulse = (durationMs: number) => {
    const [isClicking, setIsClicking] = useState(false);
    const mountedRef = useRef(true);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const canUpdate = () =>
        mountedRef.current && globalThis.window !== undefined;

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const triggerClick = () => {
        setIsClicking(true);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            if (!canUpdate()) return;
            setIsClicking(false);
        }, durationMs);
    };

    return { isClicking, triggerClick };
};

