import { useInteractionStore } from "../../../devtools/state/useInteractionStore";

export const useInteraction = () => {
    const isInputBlocked = useInteractionStore((s) => s.blockers.size > 0);
    const activeBlockers = useInteractionStore((s) => Array.from(s.blockers));

    const blockInput = useInteractionStore((s) => s.addBlocker);
    const unblockInput = useInteractionStore((s) => s.removeBlocker);

    // Maintain the previous API signature for compatibility
    return {
        isInputBlocked,
        activeBlockers,
        blockInput: (reason: string) => {
            blockInput(reason);
            // Return cleanup function
            return () => unblockInput(reason);
        },
        unblockInput,
    };
};
