import { useEffect, useRef } from "react";

/**
 * Persists the scroll position of a container element.
 * Restores it on mount.
 * * @param uniqueId Key for storage (e.g. file path + view)
 * @returns Ref to attach to the scrollable container
 */
export const useScrollMemory = (uniqueId: string) => {
    const ref = useRef<HTMLDivElement>(null);
    const storageKey = `scroll_pos::${uniqueId}`;

    // Restore on mount / id change
    useEffect(() => {
        if (!ref.current) return;

        const savedPos = sessionStorage.getItem(storageKey);
        if (savedPos) {
            // Tiny delay to allow content to render layout
            requestAnimationFrame(() => {
                if (ref.current) {
                    ref.current.scrollTop = Number.parseInt(savedPos, 10);
                }
            });
        }
    }, [uniqueId]);

    // Save on scroll
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handleScroll = () => {
            sessionStorage.setItem(storageKey, el.scrollTop.toString());
        };

        // Use capture: true for scroll events if needed, or just standard bubbling (scroll doesn't bubble usually)
        el.addEventListener("scroll", handleScroll);

        return () => {
            el.removeEventListener("scroll", handleScroll);
        };
    }, [uniqueId]);

    return ref;
};
