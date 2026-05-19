import { useEffect, useState } from "react";

const readSize = (element: HTMLElement | null) => {
    if (!element) return { width: 0, height: 0 };
    const rect = element.getBoundingClientRect();
    return {
        width: rect.width || element.clientWidth,
        height: rect.height || element.clientHeight,
    };
};

export const useElementSize = <T extends HTMLElement | null>(
    ref: React.RefObject<T>,
): [number, number] => {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const sync = () => {
            const next = readSize(element);
            setSize((current) =>
                current.width === next.width && current.height === next.height
                    ? current
                    : next,
            );
        };
        sync();
        if (typeof ResizeObserver === "undefined") {
            return;
        }
        const observer = new ResizeObserver(sync);
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);

    return [size.width, size.height];
};
