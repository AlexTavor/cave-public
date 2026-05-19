import { useEffect } from "react";
import { useInteraction } from "./useInteraction";

/**
 * Hook to automatically block input while a component is mounted.
 * Useful for modals and other blocking UI elements.
 *
 * @param reason - Description of why input is being blocked
 * @param enabled - Whether to actually block (default: true)
 *
 * @example
 * ```tsx
 * const Modal = ({ isOpen }) => {
 *   useInputBlock("modal-open", isOpen);
 *   // ...
 * }
 * ```
 */
export const useInputBlock = (reason: string, enabled: boolean = true) => {
    const { blockInput } = useInteraction();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const cleanup = blockInput(reason);
        return cleanup;
    }, [blockInput, reason, enabled]);
};
