import { useEffect, RefObject } from "react";

/**
 * Hook to detect clicks outside of a ref'd element.
 * Useful for closing dropdowns, modals, etc.
 *
 * @param ref - React ref to the element
 * @param callback - Function to call when clicked outside
 * @param enabled - Whether the listener is active (default: true)
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null);
 * useClickOutside(modalRef, () => setIsOpen(false));
 * ```
 */
export const useClickOutside = <T extends HTMLElement>(
    ref: RefObject<T>,
    callback: (event: MouseEvent | TouchEvent) => void,
    enabled: boolean = true,
) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback(event);
            }
        };

        // Use capture phase to ensure we get the event before stopPropagation
        document.addEventListener("mousedown", handleClickOutside, true);
        document.addEventListener("touchstart", handleClickOutside, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside, true);
            document.removeEventListener(
                "touchstart",
                handleClickOutside,
                true,
            );
        };
    }, [ref, callback, enabled]);
};
